
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ProgramType } from '@/types/program';
import { useRouter } from 'expo-router';
import { authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BillingModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (planType: 'monthly' | 'lifetime' | 'premium-lifetime', programType?: ProgramType) => void;
  selectedProgram?: ProgramType;
  programTitle?: string;
  programColor?: string;
}

export default function BillingModal({
  visible,
  onClose,
  onSelectPlan,
  selectedProgram,
  programTitle,
  programColor,
}: BillingModalProps) {
  console.log('BillingModal rendered with program:', selectedProgram);
  
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPlanType, setSelectedPlanType] = useState<'monthly' | 'lifetime' | 'premium-lifetime' | null>(null);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
  }>({ visible: false, title: '', message: '', type: 'error' });
  const scaleMonthly = useSharedValue(1);
  const scaleLifetime = useSharedValue(1);
  const scalePremiumLifetime = useSharedValue(1);

  const showFeedback = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const hideFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  const monthlyCardStyle = useAnimatedStyle(() => {
    const scaleValue = scaleMonthly.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const lifetimeCardStyle = useAnimatedStyle(() => {
    const scaleValue = scaleLifetime.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const premiumLifetimeCardStyle = useAnimatedStyle(() => {
    const scaleValue = scalePremiumLifetime.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const handleSelectMonthly = () => {
    console.log('User selected monthly plan for program:', selectedProgram);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('monthly');
    scaleMonthly.value = withSpring(0.95, {}, () => {
      scaleMonthly.value = withSpring(1);
    });
    
    // Check if user is authenticated
    if (!user) {
      console.log('User not authenticated, showing sign-in prompt');
      setShowSignInPrompt(true);
    } else {
      console.log('User authenticated, proceeding to payment selection');
      setShowPaymentSelection(true);
    }
  };

  const handleSelectLifetime = () => {
    console.log('User selected lifetime plan for program:', selectedProgram);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('lifetime');
    scaleLifetime.value = withSpring(0.95, {}, () => {
      scaleLifetime.value = withSpring(1);
    });
    
    // Check if user is authenticated
    if (!user) {
      console.log('User not authenticated, showing sign-in prompt');
      setShowSignInPrompt(true);
    } else {
      console.log('User authenticated, proceeding to payment selection');
      setShowPaymentSelection(true);
    }
  };

  const handleSelectPremiumLifetime = () => {
    console.log('User selected premium lifetime plan');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('premium-lifetime');
    scalePremiumLifetime.value = withSpring(0.95, {}, () => {
      scalePremiumLifetime.value = withSpring(1);
    });
    
    // Check if user is authenticated
    if (!user) {
      console.log('User not authenticated, showing sign-in prompt');
      setShowSignInPrompt(true);
    } else {
      console.log('User authenticated, proceeding to payment selection');
      setShowPaymentSelection(true);
    }
  };

  const handleSignIn = () => {
    console.log('User navigating to sign-in screen');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/auth');
  };

  const handleContinueAsGuest = () => {
    console.log('User continuing as guest (will need to sign in before payment)');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSignInPrompt(false);
    setShowPaymentSelection(true);
  };

  const handleManagePaymentMethods = () => {
    console.log('User navigating to payment methods screen');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if user is authenticated before navigating
    if (!user) {
      console.log('User not authenticated, redirecting to sign-in');
      showFeedback(
        'Sign In Required',
        'Please sign in to manage your payment methods.',
        'error'
      );
      setTimeout(() => {
        hideFeedback();
        onClose();
        router.push('/auth');
      }, 1500);
      return;
    }
    
    onClose();
    router.push('/payment-methods');
  };

  const handleConfirmPayment = async () => {
    console.log('[API] User confirmed payment with plan:', selectedPlanType);
    
    if (!selectedPlanType) return;
    
    // Final authentication check before payment
    if (!user) {
      console.log('User not authenticated, cannot process payment');
      showFeedback(
        'Sign In Required',
        'Please sign in to complete your purchase.',
        'error'
      );
      setTimeout(() => {
        hideFeedback();
        onClose();
        router.push('/auth');
      }, 1500);
      return;
    }
    
    setIsProcessingPayment(true);
    try {
      console.log('[API] Requesting POST /api/subscriptions...');
      const subscription = await authenticatedPost('/api/subscriptions', {
        programType: selectedProgram,
        planType: selectedPlanType,
        // paymentMethodId will use default if not specified
      });
      console.log('[API] Subscription created successfully:', subscription);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      onSelectPlan(selectedPlanType, selectedProgram);
      
      setShowPaymentSelection(false);
      setSelectedPlanType(null);
    } catch (error) {
      console.error('[API] Error processing payment:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(
        'Payment Failed',
        error instanceof Error ? error.message : 'Payment failed. Please check your payment method and try again.',
        'error'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBackToPlans = () => {
    console.log('User navigating back to plan selection');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPaymentSelection(false);
    setShowSignInPrompt(false);
    setSelectedPlanType(null);
  };

  const handleClose = () => {
    console.log('Closing billing modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlanType(null);
    setShowPaymentSelection(false);
    setShowSignInPrompt(false);
    onClose();
  };

  const displayProgramTitle = programTitle || 'This Program';
  const displayProgramColor = programColor || colors.primary;

  const getPlanAmount = (planType: 'monthly' | 'lifetime' | 'premium-lifetime') => {
    const planAmountValue = planType === 'monthly' ? '$4.99' : planType === 'lifetime' ? '$10.99' : '$59.99';
    return planAmountValue;
  };

  const getPlanName = (planType: 'monthly' | 'lifetime' | 'premium-lifetime') => {
    const planNameValue = planType === 'monthly' ? 'Monthly Access' : planType === 'lifetime' ? 'Lifetime Access' : 'Premium Lifetime';
    return planNameValue;
  };

  // Sign-in prompt modal
  if (showSignInPrompt && selectedPlanType) {
    const planAmount = getPlanAmount(selectedPlanType);
    const planName = getPlanName(selectedPlanType);

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToPlans}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="arrow-back"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Sign In</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.signInPromptContent}>
                <View style={styles.signInIconContainer}>
                  <LinearGradient
                    colors={[displayProgramColor, displayProgramColor + 'DD']}
                    style={styles.signInIconGradient}
                  >
                    <IconSymbol
                      ios_icon_name="person.circle.fill"
                      android_material_icon_name="account-circle"
                      size={48}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>

                <Text style={styles.signInPromptTitle}>Sign In to Continue</Text>
                <Text style={styles.signInPromptSubtitle}>
                  Create an account or sign in to securely save your payment methods and manage your subscription.
                </Text>

                <View style={styles.selectedPlanSummarySmall}>
                  <Text style={styles.selectedPlanSummaryLabel}>Selected Plan</Text>
                  <View style={styles.selectedPlanSummaryRow}>
                    <Text style={styles.selectedPlanSummaryName}>{planName}</Text>
                    <Text style={styles.selectedPlanSummaryAmount}>{planAmount}</Text>
                  </View>
                </View>

                <View style={styles.signInBenefits}>
                  <View style={styles.benefitRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.success}
                    />
                    <Text style={styles.benefitText}>Securely save payment methods</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.success}
                    />
                    <Text style={styles.benefitText}>Manage subscriptions easily</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.success}
                    />
                    <Text style={styles.benefitText}>Access across all devices</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.success}
                    />
                    <Text style={styles.benefitText}>Track your progress</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleSignIn}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInButtonGradient}
                  >
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.signInButtonText}>Sign In or Create Account</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueAsGuestButton}
                  onPress={handleContinueAsGuest}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueAsGuestText}>Continue as Guest</Text>
                  <Text style={styles.continueAsGuestSubtext}>
                    You&apos;ll need to sign in before completing payment
                  </Text>
                </TouchableOpacity>

                <View style={styles.secureContainer}>
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="verified-user"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.secureText}>Your data is secure and encrypted</Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Payment selection screen
  if (showPaymentSelection && selectedPlanType) {
    const planAmount = getPlanAmount(selectedPlanType);
    const planName = getPlanName(selectedPlanType);
    const isAuthenticated = !!user;
    const userEmail = user?.email || '';

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToPlans}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="arrow-back"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Payment Method</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {isAuthenticated && (
                <View style={styles.userInfoBanner}>
                  <View style={styles.userInfoIcon}>
                    <IconSymbol
                      ios_icon_name="person.circle.fill"
                      android_material_icon_name="account-circle"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.userInfoText}>
                    <Text style={styles.userInfoLabel}>Signed in as</Text>
                    <Text style={styles.userInfoEmail}>{userEmail}</Text>
                  </View>
                  <View style={styles.userInfoBadge}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={16}
                      color={colors.success}
                    />
                  </View>
                </View>
              )}

              {!isAuthenticated && (
                <View style={styles.warningBanner}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={20}
                    color="#FF9500"
                  />
                  <Text style={styles.warningText}>
                    You&apos;ll need to sign in before completing payment
                  </Text>
                </View>
              )}

              <View style={styles.selectedPlanSummary}>
                <LinearGradient
                  colors={[displayProgramColor, displayProgramColor + 'DD']}
                  style={styles.selectedPlanGradient}
                >
                  <View style={styles.selectedPlanHeader}>
                    <Text style={styles.selectedPlanTitle}>{planName}</Text>
                    <Text style={styles.selectedPlanAmount}>{planAmount}</Text>
                  </View>
                  <Text style={styles.selectedPlanDescription}>
                    {selectedPlanType === 'monthly' && `Access to ${displayProgramTitle} for 90 days`}
                    {selectedPlanType === 'lifetime' && `Lifetime access to ${displayProgramTitle}`}
                    {selectedPlanType === 'premium-lifetime' && 'Lifetime access to all 6 programs + priority support'}
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.paymentMethodsSection}>
                <Text style={styles.sectionTitle}>Select Payment Method</Text>
                
                <TouchableOpacity
                  style={styles.paymentMethodCard}
                  onPress={handleManagePaymentMethods}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentMethodIcon}>
                    <IconSymbol
                      ios_icon_name="creditcard.fill"
                      android_material_icon_name="credit-card"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Manage Payment Methods</Text>
                    <Text style={styles.paymentMethodSubtitle}>Add or select a payment method</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="arrow-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <IconSymbol
                    ios_icon_name="info.circle"
                    android_material_icon_name="info"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.infoText}>
                    {isAuthenticated 
                      ? "You'll be redirected to add or select a payment method. After adding your payment method, return here to complete your purchase."
                      : "Sign in to securely save and manage your payment methods. You'll be able to complete your purchase after signing in."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmButton, isProcessingPayment && styles.confirmButtonDisabled]}
                onPress={handleConfirmPayment}
                activeOpacity={0.9}
                disabled={isProcessingPayment}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color="#FFFFFF"
                      />
                      <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secureContainer}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="verified-user"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles.secureText}>Secure payment processing</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>

        {/* Feedback Modal for payment errors */}
        <Modal
          visible={feedbackModal.visible}
          transparent
          animationType="fade"
          onRequestClose={hideFeedback}
        >
          <View style={styles.feedbackOverlay}>
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.feedbackModal}>
              <View style={[
                styles.feedbackIconContainer,
                { backgroundColor: feedbackModal.type === 'error' ? '#FFF0F0' : '#F0FFF4' }
              ]}>
                <IconSymbol
                  ios_icon_name={feedbackModal.type === 'error' ? 'xmark.circle.fill' : 'checkmark.circle.fill'}
                  android_material_icon_name={feedbackModal.type === 'error' ? 'cancel' : 'check-circle'}
                  size={48}
                  color={feedbackModal.type === 'error' ? '#FF3B30' : colors.success}
                />
              </View>
              <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
              <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  { backgroundColor: feedbackModal.type === 'error' ? '#FF3B30' : colors.success }
                ]}
                onPress={hideFeedback}
                activeOpacity={0.8}
              >
                <Text style={styles.feedbackButtonText}>OK</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </Modal>
    );
  }

  // Plan selection screen
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.modalContent}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[displayProgramColor, displayProgramColor + 'DD']}
                  style={styles.iconGradient}
                >
                  <IconSymbol
                    ios_icon_name="lock.open.fill"
                    android_material_icon_name="lock-open"
                    size={36}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>
              
              <Text style={styles.modalTitle}>Unlock Your</Text>
              <Text style={styles.modalTitle}>Transformation</Text>
              <Text style={styles.modalSubtitle}>
                Choose a plan to access {displayProgramTitle} and begin your 90-day journey
              </Text>
            </View>

            <View style={styles.plansContainer}>
              <Animated.View style={monthlyCardStyle}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    selectedPlanType === 'monthly' && styles.planCardSelected,
                  ]}
                  onPress={handleSelectMonthly}
                  activeOpacity={0.9}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planIconCircle}>
                      <IconSymbol
                        ios_icon_name="calendar"
                        android_material_icon_name="calendar-today"
                        size={20}
                        color={displayProgramColor}
                      />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={styles.planTitle}>Monthly Access</Text>
                      <Text style={styles.planSubtitle}>Per Program</Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceSymbol}>$</Text>
                    <Text style={styles.priceAmount}>4.99</Text>
                    <Text style={styles.pricePeriod}>/month</Text>
                  </View>

                  <View style={styles.planDuration}>
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="schedule"
                      size={12}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.planDurationText}>For 90 days (3 months)</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.featuresContainer}>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Access to {displayProgramTitle}</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>12 weekly techniques</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Progress tracking</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Cancel anytime</Text>
                    </View>
                  </View>

                  <View style={styles.totalCostContainer}>
                    <Text style={styles.totalCostLabel}>Total for 90 days:</Text>
                    <Text style={styles.totalCostAmount}>$14.97</Text>
                  </View>

                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>Select Monthly Plan</Text>
                    <IconSymbol
                      ios_icon_name="arrow.right"
                      android_material_icon_name="arrow-forward"
                      size={14}
                      color={displayProgramColor}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.popularBadgeContainer}>
                <LinearGradient
                  colors={[colors.accent, '#FFD780']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.popularBadge}
                >
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </LinearGradient>
              </View>

              <Animated.View style={premiumLifetimeCardStyle}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    styles.planCardPremium,
                    selectedPlanType === 'premium-lifetime' && styles.planCardSelected,
                  ]}
                  onPress={handleSelectPremiumLifetime}
                  activeOpacity={0.9}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planIconCircle}>
                      <IconSymbol
                        ios_icon_name="crown.fill"
                        android_material_icon_name="workspace-premium"
                        size={20}
                        color="#FFB84D"
                      />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={styles.planTitle}>Premium Lifetime</Text>
                      <Text style={styles.planSubtitle}>All 6 Programs Forever</Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceSymbol}>$</Text>
                    <Text style={styles.priceAmount}>59.99</Text>
                    <Text style={styles.pricePeriod}>one-time</Text>
                  </View>

                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>Save $29.85 vs 6 Monthly Programs</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.featuresContainer}>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Access to ALL 6 programs</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>72 total techniques</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Unlimited access forever</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Switch programs anytime</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Future updates included</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Priority support</Text>
                    </View>
                  </View>

                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>Select Premium Plan</Text>
                    <IconSymbol
                      ios_icon_name="arrow.right"
                      android_material_icon_name="arrow-forward"
                      size={14}
                      color="#FFB84D"
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={lifetimeCardStyle}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    styles.planCardLifetime,
                    selectedPlanType === 'lifetime' && styles.planCardSelected,
                  ]}
                  onPress={handleSelectLifetime}
                  activeOpacity={0.9}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planIconCircle}>
                      <IconSymbol
                        ios_icon_name="infinity"
                        android_material_icon_name="all-inclusive"
                        size={20}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={styles.planTitle}>Lifetime Access</Text>
                      <Text style={styles.planSubtitle}>This Program Only</Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceSymbol}>$</Text>
                    <Text style={styles.priceAmount}>10.99</Text>
                    <Text style={styles.pricePeriod}>one-time</Text>
                  </View>

                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>Save $3.98 vs Monthly</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.featuresContainer}>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Access to {displayProgramTitle}</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>12 weekly techniques</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Unlimited access forever</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Progress tracking</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={14}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Future updates included</Text>
                    </View>
                  </View>

                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>Select Lifetime Plan</Text>
                    <IconSymbol
                      ios_icon_name="arrow.right"
                      android_material_icon_name="arrow-forward"
                      size={14}
                      color={colors.accent}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <View style={styles.secureContainer}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="verified-user"
                  size={14}
                  color={colors.success}
                />
                <Text style={styles.secureText}>Secure payment processing</Text>
              </View>
              <Text style={styles.footerText}>
                Start your transformation journey today. Cancel monthly plans anytime.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: 24,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  signInPromptContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  signInIconContainer: {
    marginBottom: 24,
  },
  signInIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPromptTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  signInPromptSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  selectedPlanSummarySmall: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  selectedPlanSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  selectedPlanSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPlanSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  selectedPlanSummaryAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  signInBenefits: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  signInButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.3)',
    elevation: 6,
  },
  signInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueAsGuestButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 24,
  },
  continueAsGuestText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  continueAsGuestSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  userInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfoIcon: {
    marginRight: 12,
  },
  userInfoText: {
    flex: 1,
  },
  userInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userInfoEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  userInfoBadge: {
    marginLeft: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#8B6914',
    lineHeight: 18,
  },
  selectedPlanSummary: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.2)',
    elevation: 4,
  },
  selectedPlanGradient: {
    padding: 20,
  },
  selectedPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedPlanTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedPlanAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  selectedPlanDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    lineHeight: 20,
  },
  paymentMethodsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 18,
  },
  confirmButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.3)',
    elevation: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    minHeight: 56,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  feedbackModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  feedbackIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  feedbackButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  popularBadgeContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.1)',
    elevation: 4,
  },
  planCardLifetime: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  planCardPremium: {
    borderColor: '#FFB84D',
    borderWidth: 2,
    boxShadow: '0px 6px 20px rgba(255, 184, 77, 0.2)',
    elevation: 6,
  },
  planCardSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
    boxShadow: '0px 8px 24px rgba(107, 76, 230, 0.25)',
    elevation: 8,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  planHeaderText: {
    flex: 1,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  planSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 10,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
  },
  pricePeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  planDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 14,
  },
  planDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  savingsBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 14,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  totalCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  totalCostLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalCostAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.highlight,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  secureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
