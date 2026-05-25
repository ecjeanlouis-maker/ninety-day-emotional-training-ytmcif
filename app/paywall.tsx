import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const PREMIUM_FEATURES = [
  {
    icon: '🔓',
    title: 'All 12 Weeks Unlocked',
    description: 'Full access to every technique in your chosen program',
  },
  {
    icon: '📚',
    title: 'All 6 Programs',
    description: 'Switch between Emotional Control, Confidence, Anger, Stress, Social Anxiety, and Thoughts',
  },
  {
    icon: '📊',
    title: 'Track Your Progress',
    description: 'Save completion across all devices with cloud sync',
  },
  {
    icon: '⚡',
    title: 'Lifetime Access',
    description: 'One-time purchase options available — no recurring fees',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { isSubscribed, restorePurchases, refreshSubscription } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn('[Paywall] Purchase failed:', e);
        Alert.alert('Purchase Failed', e.message ?? 'Something went wrong. Please try again.');
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
    setRestoring(false);
  };

  const handleClose = () => {
    console.log('[Paywall] User closed paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const selectedPrice = selectedPackage?.product?.priceString ?? '';
  const selectedTitle = selectedPackage?.product?.title ?? '';
  const selectedDescription = selectedPackage?.product?.description ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
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
          <Text style={styles.heroTitle}>Unlock Your Full</Text>
          <Text style={styles.heroTitle}>Transformation</Text>
          <Text style={styles.heroSubtitle}>
            90 days. 6 programs. 12 weeks each. Complete psychological transformation.
          </Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Everything included</Text>
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
        {loadingPackages ? (
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
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, (purchasing || !selectedPackage) && styles.ctaButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing || !selectedPackage}
            activeOpacity={0.9}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>
                  {selectedPackage ? `Get Access — ${selectedPrice}` : 'Select a Plan'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            {Platform.OS === 'ios'
              ? 'Payment will be charged to your Apple ID account. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.'
              : 'Payment will be charged to your Google Play account. Subscriptions automatically renew unless cancelled.'}
          </Text>
        </View>
      </ScrollView>
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
    marginBottom: 28,
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
});
