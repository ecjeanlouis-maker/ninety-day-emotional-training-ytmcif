
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { authenticatedPost } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
import { trackEvent } from '@/utils/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  { key: 'emotional_control', label: 'Emotional Control', emoji: '🧘' },
  { key: 'build_confidence', label: 'Build Confidence', emoji: '💪' },
  { key: 'manage_anger', label: 'Manage Anger', emoji: '🌊' },
  { key: 'reduce_stress', label: 'Reduce Stress', emoji: '🍃' },
  { key: 'overcome_social_anxiety', label: 'Overcome Social Anxiety', emoji: '🤝' },
  { key: 'master_thoughts', label: 'Master My Thoughts', emoji: '🧠' },
];

const CHALLENGES = [
  { key: 'overthinking', label: 'Overthinking', emoji: '🌀' },
  { key: 'emotional_outbursts', label: 'Emotional Outbursts', emoji: '💥' },
  { key: 'low_self_esteem', label: 'Low Self-Esteem', emoji: '😔' },
  { key: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { key: 'anger', label: 'Anger', emoji: '😠' },
  { key: 'procrastination', label: 'Procrastination', emoji: '⏰' },
  { key: 'people_pleasing', label: 'People-Pleasing', emoji: '🙏' },
  { key: 'lack_of_focus', label: 'Lack of Focus', emoji: '🎯' },
];

const TOTAL_STEPS = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  console.log('[Onboarding] Screen rendered');
  const router = useRouter();

  useEffect(() => {
    console.log('[Onboarding] Screen mounted — tracking onboarding_started');
    trackEvent('onboarding_started');
  }, []);

  const [step, setStep] = useState(1);
  const [preferredName, setPreferredName] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [ecrsScores, setEcrsScores] = useState({ emotional_identification: 3, response_control: 3, confidence_composure: 3 });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progressPercent = `${(step / TOTAL_STEPS) * 100}%` as `${number}%`;

  const handleNext = () => {
    console.log('[Onboarding] Next tapped on step:', step);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    console.log('[Onboarding] Back tapped on step:', step);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  };

  const handleGoalSelect = (goal: string) => {
    console.log('[Onboarding] Goal selected:', goal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrimaryGoal(goal);
  };

  const handleChallengeSelect = (challenge: string) => {
    console.log('[Onboarding] Challenge selected:', challenge);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBiggestChallenge(challenge);
  };

  const handleSliderChange = (key: keyof typeof ecrsScores, val: number) => {
    console.log('[Onboarding] ECRS slider changed:', key, val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEcrsScores(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    console.log('[Onboarding] Submit tapped — posting onboarding + baseline assessment');
    setSubmitError(null);
    setSubmitting(true);
    try {
      const onboardingPayload = {
        preferred_name: preferredName || undefined,
        primary_goal: primaryGoal || undefined,
        biggest_challenge: biggestChallenge || undefined,
        reminder_time: reminderTime || undefined,
      };
      console.log('[Onboarding] POST /api/onboarding payload:', onboardingPayload);
      await authenticatedPost('/api/onboarding', onboardingPayload);

      const assessmentPayload = {
        emotional_identification: ecrsScores.emotional_identification,
        response_control: ecrsScores.response_control,
        confidence_composure: ecrsScores.confidence_composure,
        assessment_type: 'baseline',
      };
      console.log('[Onboarding] POST /api/assessments payload:', assessmentPayload);
      await authenticatedPost('/api/assessments', assessmentPayload);

      console.log('[Onboarding] Onboarding complete — navigating to Today dashboard');
      trackEvent('onboarding_completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/(home)');
    } catch (err) {
      console.error('[Onboarding] Error submitting onboarding:', err);
      const message = err instanceof Error ? err.message : 'Unable to save your preferences. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return preferredName.trim().length > 0;
    if (step === 2) return primaryGoal.length > 0;
    if (step === 3) return biggestChallenge.length > 0;
    return true;
  };

  const stepTitles = [
    'What should we call you?',
    "What's your primary goal?",
    "What's your biggest challenge?",
    'Set your daily reminder',
    'Baseline Assessment',
  ];

  const stepSubtitles = [
    'This is how we\'ll address you throughout the program.',
    'Choose the main area you want to transform.',
    'Knowing your challenge helps us personalize your journey.',
    'We\'ll remind you to practice daily. You can change this later.',
    'Rate yourself honestly — this is your starting point.',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
        <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(400)} key={step}>
          {/* Step header */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{stepTitles[step - 1]}</Text>
            <Text style={styles.stepSubtitle}>{stepSubtitles[step - 1]}</Text>
          </View>

          {/* Step 1: Name */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <TextInput
                style={styles.nameInput}
                placeholder="Your preferred name"
                placeholderTextColor={colors.textSecondary}
                value={preferredName}
                onChangeText={setPreferredName}
                autoFocus
                maxLength={50}
                onFocus={() => console.log('[Onboarding] Name input focused')}
              />
              <Text style={styles.inputHint}>This can be your first name, nickname, or anything you prefer.</Text>
            </View>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <View style={styles.optionGrid}>
              {GOALS.map(goal => {
                const isSelected = primaryGoal === goal.key;
                return (
                  <TouchableOpacity
                    key={goal.key}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => handleGoalSelect(goal.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionEmoji}>{goal.emoji}</Text>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{goal.label}</Text>
                    {isSelected && (
                      <View style={styles.optionCheck}>
                        <Text style={styles.optionCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 3: Challenge */}
          {step === 3 && (
            <View style={styles.optionGrid}>
              {CHALLENGES.map(challenge => {
                const isSelected = biggestChallenge === challenge.key;
                return (
                  <TouchableOpacity
                    key={challenge.key}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => handleChallengeSelect(challenge.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionEmoji}>{challenge.emoji}</Text>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{challenge.label}</Text>
                    {isSelected && (
                      <View style={styles.optionCheck}>
                        <Text style={styles.optionCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 4: Reminder */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.reminderCard}>
                <Text style={styles.reminderLabel}>Daily reminder time</Text>
                <TextInput
                  style={styles.reminderInput}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="HH:MM (e.g. 08:00)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  onFocus={() => console.log('[Onboarding] Reminder time input focused')}
                />
              </View>
              <Text style={styles.inputHint}>You can change or disable this reminder at any time in your profile settings.</Text>
            </View>
          )}

          {/* Step 5: Baseline ECRS */}
          {step === 5 && (
            <View style={styles.stepContent}>
              <View style={styles.ecrsCard}>
                <Text style={styles.ecrsIntro}>
                  Rate yourself honestly on each dimension. There are no right or wrong answers — this is your personal baseline.
                </Text>

                {[
                  { key: 'emotional_identification' as const, label: 'Emotional Identification', desc: 'How well can you identify and name your emotions in the moment?' },
                  { key: 'response_control' as const, label: 'Response Control', desc: 'How well can you pause and choose your response instead of reacting?' },
                  { key: 'confidence_composure' as const, label: 'Confidence & Composure', desc: 'How confident and composed do you feel in challenging situations?' },
                ].map(dimension => {
                  const val = ecrsScores[dimension.key];
                  const barWidth = `${(val / 5) * 100}%` as `${number}%`;
                  return (
                    <View key={dimension.key} style={styles.ecrsItem}>
                      <Text style={styles.ecrsLabel}>{dimension.label}</Text>
                      <Text style={styles.ecrsDesc}>{dimension.desc}</Text>
                      <View style={styles.ecrsSliderRow}>
                        {[1, 2, 3, 4, 5].map(v => {
                          const isActive = val === v;
                          return (
                            <TouchableOpacity
                              key={v}
                              style={[styles.ecrsButton, isActive && styles.ecrsButtonActive]}
                              onPress={() => handleSliderChange(dimension.key, v)}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.ecrsButtonText, isActive && styles.ecrsButtonTextActive]}>{v}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <View style={styles.ecrsBarTrack}>
                        <View style={[styles.ecrsBarFill, { width: barWidth }]} />
                      </View>
                      <View style={styles.ecrsScaleLabels}>
                        <Text style={styles.ecrsScaleLabel}>Low</Text>
                        <Text style={styles.ecrsScaleLabel}>High</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Inline submit error */}
      {submitError !== null && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#27AE60', '#1ABC9C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Start My Journey</Text>
                  <Text style={styles.nextButtonEmoji}>🚀</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.highlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepHeader: {
    paddingVertical: 24,
    gap: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stepContent: {
    gap: 16,
  },
  nameInput: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 18,
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  optionGrid: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 12,
    minHeight: 60,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0EBFF',
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCheckText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reminderInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    fontSize: 24,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  ecrsCard: {
    gap: 24,
  },
  ecrsIntro: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 14,
  },
  ecrsItem: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ecrsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ecrsDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ecrsSliderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  ecrsButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ecrsButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ecrsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ecrsButtonTextActive: {
    color: '#FFFFFF',
  },
  ecrsBarTrack: {
    height: 6,
    backgroundColor: colors.highlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ecrsBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  ecrsScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ecrsScaleLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 52,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextButtonEmoji: {
    fontSize: 18,
  },
});
