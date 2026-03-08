
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
  onSelectPlan: (planType: 'monthly' | 'lifetime', programType?: ProgramType) => void;
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
  
  const [selectedPlanType, setSelectedPlanType] = useState<'monthly' | 'lifetime' | null>(null);
  const scaleMonthly = useSharedValue(1);
  const scaleLifetime = useSharedValue(1);

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
    console.log('User selected lifetime plan');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlanType('lifetime');
    scaleLifetime.value = withSpring(0.95, {}, () => {
      scaleLifetime.value = withSpring(1);
    });
    
    // TODO: Backend Integration - POST /api/subscriptions with { planType: 'lifetime', amount: 10.99 } → { subscriptionId, status }
    onSelectPlan('lifetime');
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
                  size={24}
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
                    size={48}
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
                        size={28}
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
                      size={16}
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
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Access to {displayProgramTitle}</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>12 weekly techniques</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Progress tracking</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
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
                      size={20}
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
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </LinearGradient>
              </View>

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
                        size={28}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={styles.planTitle}>Lifetime Access</Text>
                      <Text style={styles.planSubtitle}>All Programs</Text>
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
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Access to ALL 6 programs</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>72 total techniques</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Unlimited access forever</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>Switch programs anytime</Text>
                    </View>
                    <View style={styles.featureRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
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
                      size={20}
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
                  size={20}
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.1)',
    elevation: 4,
  },
  planCardLifetime: {
    borderColor: colors.accent,
    borderWidth: 2,
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
    marginBottom: 20,
  },
  planIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderText: {
    flex: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  planSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
  },
  priceSymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  planDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  planDurationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  savingsBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  savingsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  totalCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalCostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalCostAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.highlight,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
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
    gap: 8,
    marginBottom: 12,
  },
  secureText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
