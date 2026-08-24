import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/contexts/UserContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const PREMIUM_FEATURES = [
  {
    icon: '🔓',
    title: 'Full 90-Day ECCT Program',
    description: 'Every technique across all 12 weeks — Awareness, Regulation, Confidence, Communication, and more.',
  },
  {
    icon: '🤖',
    title: 'AI Coach, Unlimited',
    description: 'Ask questions, get coached on any technique, and receive personalised guidance at any point in your journey.',
  },
  {
    icon: '📊',
    title: 'Progress Tracking & Streaks',
    description: 'Cloud-synced completion, XP, streaks, and ECRS trend charts across all your devices.',
  },
  {
    icon: '📓',
    title: 'Unlimited Journal & Check-ins',
    description: 'Log emotions, reflections, and responses without limits. Build a record of your growth.',
  },
  {
    icon: '🎯',
    title: 'Daily Drills & Reflection Prompts',
    description: 'Structured step-by-step exercises with guided reflection for every session.',
  },
];

const TRIAL_BENEFITS = [
  'Full 90-day ECCT program',
  'Unlimited AI Coach sessions',
  'Progress tracking & streaks',
];

function derivePlanType(identifier: string): 'lifetime' | 'yearly' | 'monthly' {
  const lower = identifier.toLowerCase();
  if (lower.includes('lifetime')) return 'lifetime';
  if (lower.includes('year') || lower.includes('annual')) return 'yearly';
  return 'monthly';
}

function deriveEndDate(planType: 'lifetime' | 'yearly' | 'monthly'): string | null {
  if (planType === 'lifetime') return null;
  const now = new Date();
  if (planType === 'yearly') {
    now.setDate(now.getDate() + 365);
  } else {
    now.setDate(now.getDate() + 30);
  }
  return now.toISOString();
}

export default function PaywallScreen() {
  const router = useRouter();
  const { isSubscribed, restorePurchases, refreshSubscription, isConfigured } = useSubscription();
  const { updateSubscription, profile, isTrialing, trialDaysRemaining, startTrial } = useUser();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
    onDismiss?: () => void;
  }>({ visible: false, title: '', message: '', type: 'error' });

  const showFeedback = (
    title: string,
    message: string,
    type: 'error' | 'success' = 'error',
    onDismiss?: () => void
  ) => {
    setFeedbackModal({ visible: true, title, message, type, onDismiss });
  };

  const hideFeedback = () => {
    const onDismiss = feedbackModal.onDismiss;
    setFeedbackModal((prev) => ({ ...prev, visible: false, onDismiss: undefined }));
    if (onDismiss) onDismiss();
  };

  useEffect(() => {
    console.log('[Paywall] Screen mounted — fetching offerings');
    fetchOfferings();
  }, []);

  useEffect(() => {
    if (isSubscribed) {
      console.log('[Paywall] User is now subscribed — closing paywall');
      router.back();
    }
  }, [isSubscribed]);

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      console.log('[Paywall] Offerings fetched:', offerings.current?.identifier);
      const pkgs = offerings.current?.availablePackages ?? [];
      setPackages(pkgs);
      if (pkgs.length > 0) {
        setSelectedPackage(pkgs[0]);
      }
    } catch (e) {
      console.warn('[Paywall] Failed to fetch offerings:', e);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log('[Paywall] User tapped purchase:', selectedPackage.identifier);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      console.log('[Paywall] Purchase complete — entitlements:', Object.keys(customerInfo.entitlements.active));
      await refreshSubscription();

      // Sync backend subscription state — best-effort, non-blocking
      const planType = derivePlanType(
        selectedPackage.product?.identifier ?? selectedPackage.identifier
      );
      const endDate = deriveEndDate(planType);
      try {
        await updateSubscription({
          account_type: 'premium',
          subscription_status: 'active',
          plan_type: planType,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: endDate,
          trial_status: 'none',
          payment_status: 'succeeded',
        });
        console.log('[Paywall] Backend subscription synced successfully');
      } catch (syncErr) {
        console.warn('[Paywall] Backend subscription sync failed (non-fatal):', syncErr);
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn('[Paywall] Purchase failed:', e);
        showFeedback('Purchase Failed', e.message ?? 'Something went wrong. Please try again.', 'error');
      } else {
        console.log('[Paywall] User cancelled purchase');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log('[Paywall] User tapped Restore Purchases');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    await restorePurchases();
    // If restore succeeded and user is now subscribed, sync backend
    if (isSubscribed) {
      try {
        await updateSubscription({
          account_type: 'premium',
          subscription_status: 'active',
          payment_status: 'succeeded',
        });
        console.log('[Paywall] Backend subscription synced after restore');
      } catch (syncErr) {
        console.warn('[Paywall] Backend sync after restore failed (non-fatal):', syncErr);
      }
    }
    setRestoring(false);
  };

  const handleClose = () => {
    console.log('[Paywall] User closed paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleStartTrial = async () => {
    console.log('[Paywall] User tapped Start Free Trial');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartingTrial(true);
    try {
      const result = await startTrial();
      if (result.ok) {
        showFeedback(
          '🎁 Trial Started',
          'You have 7 days of full premium access. Enjoy!',
          'success',
          () => router.back()
        );
      } else if (result.reason === 'already_used') {
        showFeedback(
          'Trial Unavailable',
          "You've already used your free trial.",
          'error'
        );
      } else if (result.reason === 'already_premium') {
        showFeedback(
          'Already Premium',
          'Your account already has premium access.',
          'error'
        );
      } else {
        showFeedback(
          "Couldn't start trial",
          'Please try again.',
          'error'
        );
      }
    } finally {
      setStartingTrial(false);
    }
  };

  const selectedPrice = selectedPackage?.product?.priceString ?? '';
  const feedbackIconName = feedbackModal.type === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill';
  const feedbackIconColor = feedbackModal.type === 'success' ? '#27AE60' : '#FF3B30';

  // Eligibility: profile loaded, trial_status is 'none', account_type is 'free'
  const isTrialEligible =
    !!profile &&
    profile.trial_status === 'none' &&
    profile.account_type === 'free';

  const trialDaysLabel = trialDaysRemaining === 1 ? '1 day' : `${trialDaysRemaining ?? 0} days`;

  const selectedPlanType = selectedPackage
    ? derivePlanType(selectedPackage.product?.identifier ?? selectedPackage.identifier)
    : null;

  const ctaSuffix =
    selectedPlanType === 'monthly' ? '/mo' :
    selectedPlanType === 'yearly' ? '/yr' :
    '';

  const ctaLabel = selectedPackage
    ? `Start Premium — ${selectedPrice}${ctaSuffix}`
    : 'Select a Plan';

  const ctaAccessibilityLabel = selectedPackage
    ? `Start Premium, ${selectedPrice}`
    : 'Select a plan first';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>🧠</Text>
          <Text style={styles.heroTitle}>Build Real Emotional Control</Text>
          <Text style={styles.heroTitle}>in 90 Days</Text>
          <Text style={styles.heroSubtitle}>
            A structured daily program to manage emotions, build confidence, and respond — not react — under pressure.
          </Text>
        </LinearGradient>

        {/* Trial active notice (already trialing) */}
        {isTrialing && (
          <View style={styles.trialActiveCard}>
            <Text style={styles.trialActiveTitle}>
              🎁 Trial active — {trialDaysLabel} remaining
            </Text>
            <Text style={styles.trialActiveSubtitle}>
              Convert now to keep premium after trial
            </Text>
          </View>
        )}

        {/* Free Trial CTA card (eligible users only) */}
        {!isTrialing && isTrialEligible && (
          <View style={styles.trialCard}>
            <Text style={styles.trialCardTitle}>Try Premium free for 7 days</Text>
            <Text style={styles.trialCardSubtitle}>
              Full access. No payment required. Cancel anytime.
            </Text>
            <View style={styles.trialBenefits}>
              {TRIAL_BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.trialBenefitRow}>
                  <Text style={styles.trialBenefitCheck}>✓</Text>
                  <Text style={styles.trialBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.trialButton, startingTrial && styles.trialButtonDisabled]}
              onPress={handleStartTrial}
              disabled={startingTrial}
              activeOpacity={0.9}
              accessibilityLabel="Start free 7-day trial"
              accessibilityRole="button"
            >
              {startingTrial ? (
                <View style={styles.trialButtonLoading}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.trialButtonGradient}
                >
                  <Text style={styles.trialButtonText}>Start Free Trial</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
            <Text style={styles.trialFooter}>
              After 7 days, choose a paid plan to keep your access.
            </Text>
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What you unlock with Premium</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Packages */}
        {!isConfigured ? (
          <View style={styles.webNoticeContainer}>
            <Text style={styles.webNoticeTitle}>Available on iOS & Android</Text>
            <Text style={styles.webNoticeText}>
              Download the app to subscribe and unlock the full program on your device.
            </Text>
          </View>
        ) : loadingPackages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.noPackagesContainer}>
            <Text style={styles.noPackagesText}>
              No subscription plans available at this time. Please check back later.
            </Text>
          </View>
        ) : (
          <View style={styles.packagesContainer}>
            <Text style={styles.packagesTitle}>Choose your plan</Text>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const planType = derivePlanType(pkg.product?.identifier ?? pkg.identifier);
              const billingLabel =
                planType === 'monthly' ? 'per month' :
                planType === 'yearly' ? 'per year' :
                'one-time';
              const pkgAccessibilityLabel = pkg.product.title + ', ' + pkg.product.priceString;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => {
                    console.log('[Paywall] User selected package:', pkg.identifier);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPackage(pkg);
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel={pkgAccessibilityLabel}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                      {pkg.product.title}
                    </Text>
                    <Text style={[styles.packageDescription, isSelected && styles.packageDescriptionSelected]}>
                      {pkg.product.description}
                    </Text>
                  </View>
                  <View style={styles.packagePriceContainer}>
                    <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={styles.packageBillingLabel}>{billingLabel}</Text>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA */}
        {isConfigured && (
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={[styles.ctaButton, (purchasing || !selectedPackage) && styles.ctaButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing || !selectedPackage}
              activeOpacity={0.9}
              accessibilityLabel={ctaAccessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: purchasing || !selectedPackage, busy: purchasing }}
            >
              {purchasing ? (
                <View style={styles.ctaLoadingWrapper}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>{ctaLabel}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <Text style={styles.trustLine}>Secure payment · Cancel anytime · No hidden fees</Text>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
              activeOpacity={0.7}
              accessibilityLabel="Restore previous purchases"
              accessibilityRole="button"
              accessibilityState={{ busy: restoring }}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.legalText}>
              Subscriptions renew automatically. Cancel anytime in your device's subscription settings. By purchasing you agree to our Terms of Service.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={hideFeedback}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <IconSymbol
              ios_icon_name={feedbackIconName}
              android_material_icon_name={feedbackModal.type === 'success' ? 'check-circle' : 'cancel'}
              size={48}
              color={feedbackIconColor}
            />
            <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
            <Text style={styles.modalMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={hideFeedback} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.9,
    lineHeight: 22,
  },
  // Trial active notice
  trialActiveCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F0EBFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6B4CE6',
    alignItems: 'center',
    gap: 4,
  },
  trialActiveTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B4CE6',
    textAlign: 'center',
  },
  trialActiveSubtitle: {
    fontSize: 13,
    color: '#6B4CE6',
    textAlign: 'center',
    opacity: 0.8,
  },
  // Free trial CTA card
  trialCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 4,
  },
  trialCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  trialCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  trialBenefits: {
    gap: 8,
    marginBottom: 16,
  },
  trialBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trialBenefitCheck: {
    fontSize: 15,
    fontWeight: '800',
    color: '#27AE60',
  },
  trialBenefitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trialButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    marginTop: 4,
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonLoading: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  trialFooter: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  featuresContainer: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 14,
  },
  featureIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noPackagesContainer: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: colors.highlight,
    borderRadius: 16,
    marginBottom: 24,
  },
  noPackagesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  webNoticeContainer: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  webNoticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  webNoticeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  packagesContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  packagesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  packageTitleSelected: {
    color: colors.primary,
  },
  packageDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  packageDescriptionSelected: {
    color: colors.text,
  },
  packagePriceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  packagePriceSelected: {
    color: colors.primary,
  },
  packageBillingLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedBadge: {
    alignItems: 'center',
  },
  ctaContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaLoadingWrapper: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  trustLine: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  legalText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  // Feedback modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
