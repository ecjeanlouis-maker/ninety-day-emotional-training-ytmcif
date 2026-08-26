
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AudioCompanion from '@/components/AudioCompanion';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import { IconSymbol } from '@/components/IconSymbol';
import CongratulationsModal from '@/components/CongratulationsModal';
import { techniques } from '@/data/techniques';
import { useUser } from '@/contexts/UserContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayContent {
  day_number: number;
  title: string;
  phase: string;
  week: number;
  lesson_content: string;
  drill_instructions: string;
  challenge: string;
  reflection_prompt: string;
}

interface DayProgress {
  day_number: number;
  completed: boolean;
  lesson_read: boolean;
  drill_completed: boolean;
  reflection_text?: string;
  completed_at?: string;
}

interface CompleteResponse {
  day_progress: DayProgress;
  streak: number;
  xp_earned: number;
  achievements_unlocked: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  'Emotional Control': '#6B4CE6',
  'Confidence': '#FFB84D',
  'Anger Management': '#E74C3C',
  'Stress Management': '#3B82F6',
  'Social Anxiety': '#F5A623',
  'Thought Regulation': '#27AE60',
  'Organization Skills': '#1ABC9C',
  'Communication Skills': '#9B59B6',
};

const STEP_LABELS = ['Lesson', 'Drill', 'Reflect', 'Complete'];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                isCompleted && styles.stepDotCompleted,
                isCurrent && styles.stepDotCurrent,
              ]}
            >
              {isCompleted && <Text style={styles.stepDotCheck}>✓</Text>}
              {isCurrent && <View style={styles.stepDotInner} />}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isCurrent && styles.stepLabelCurrent,
                isCompleted && styles.stepLabelCompleted,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Session Header ───────────────────────────────────────────────────────────

function SessionHeader({ dayNum, phase }: { dayNum: number; phase: string }) {
  return (
    <View style={styles.sessionHeader}>
      <View style={styles.sessionHeaderLeft}>
        <Text style={styles.sessionDayBadge}>DAY {dayNum} OF 90</Text>
        <Text style={styles.sessionPhase}>{phase}</Text>
      </View>
      <View style={styles.sessionDurationChip}>
        <Text style={styles.sessionDuration}>~5–10 min</Text>
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DayDetailScreen() {
  const router = useRouter();
  const { dayNumber } = useLocalSearchParams<{ dayNumber: string }>();
  const dayNum = parseInt(dayNumber || '1', 10);
  const { entitlement } = useUser();

  console.log('[DayDetail] Screen rendered for day:', dayNum);

  // ── Data state ──
  const [content, setContent] = useState<DayContent | null>(null);
  const [progress, setProgress] = useState<DayProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [progressionRequired, setProgressionRequired] = useState<number | null>(null);

  // ── Step state ──
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // ── Step 0: Lesson ──
  const [markingRead, setMarkingRead] = useState(false);

  // ── Step 1: Drill ──
  const [drillSubStep, setDrillSubStep] = useState(0);
  const [markingDrill, setMarkingDrill] = useState(false);

  // ── Step 2: Reflection ──
  const [reflectionText, setReflectionText] = useState('');
  const [ecrsScores, setEcrsScores] = useState({
    emotional_identification: 3,
    response_control: 3,
    confidence_composure: 3,
  });

  // ── Step 3: Complete ──
  const [completing, setCompleting] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState<string[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const submittingRef = useRef(false);

  // ── Entitlement gate check (client-side fast path) ──
  // If entitlement is loaded and day > 7 and no days_8_90_access, show premium gate immediately
  const clientSidePremiumBlocked =
    entitlement !== null && dayNum > 7 && !entitlement.days_8_90_access;

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    console.log('[DayDetail] Fetching content for day:', dayNum);
    try {
      const [contentRes, progressRes] = await Promise.all([
        authenticatedGet<DayContent>(`/api/program/content/${dayNum}`),
        authenticatedGet<DayProgress>(`/api/program/days/${dayNum}`).catch(() => null),
      ]);
      console.log('[DayDetail] Content loaded:', contentRes?.title);
      console.log('[DayDetail] Progress loaded:', progressRes);
      setContent(contentRes);
      setPremiumRequired(false);
      setProgressionRequired(null);
      if (progressRes) {
        setProgress(progressRes);
        if (progressRes.reflection_text) {
          setReflectionText(progressRes.reflection_text);
        }
      }
      setError(null);
    } catch (err: any) {
      console.error('[DayDetail] Error fetching day content:', err);
      // Parse 403 errors from the backend
      const msg: string = err?.message ?? '';
      if (msg.includes('403')) {
        // Try to extract structured error from message
        if (msg.includes('premium_required')) {
          console.log('[DayDetail] 403 premium_required — showing premium gate');
          setPremiumRequired(true);
          setError(null);
        } else if (msg.includes('progression_required') || msg.includes('complete_previous_day_first')) {
          // Extract required_day from message if present
          const match = msg.match(/"required_day"\s*:\s*(\d+)/);
          const requiredDay = match ? parseInt(match[1], 10) : dayNum - 1;
          console.log('[DayDetail] 403 progression_required — required day:', requiredDay);
          setProgressionRequired(requiredDay);
          setError(null);
        } else {
          setError('Access denied. Please check your subscription.');
        }
      } else {
        setError('Unable to load day content. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [dayNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ──

  const handleBack = () => {
    console.log('[DayDetail] Back button tapped, currentStep:', currentStep);
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      setStepError(null);
    } else {
      router.back();
    }
  };

  const handleMarkRead = async () => {
    console.log('[DayDetail] Mark as Read tapped for day:', dayNum);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('exercise_started', { day_number: dayNum });
    setMarkingRead(true);
    setStepError(null);
    try {
      console.log('[DayDetail] PATCH /api/program/days/:dayNum lesson_read=true');
      await authenticatedPatch(`/api/program/days/${dayNum}`, { lesson_read: true });
      console.log('[DayDetail] Lesson marked as read — advancing to Step 1');
      setCurrentStep(1);
    } catch (err) {
      console.error('[DayDetail] Error marking lesson read:', err);
      setStepError('Failed to save progress. Please try again.');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleDrillComplete = async () => {
    console.log('[DayDetail] Drill Complete tapped for day:', dayNum);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('exercise_completed', { day_number: dayNum, step: 1 });
    setMarkingDrill(true);
    setStepError(null);
    try {
      console.log('[DayDetail] PATCH /api/program/days/:dayNum drill_completed=true');
      await authenticatedPatch(`/api/program/days/${dayNum}`, { drill_completed: true });
      console.log('[DayDetail] Drill marked complete — advancing to Step 2');
      setCurrentStep(2);
    } catch (err) {
      console.error('[DayDetail] Error marking drill complete:', err);
      setStepError('Failed to save progress. Please try again.');
    } finally {
      setMarkingDrill(false);
    }
  };

  const handleNextDrillStep = () => {
    console.log('[DayDetail] Next drill sub-step tapped, current:', drillSubStep);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrillSubStep(s => s + 1);
  };

  const handleEcrsChange = (key: keyof typeof ecrsScores, val: number) => {
    console.log('[DayDetail] ECRS score changed:', key, '=', val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEcrsScores(prev => ({ ...prev, [key]: val }));
  };

  const handleContinueToComplete = () => {
    console.log('[DayDetail] Continue to Complete tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('exercise_completed', { day_number: dayNum, step: 2 });
    setCurrentStep(3);
    setStepError(null);
  };

  const handleCompleteDay = async () => {
    if (submittingRef.current) {
      console.log('[DayDetail] Complete Day — already submitting, ignoring tap');
      return;
    }
    console.log('[DayDetail] Complete Day tapped for day:', dayNum);
    submittingRef.current = true;
    setCompleting(true);
    setStepError(null);
    try {
      const payload = {
        reflection_text: reflectionText || undefined,
        emotional_identification: ecrsScores.emotional_identification,
        response_control: ecrsScores.response_control,
        confidence_composure: ecrsScores.confidence_composure,
      };
      console.log('[DayDetail] POST /api/program/days/:dayNum/complete payload:', payload);
      const res = await authenticatedPost<CompleteResponse>(`/api/program/days/${dayNum}/complete`, payload);
      console.log('[DayDetail] Day completed! XP:', res.xp_earned, 'Streak:', res.streak, 'Achievements:', res.achievements_unlocked);
      trackEvent('day_completed', { day_number: dayNum });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setXpEarned(res.xp_earned || 0);
      setStreakCount(res.streak || 0);
      setAchievementsUnlocked(res.achievements_unlocked || []);
      setCompletedSuccess(true);
      setShowCongrats(true);
    } catch (err: any) {
      console.error('[DayDetail] Error completing day:', err);
      const msg: string = err?.message ?? '';
      if (msg.includes('403')) {
        if (msg.includes('premium_required')) {
          console.log('[DayDetail] Complete blocked — premium_required');
          setPremiumRequired(true);
        } else if (msg.includes('progression_required') || msg.includes('complete_previous_day_first')) {
          const match = msg.match(/"required_day"\s*:\s*(\d+)/);
          const requiredDay = match ? parseInt(match[1], 10) : dayNum - 1;
          console.log('[DayDetail] Complete blocked — progression_required, required day:', requiredDay);
          setStepError(`Complete Day ${requiredDay} first before starting this day.`);
        } else {
          setStepError('Access denied. Please check your subscription.');
        }
      } else {
        setStepError('Unable to complete the day. Please try again.');
      }
    } finally {
      setCompleting(false);
      submittingRef.current = false;
    }
  };

  const handleCongratsClose = () => {
    console.log('[DayDetail] Congratulations modal closed — navigating home');
    setShowCongrats(false);
    setTimeout(() => {
      router.replace('/(tabs)/(home)');
    }, 100);
  };

  // ── Derived ──
  const phaseColor = content ? (PHASE_COLORS[content.phase] || colors.primary) : colors.primary;
  const dayTitle = content?.title || `Day ${dayNum}`;
  const isAlreadyCompleted = progress?.completed || false;
  const techniqueData = techniques[dayNum - 1];
  const practiceSteps = techniqueData?.practiceSteps ?? [];
  const hasPracticeSteps = practiceSteps.length > 0;
  const isLastDrillStep = hasPracticeSteps ? drillSubStep >= practiceSteps.length - 1 : true;

  // ── Loading / Error ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading day content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Premium gate (client-side fast path or server 403 premium_required) ──
  if (clientSidePremiumBlocked || premiumRequired) {
    const premiumTitle = `Day ${dayNum} requires Premium`;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.gateContainer}>
          <View style={styles.gateLockCircle}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={styles.gateTitle}>{premiumTitle}</Text>
          <Text style={styles.gateSubtitle}>
            Days 1–7 are free. Upgrade to unlock the full 90-day program.
          </Text>
          <TouchableOpacity
            style={styles.gateUpgradeButton}
            onPress={() => {
              console.log('[DayDetail] Premium gate — Upgrade to Premium tapped, day:', dayNum);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/paywall');
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gateUpgradeGradient}
            >
              <Text style={styles.gateUpgradeText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gateBackButton}
            onPress={() => {
              console.log('[DayDetail] Premium gate — Back tapped');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.gateBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Progression gate (server 403 progression_required) ──
  if (progressionRequired !== null) {
    const requiredDayNum = progressionRequired;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.gateContainer}>
          <View style={[styles.gateLockCircle, styles.gateLockCircleGrey]}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={36}
              color="#8E8E93"
            />
          </View>
          <Text style={styles.gateTitle}>Complete Day {requiredDayNum} First</Text>
          <Text style={styles.gateSubtitle}>
            Complete Day {requiredDayNum} first before starting this day.
          </Text>
          <TouchableOpacity
            style={styles.gateUpgradeButton}
            onPress={() => {
              console.log('[DayDetail] Progression gate — Go to Day', requiredDayNum, 'tapped');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace(`/day/${requiredDayNum}`);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gateUpgradeGradient}
            >
              <Text style={styles.gateUpgradeText}>Go to Day {requiredDayNum}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gateBackButton}
            onPress={() => {
              console.log('[DayDetail] Progression gate — Back tapped');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.gateBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !content) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <TouchableOpacity style={styles.backButtonSmall} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.errorText}>{error || 'Content not found.'}</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[DayDetail] Retry tapped');
              fetchData();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top nav row */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButtonSmall}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>{dayTitle}</Text>
        <View style={styles.topNavSpacer} />
      </View>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      {currentStep === 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.stepWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SessionHeader dayNum={dayNum} phase={content.phase} />

            <AudioCompanion
              dayNumber={dayNum}
              title={content.title}
              lessonContent={content.lesson_content}
              drillInstructions={content.drill_instructions}
              reflectionPrompt={content.reflection_prompt}
              challenge={content.challenge}
              currentStep={currentStep}
              autoStart={true}
              gestureUnlocked={true}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: phaseColor + '20' }]}>
                  <IconSymbol ios_icon_name="book.fill" android_material_icon_name="book" size={20} color={phaseColor} />
                </View>
                <Text style={styles.sectionTitle}>{content.title}</Text>
              </View>
              <Text style={styles.lessonContent}>{content.lesson_content}</Text>
            </View>

            {stepError && <Text style={styles.inlineError}>{stepError}</Text>}
          </ScrollView>

          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.primaryButton, markingRead && styles.primaryButtonDisabled]}
              onPress={handleMarkRead}
              disabled={markingRead}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, '#8B6FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                {markingRead ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Mark as Read</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {currentStep === 1 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.stepWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SessionHeader dayNum={dayNum} phase={content.phase} />

            <AudioCompanion
              dayNumber={dayNum}
              title={content.title}
              lessonContent={content.lesson_content}
              drillInstructions={content.drill_instructions}
              reflectionPrompt={content.reflection_prompt}
              challenge={content.challenge}
              currentStep={currentStep}
              autoStart={true}
              gestureUnlocked={true}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#3B82F620' }]}>
                  <IconSymbol ios_icon_name="figure.walk" android_material_icon_name="directions-walk" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.sectionTitle}>Today's Drill</Text>
              </View>

              {hasPracticeSteps ? (
                <Animated.View key={drillSubStep} entering={FadeInDown.duration(300)} style={styles.drillStepCard}>
                  <View style={styles.drillStepBadge}>
                    <Text style={styles.drillStepBadgeText}>Step {drillSubStep + 1} of {practiceSteps.length}</Text>
                  </View>
                  <Text style={styles.drillStepText}>{practiceSteps[drillSubStep]}</Text>
                </Animated.View>
              ) : (
                <Text style={styles.drillContent}>{content.drill_instructions}</Text>
              )}
            </View>

            {stepError && <Text style={styles.inlineError}>{stepError}</Text>}
          </ScrollView>

          <View style={styles.actionBar}>
            {hasPracticeSteps && !isLastDrillStep ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextDrillStep}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#3B82F6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Next Step →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, markingDrill && styles.primaryButtonDisabled]}
                onPress={handleDrillComplete}
                disabled={markingDrill}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#27AE60', '#1ABC9C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {markingDrill ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {hasPracticeSteps ? 'Drill Complete ✓' : 'Mark Drill Complete'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {currentStep === 2 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.stepWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AudioCompanion
              dayNumber={dayNum}
              title={content.title}
              lessonContent={content.lesson_content}
              drillInstructions={content.drill_instructions}
              reflectionPrompt={content.reflection_prompt}
              challenge={content.challenge}
              currentStep={currentStep}
              autoStart={true}
              gestureUnlocked={true}
            />

            <View style={styles.reflectHeaderRow}>
              <Text style={styles.reflectHeading}>Reflect & Rate</Text>
            </View>

            {content.reflection_prompt ? (
              <View style={styles.section}>
                <Text style={styles.reflectionPrompt}>{content.reflection_prompt}</Text>
                <TextInput
                  style={styles.reflectionInput}
                  placeholder="Write your reflection here..."
                  placeholderTextColor={colors.textSecondary}
                  value={reflectionText}
                  onChangeText={text => {
                    console.log('[DayDetail] Reflection text changed, length:', text.length);
                    setReflectionText(text);
                  }}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => console.log('[DayDetail] Reflection input focused')}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <TextInput
                  style={styles.reflectionInput}
                  placeholder="Write your reflection here..."
                  placeholderTextColor={colors.textSecondary}
                  value={reflectionText}
                  onChangeText={text => {
                    console.log('[DayDetail] Reflection text changed, length:', text.length);
                    setReflectionText(text);
                  }}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => console.log('[DayDetail] Reflection input focused')}
                />
              </View>
            )}

            {/* ECRS */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#27AE6020' }]}>
                  <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar-chart" size={20} color="#27AE60" />
                </View>
                <Text style={styles.sectionTitle}>ECRS Check-in</Text>
              </View>
              <Text style={styles.ecrsIntro}>Rate yourself after today's practice:</Text>

              {[
                { key: 'emotional_identification' as const, label: 'Emotional Identification' },
                { key: 'response_control' as const, label: 'Response Control' },
                { key: 'confidence_composure' as const, label: 'Confidence & Composure' },
              ].map(dim => {
                const val = ecrsScores[dim.key];
                return (
                  <View key={dim.key} style={styles.ecrsItem}>
                    <Text style={styles.ecrsLabel}>{dim.label}</Text>
                    <View style={styles.ecrsButtons}>
                      {[1, 2, 3, 4, 5].map(v => {
                        const isActive = val === v;
                        return (
                          <TouchableOpacity
                            key={v}
                            style={[styles.ecrsButton, isActive && styles.ecrsButtonActive]}
                            onPress={() => handleEcrsChange(dim.key, v)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.ecrsButtonText, isActive && styles.ecrsButtonTextActive]}>{v}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            {stepError && <Text style={styles.inlineError}>{stepError}</Text>}
          </ScrollView>

          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinueToComplete}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, '#8B6FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {currentStep === 3 && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.stepWrapper, styles.completeStepWrapper]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <AudioCompanion
              dayNumber={dayNum}
              title={content.title}
              lessonContent={content.lesson_content}
              drillInstructions={content.drill_instructions}
              reflectionPrompt={content.reflection_prompt}
              challenge={content.challenge}
              currentStep={currentStep}
              autoStart={true}
              gestureUnlocked={true}
            />
          </ScrollView>

          <View style={styles.completeCenter}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={styles.completeHeading}>Day {dayNum} Complete!</Text>

            {completedSuccess && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.xpRow}>
                <Text style={styles.xpText}>+{xpEarned} XP</Text>
                {streakCount > 0 && (
                  <Text style={styles.streakText}>🔥 {streakCount} day streak</Text>
                )}
              </Animated.View>
            )}

            {isAlreadyCompleted && !completedSuccess && (
              <View style={styles.alreadyCompletedBadge}>
                <Text style={styles.alreadyCompletedText}>✓ Already Completed</Text>
              </View>
            )}
          </View>

          <View style={styles.actionBar}>
            {stepError && <Text style={styles.inlineError}>{stepError}</Text>}

            {isAlreadyCompleted && !completedSuccess ? (
              <>
                <View style={[styles.primaryButton, styles.primaryButtonDisabled]}>
                  <View style={[styles.primaryButtonGradient, styles.alreadyCompletedButton]}>
                    <Text style={styles.primaryButtonText}>✓ Already Completed</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.returnLink}
                  onPress={() => {
                    console.log('[DayDetail] Return to Today tapped');
                    router.replace('/(tabs)/(home)');
                  }}
                >
                  <Text style={styles.returnLinkText}>Return to Today</Text>
                </TouchableOpacity>
              </>
            ) : completedSuccess ? (
              <View style={styles.savedRow}>
                <Text style={styles.savedText}>✓ Saved!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, completing && styles.primaryButtonDisabled]}
                onPress={handleCompleteDay}
                disabled={completing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#27AE60', '#1ABC9C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {completing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Complete Day {dayNum}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* Congratulations Modal */}
      <CongratulationsModal
        visible={showCongrats}
        onClose={handleCongratsClose}
        weekNumber={content?.week || 1}
        techniqueTitle={`Day ${dayNum}: ${dayTitle}`}
        categoryColor={phaseColor}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Top nav
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  topNavSpacer: {
    width: 40,
  },
  audioToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioToggleText: {
    fontSize: 18,
    opacity: 0.5,
  },
  audioToggleTextActive: {
    opacity: 1,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stepDotCheck: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: colors.primary,
  },

  // Step wrapper
  stepWrapper: {
    flex: 1,
  },
  completeStepWrapper: {
    justifyContent: 'space-between',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },

  // Session header
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeaderLeft: {
    gap: 2,
    flexShrink: 1,
  },
  sessionDayBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sessionPhase: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sessionDurationChip: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  sessionDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Section
  section: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  lessonContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  drillContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },

  // Drill sub-steps
  drillStepCard: {
    backgroundColor: colors.highlight,
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  drillStepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  drillStepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drillStepText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    fontWeight: '500',
  },

  // Reflection
  reflectHeaderRow: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  reflectHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  reflectionPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  reflectionInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    lineHeight: 22,
  },

  // ECRS
  ecrsIntro: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ecrsItem: {
    gap: 8,
  },
  ecrsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ecrsButtons: {
    flexDirection: 'row',
    gap: 8,
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

  // Complete step
  completeCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  trophyEmoji: {
    fontSize: 72,
  },
  completeHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  xpRow: {
    alignItems: 'center',
    gap: 8,
  },
  xpText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#27AE60',
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alreadyCompletedBadge: {
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  alreadyCompletedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27AE60',
  },
  savedRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  savedText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#27AE60',
  },
  alreadyCompletedButton: {
    backgroundColor: colors.border,
  },
  returnLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  returnLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // Action bar
  actionBar: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Primary button
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    minHeight: 52,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Inline error
  inlineError: {
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
    marginHorizontal: 16,
    fontWeight: '500',
  },

  // Premium / Progression gate
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  gateLockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gateLockCircleGrey: {
    backgroundColor: '#F2F2F7',
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  gateSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  gateUpgradeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gateUpgradeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateUpgradeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gateBackButton: {
    paddingVertical: 12,
  },
  gateBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
