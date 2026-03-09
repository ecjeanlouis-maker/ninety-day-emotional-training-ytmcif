
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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
  
  const [selectedPlanType, setSelectedPlanType] = useState<'monthly' | 'lifetime' | 'premium-lifetime' | null>(null);
  const scaleMonthly = useSharedValue(1);
  const scaleLifetime = useSharedValue(1);
  const scalePremiumLifetime = useSharedValue(1);

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
    
    // TODO: Backend Integration - POST /api/subscriptions with { programType: selectedProgram, planType: 'monthly', amount: 4.99 } → { subscriptionId, status }
    onSelectPlan('monthly', selectedProgram);
  };

  const handleSelectLifetime = () => {
    console.log('User selected lifetime plan for program:', selectedProgram);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('lifetime');
    scaleLifetime.value = withSpring(0.95, {}, () => {
      scaleLifetime.value = withSpring(1);
    });
    
    // TODO: Backend Integration - POST /api/subscriptions with { programType: selectedProgram, planType: 'lifetime', amount: 10.99 } → { subscriptionId, status }
    onSelectPlan('lifetime', selectedProgram);
  };

  const handleSelectPremiumLifetime = () => {
    console.log('User selected premium lifetime plan');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('premium-lifetime');
    scalePremiumLifetime.value = withSpring(0.95, {}, () => {
      scalePremiumLifetime.value = withSpring(1);
    });
    
    // TODO: Backend Integration - POST /api/subscriptions with { planType: 'premium-lifetime', amount: 59.99 } → { subscriptionId, status }
    onSelectPlan('premium-lifetime');
  };

  const handleClose = () => {
    console.log('Closing billing modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlanType(null);
    onClose();
  };

  const displayProgramTitle = programTitle || 'This Program';
  const displayProgramColor = programColor || colors.primary;

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
    justifyContent: 'flex-end',
    padding: 16,
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
