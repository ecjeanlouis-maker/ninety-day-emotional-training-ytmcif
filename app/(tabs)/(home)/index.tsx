
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNetworkState } from 'expo-network';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'expo-router';
import { authenticatedGet } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import Survey from './survey';
import { ProgramType } from '@/types/program';
import { techniques } from '@/data/techniques';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressData {
  current_streak: number;
  longest_streak: number;
  total_days_completed: number;
  total_xp: number;
  weekly_completion: { date: string; completed: boolean }[];
  current_day: number;
}

interface AssessmentData {
  id: string;
  emotional_identification: number;
  response_control: number;
  confidence_composure: number;
  overall_score: number;
  assessment_type: string;
  created_at: string;
}

interface OnboardingData {
  id: string;
  preferred_name: string | null;
  primary_goal: string | null;
  biggest_challenge: string | null;
  reminder_time: string | null;
  completed_at: string | null;
}

// ─── Guest Welcome Screen ─────────────────────────────────────────────────────

function GuestWelcomeScreen() {
  const router = useRouter();
  const [showSurvey, setShowSurvey] = useState(false);

  const handleBeginAssessment = () => {
    console.log('[Home] Guest tapped Begin Assessment');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSurvey(true);
  };

  const handleSurveyComplete = (recommendedPrograms: ProgramType[]) => {
    console.log('[Home] Guest survey completed with recommendations:', recommendedPrograms);
    setShowSurvey(false);
    router.push('/(tabs)/program');
  };

  const handleSurveyBack = () => {
    console.log('[Home] Guest navigating back from survey');
    setShowSurvey(false);
  };

  if (showSurvey) {
    return (
      <Survey
        onComplete={handleSurveyComplete}
        onBack={handleSurveyBack}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(1000)} style={styles.welcomeHero}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeHeroGradient}
          >
            <View style={styles.welcomeIconContainer}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={64}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Your</Text>
            <Text style={styles.welcomeTitle}>Transformation Journey</Text>
            <Text style={styles.welcomeSubtitle}>
              90 days to become the best version of yourself
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.welcomeStats}>
          <View style={styles.welcomeStatItem}>
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={32} color={colors.primary} />
            <Text style={styles.welcomeStatNumber}>90</Text>
            <Text style={styles.welcomeStatLabel}>Days</Text>
          </View>
          <View style={styles.welcomeStatDivider} />
          <View style={styles.welcomeStatItem}>
            <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={32} color={colors.primary} />
            <Text style={styles.welcomeStatNumber}>8</Text>
            <Text style={styles.welcomeStatLabel}>Phases</Text>
          </View>
          <View style={styles.welcomeStatDivider} />
          <View style={styles.welcomeStatItem}>
            <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending-up" size={32} color={colors.primary} />
            <Text style={styles.welcomeStatNumber}>100%</Text>
            <Text style={styles.welcomeStatLabel}>Growth</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(800)} style={styles.welcomeButtonContainer}>
          <TouchableOpacity
            style={styles.welcomeButton}
            onPress={() => {
              console.log('[Home] Guest tapped Sign In');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/auth');
            }}
            activeOpacity={0.9}
            accessibilityLabel="Sign In"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeButtonGradient}
            >
              <Text style={styles.welcomeButtonText}>Sign In</Text>
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).duration(800)} style={styles.welcomeButtonContainer}>
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => {
              console.log('[Home] Guest tapped Create Account');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/signup');
            }}
            activeOpacity={0.9}
            accessibilityLabel="Create Account"
            accessibilityRole="button"
          >
            <Text style={styles.createAccountButtonText}>Create Account</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650).duration(800)} style={styles.guestButtonContainer}>
          <TouchableOpacity
            style={styles.guestButton}
            activeOpacity={0.85}
            onPress={() => {
              console.log('[Home] Continue as Guest tapped — starting assessment');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleBeginAssessment();
            }}
            accessibilityLabel="Continue as Guest — take the assessment"
            accessibilityRole="button"
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(750).duration(800)} style={styles.welcomeFooter}>
          <Text style={styles.welcomeFooterText}>
            Sign in to save your progress, or continue as a guest to take the assessment.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, size, strokeWidth }: { progress: number; size: number; strokeWidth: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const filledLength = clampedProgress * circumference;
  const emptyLength = circumference - filledLength;

  // View-based ring using border trick
  const angle = clampedProgress * 360;
  const ringStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: strokeWidth,
    borderColor: colors.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  };

  const progressPercentRounded = Math.round(clampedProgress * 100);

  return (
    <View
      style={ringStyle}
      accessible={true}
      accessibilityLabel={`Progress: ${progressPercentRounded} percent`}
    >
      {/* Filled arc overlay */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: colors.primary,
          borderRightColor: angle > 90 ? colors.primary : 'transparent',
          borderBottomColor: angle > 180 ? colors.primary : 'transparent',
          borderLeftColor: angle > 270 ? colors.primary : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
        {progressPercentRounded}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>%</Text>
    </View>
  );
}

// ─── Today Dashboard ──────────────────────────────────────────────────────────

function TodayDashboard() {
  const { user } = useAuth();
  const { canAccess } = useUser();
  const { isSubscribed } = useSubscription();
  const router = useRouter();

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  const networkState = useNetworkState();
  const isOffline = networkState.isConnected === false;

  useEffect(() => {
    if (!loading) { setLoadTimeout(false); return; }
    const t = setTimeout(() => {
      console.log('[Today] Loading timeout reached (8s)');
      setLoadTimeout(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [loading]);

  const fetchData = useCallback(async () => {
    console.log('[Today] Fetching dashboard data');
    try {
      const [progressRes, assessmentRes, onboardingRes] = await Promise.all([
        authenticatedGet<ProgressData>('/api/progress').catch(() => null),
        authenticatedGet<AssessmentData>('/api/assessments/latest').catch(() => null),
        authenticatedGet<OnboardingData>('/api/onboarding').catch(() => null),
      ]);
      console.log('[Today] Progress data:', progressRes);
      console.log('[Today] Assessment data:', assessmentRes);
      console.log('[Today] Onboarding data:', onboardingRes);
      setProgress(progressRes);
      setAssessment(assessmentRes);
      setOnboarding(onboardingRes);
      setError(null);
    } catch (err) {
      console.error('[Today] Error fetching dashboard data:', err);
      setError('Unable to load your progress. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    console.log('[Today] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchData();
  };

  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const currentDay = progress?.current_day ?? 1;
  const totalDaysCompleted = progress?.total_days_completed ?? 0;
  const currentStreak = progress?.current_streak ?? 0;
  const totalXP = progress?.total_xp ?? 0;
  const progressPercent = totalDaysCompleted / 90;

  const onboardingComplete = !!onboarding?.completed_at;

  // Derive today's lesson from the techniques list (day 1 = index 0, clamped to array bounds)
  const todayTechniqueIndex = Math.min(Math.max((currentDay ?? 1) - 1, 0), techniques.length - 1);
  const todayTechnique = techniques[todayTechniqueIndex];
  const lessonTitle = todayTechnique?.title ?? 'Today\'s Drill';
  const lessonDuration = todayTechnique?.practiceFrequency
    ? (() => {
        const freq = todayTechnique.practiceFrequency.toLowerCase();
        if (freq.includes('10')) return '10 min';
        if (freq.includes('5')) return '5 min';
        return '5–10 min';
      })()
    : '5–10 min';
  const lessonObjective = todayTechnique?.description
    ? todayTechnique.description.slice(0, 80).replace(/\s\S*$/, '') + '…'
    : 'Build your emotional control and confidence today.';
  const isDayCompleted = totalDaysCompleted >= currentDay;
  const drillButtonLabel = isDayCompleted ? 'Continue Today\'s Drill' : 'Start Today\'s Drill';
  const drillA11yLabel = isDayCompleted
    ? `Continue Today's Drill — Day ${currentDay}, ${lessonTitle}`
    : `Start Today's Drill — Day ${currentDay}, ${lessonTitle}`;

  const reducedMotion = useReducedMotion();

  // Progress strip derived values
  const MILESTONES = [7, 14, 30, 60, 90];
  const nextMilestone = MILESTONES.find(m => m > totalDaysCompleted) ?? 90;
  const daysToMilestone = Math.max(nextMilestone - totalDaysCompleted, 0);
  const progressPct = Math.round(progressPercent * 100);
  const milestoneLabel = nextMilestone === 90 ? 'Program complete' : `Day ${nextMilestone}`;

  const handleContinueTraining = () => {
    console.log('[Today] Continue Training tapped — navigating to day:', currentDay);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('day_viewed', { day_number: currentDay });
    router.push(`/day/${currentDay}`);
  };

  const handleStartJourney = () => {
    console.log('[Today] Complete Your Setup tapped — navigating to program-intro');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/program-intro');
  };

  const handleViewProgramOverview = () => {
    console.log('[Today] View Program Overview tapped — navigating to program-intro');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/program-intro');
  };

  const handleOpenCoach = () => {
    console.log('[Today] AI Coach card tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSubscribed && !canAccess('ecct_full_program')) {
      console.log('[Today] AI Coach locked — pushing paywall');
      router.push('/paywall');
      return;
    }
    router.push('/coach');
  };

  const handleViewAnalytics = () => {
    console.log('[Today] View Analytics tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSubscribed && !canAccess('ecct_full_program')) {
      console.log('[Today] Analytics locked — pushing paywall');
      router.push('/paywall');
      return;
    }
    router.push('/analytics');
  };

  const handleEmotionCheckin = () => {
    console.log('[Today] Quick emotion check-in tapped — navigating to Track tab');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/track');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.dashboardScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Skeleton header card */}
          <View style={styles.skeletonHeader} accessibilityLabel="Loading dashboard" />
          {/* Skeleton content cards */}
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          {/* Spinner + text below skeleton */}
          <View style={styles.skeletonSpinnerRow}>
            <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Loading dashboard" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
          {loadTimeout && (
            <TouchableOpacity
              onPress={() => {
                console.log('[Today] Timeout retry tapped');
                setLoadTimeout(false);
                fetchData();
              }}
              style={styles.retryButton}
              accessibilityLabel="Retry loading dashboard"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Taking too long? Retry</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!loading && !error && !progress && !onboarding) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyStateEmoji}>🌱</Text>
          <Text style={styles.emptyStateTitle}>Ready to begin?</Text>
          <Text style={styles.loadingText}>Complete your setup to start your 90-day journey.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              console.log('[Today] Empty state — Start Setup tapped');
              handleStartJourney();
            }}
            accessibilityLabel="Start your 90-day journey setup"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Start Setup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const streakText = `${currentStreak}`;
  const dayText = `Day ${currentDay} of 90`;
  const xpText = `${totalXP} XP`;
  const progressBarWidth = `${Math.round(progressPercent * 100)}%`;


  const isProLocked = !isSubscribed && !canAccess('ecct_full_program');
  const coachA11yLabel = isProLocked ? "AI Coach — Pro feature, tap to upgrade" : "AI Coach — get personalized guidance";
  const analyticsA11yLabel = isProLocked ? "Analytics — Pro feature, tap to upgrade" : "Analytics — view your progress trends";

  const ecrsScore1 = assessment?.emotional_identification ?? 0;
  const ecrsScore2 = assessment?.response_control ?? 0;
  const ecrsScore3 = assessment?.confidence_composure ?? 0;
  const ecrsBar1Width = `${(ecrsScore1 / 5) * 100}%`;
  const ecrsBar2Width = `${(ecrsScore2 / 5) * 100}%`;
  const ecrsBar3Width = `${(ecrsScore3 / 5) * 100}%`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.dashboardScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.dashboardHeader}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dashboardHeaderGradient}
          >
            <View style={styles.dashboardHeaderContent}>
              <View style={styles.dashboardHeaderText}>
                <Text style={styles.greetingText}>{greeting},</Text>
                <Text style={styles.greetingName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{displayName}</Text>
                <Text style={styles.dayProgressText}>{dayText}</Text>
              </View>
              <View style={styles.progressRingContainer}>
                <ProgressRing progress={progressPercent} size={80} strokeWidth={8} />
              </View>
            </View>

            {/* Streak + XP row */}
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipEmoji}>🔥</Text>
                <Text style={styles.statChipValue}>{streakText}</Text>
                <Text style={styles.statChipLabel}>streak</Text>
              </View>
              <View style={styles.statChipDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statChipEmoji}>⚡</Text>
                <Text style={styles.statChipValue}>{xpText}</Text>
                <Text style={styles.statChipLabel}>earned</Text>
              </View>
              <View style={styles.statChipDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statChipEmoji}>✅</Text>
                <Text style={styles.statChipValue}>{totalDaysCompleted}</Text>
                <Text style={styles.statChipLabel}>days done</Text>
              </View>
            </View>

            {/* Overall progress bar */}
            <View
              style={styles.overallProgressContainer}
              accessibilityLabel={`Overall progress: ${Math.round(progressPercent * 100)} percent`}
              accessibilityRole="progressbar"
            >
              <View style={styles.overallProgressTrack}>
                <View style={[styles.overallProgressFill, { width: progressBarWidth }]} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Error state */}
        {error && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard} accessibilityLiveRegion="assertive">
            <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
            <TouchableOpacity
              onPress={() => { console.log('[Today] Retry tapped'); fetchData(); }}
              style={styles.retryButton}
              accessibilityLabel="Retry loading dashboard"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Offline banner */}
        {isOffline && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.offlineBanner}
            accessibilityLiveRegion="polite"
            accessibilityLabel="You are offline. Showing cached data."
          >
            <Text style={styles.offlineBannerText}>📡  You're offline — showing cached data</Text>
          </Animated.View>
        )}

        {/* Onboarding prompt */}
        {!onboardingComplete && (
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <TouchableOpacity style={styles.onboardingCard} onPress={handleStartJourney} activeOpacity={0.85} accessibilityLabel="Complete Your Setup" accessibilityRole="button">
              <LinearGradient
                colors={['#FFB84D', '#FF8C42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.onboardingCardGradient}
              >
                <View style={styles.onboardingCardContent}>
                  <Text style={styles.onboardingCardTitle}>Complete Your Setup</Text>
                  <Text style={styles.onboardingCardSubtitle}>Complete your profile to personalize your 90-day program</Text>
                  <View style={styles.onboardingCardButton}>
                    <Text style={styles.onboardingCardButtonText}>Begin Setup</Text>
                    <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={16} color="#FF8C42" />
                  </View>
                </View>
                <Text style={styles.onboardingCardEmoji}>🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Training Card */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(150).duration(600)}
          style={styles.dailyCard}
          accessibilityLabel={`Day ${currentDay} of 90 — ${lessonTitle}, ${lessonDuration}`}
          accessibilityRole="none"
        >
          <View style={styles.dailyCardMeta}>
            <View style={styles.dailyCardBadge}>
              <Text style={styles.dailyCardBadgeText}>DAY {currentDay} OF 90</Text>
            </View>
            <View style={styles.dailyCardDurationBadge}>
              <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={13} color={colors.textSecondary} />
              <Text style={styles.dailyCardDurationText}>{lessonDuration}</Text>
            </View>
          </View>
          <Text style={styles.dailyCardTitle}>{lessonTitle}</Text>
          <Text style={styles.dailyCardObjective}>{lessonObjective}</Text>
          <TouchableOpacity
            style={styles.dailyCardButton}
            onPress={handleContinueTraining}
            activeOpacity={0.9}
            accessibilityLabel={drillA11yLabel}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dailyCardButtonGradient}
            >
              <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={20} color="#FFFFFF" />
              <Text style={styles.dailyCardButtonText}>{drillButtonLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* View Program Overview link */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(160).duration(600)}>
          <TouchableOpacity
            style={styles.programOverviewLink}
            onPress={handleViewProgramOverview}
            activeOpacity={0.7}
            accessibilityLabel="View Program Overview"
            accessibilityRole="button"
          >
            <IconSymbol ios_icon_name="map" android_material_icon_name="map" size={15} color={colors.primary} />
            <Text style={styles.programOverviewLinkText}>View Program Overview</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Progress Strip — XP · Weekly · Milestone */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(175).duration(600)}
          style={styles.progressStrip}
          accessibilityLabel={`${totalXP} XP earned. ${daysToMilestone > 0 ? `${daysToMilestone} days to ${milestoneLabel}` : `${milestoneLabel} reached`}.`}
          accessibilityRole="none"
        >
          {/* XP */}
          <View style={styles.progressStripItem}>
            <Text style={styles.progressStripValue} adjustsFontSizeToFit numberOfLines={1}>
              {totalXP}<Text style={styles.progressStripValueSub}> XP</Text>
            </Text>
            <Text style={styles.progressStripLabel} allowFontScaling={false}>⚡ Earned</Text>
          </View>
          <View style={styles.progressStripDivider} />
          {/* 7-day completion dots */}
          <View style={[styles.progressStripItem, { flex: 2 }]}>
            <View style={styles.weekDotsRow}>
              {(progress?.weekly_completion ?? Array(7).fill({ completed: false })).slice(-7).map((day: { completed: boolean }, i: number) => (
                <View
                  key={i}
                  style={[styles.weekDot, day.completed && styles.weekDotFilled]}
                  accessibilityLabel={day.completed ? `Day ${i + 1} complete` : `Day ${i + 1} incomplete`}
                />
              ))}
            </View>
            <Text style={styles.progressStripLabel} allowFontScaling={false}>This Week</Text>
          </View>
          <View style={styles.progressStripDivider} />
          {/* Next milestone */}
          <View style={styles.progressStripItem}>
            <Text style={[styles.progressStripValue, { color: colors.primary }]} adjustsFontSizeToFit numberOfLines={1}>
              {daysToMilestone > 0 ? daysToMilestone : '✓'}
            </Text>
            <Text style={styles.progressStripLabel} allowFontScaling={false}>
              {daysToMilestone > 0 ? `To ${milestoneLabel}` : milestoneLabel}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Emotion Check-in */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <TouchableOpacity
            style={styles.card}
            onPress={handleEmotionCheckin}
            activeOpacity={0.85}
            accessibilityLabel="Quick emotion check-in"
            accessibilityRole="button"
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: '#FFF0F5' }]}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color="#FF3B6B" />
              </View>
              <Text style={styles.cardTitle}>Quick Emotion Check-in</Text>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={18} color={colors.textSecondary} />
            </View>
            <Text style={styles.cardSubtitle}>Log your emotion and chosen response.</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ECRS Score Card */}
        {assessment && (
          <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBg, { backgroundColor: '#F0EBFF' }]}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar-chart" size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Latest ECRS Scores</Text>
            </View>
            <View style={styles.ecrsRow}>
              <Text style={styles.ecrsLabel}>Emotional ID</Text>
              <View style={styles.ecrsBarTrack}>
                <View style={[styles.ecrsBarFill, { width: ecrsBar1Width, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.ecrsScore}>{ecrsScore1}/5</Text>
            </View>
            <View style={styles.ecrsRow}>
              <Text style={styles.ecrsLabel}>Response Control</Text>
              <View style={styles.ecrsBarTrack}>
                <View style={[styles.ecrsBarFill, { width: ecrsBar2Width, backgroundColor: '#3B82F6' }]} />
              </View>
              <Text style={styles.ecrsScore}>{ecrsScore2}/5</Text>
            </View>
            <View style={styles.ecrsRow}>
              <Text style={styles.ecrsLabel}>Confidence</Text>
              <View style={styles.ecrsBarTrack}>
                <View style={[styles.ecrsBarFill, { width: ecrsBar3Width, backgroundColor: '#27AE60' }]} />
              </View>
              <Text style={styles.ecrsScore}>{ecrsScore3}/5</Text>
            </View>
          </Animated.View>
        )}

        {/* Action Cards Row */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.actionCardsRow}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardHalf]}
            onPress={handleOpenCoach}
            activeOpacity={0.85}
            accessibilityLabel={coachA11yLabel}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#6B4CE6', '#9B59B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <Text style={styles.actionCardEmoji}>🤖</Text>
              <Text style={styles.actionCardTitle}>AI Coach</Text>
              <Text style={styles.actionCardSubtitle}>Ask questions, get coached</Text>
              {(!isSubscribed && !canAccess('ecct_full_program')) && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>PRO</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardHalf]}
            onPress={handleViewAnalytics}
            activeOpacity={0.85}
            accessibilityLabel={analyticsA11yLabel}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#27AE60', '#1ABC9C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <Text style={styles.actionCardEmoji}>📊</Text>
              <Text style={styles.actionCardTitle}>Analytics</Text>
              <Text style={styles.actionCardSubtitle}>ECRS trends & milestones</Text>
              {(!isSubscribed && !canAccess('ecct_full_program')) && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>PRO</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Educational Disclaimer */}
        <Animated.View entering={FadeInDown.delay(350).duration(600)} style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            ECCT is an educational self-improvement program. It is not therapy, diagnosis, or medical treatment. If you are in crisis, call or text 988.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  console.log('[HomeScreen] rendered');
  const { user } = useAuth();

  if (!user) {
    return <GuestWelcomeScreen />;
  }

  return <TodayDashboard />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dashboardScrollContent: {
    paddingBottom: 100,
  },
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

  // Welcome screen
  welcomeHero: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  welcomeHeroGradient: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  welcomeIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
  },
  welcomeStats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  welcomeStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  welcomeStatNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  welcomeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  welcomeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  welcomeButtonContainer: {
    marginBottom: 12,
  },
  welcomeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  welcomeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  welcomeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createAccountButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createAccountButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  guestButtonContainer: {
    marginBottom: 12,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  welcomeFooter: {
    marginTop: 8,
    marginBottom: 20,
  },
  welcomeFooterText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Dashboard header
  dashboardHeader: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dashboardHeaderGradient: {
    padding: 20,
    gap: 16,
  },
  dashboardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dashboardHeaderText: {
    flex: 1,
    gap: 2,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dayProgressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 4,
  },
  progressRingContainer: {
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 4,
  },
  statChip: {
    alignItems: 'center',
    gap: 2,
  },
  statChipEmoji: {
    fontSize: 18,
  },
  statChipValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statChipLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  statChipDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  overallProgressContainer: {
    gap: 6,
  },
  overallProgressLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  overallProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  overallProgressPercent: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Error
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Onboarding card
  onboardingCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  onboardingCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onboardingCardContent: {
    flex: 1,
    gap: 4,
  },
  onboardingCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onboardingCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  onboardingCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  onboardingCardButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C42',
  },
  onboardingCardEmoji: {
    fontSize: 40,
    marginLeft: 12,
  },

  // CTA button
  ctaButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ECRS
  ecrsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ecrsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 110,
    fontWeight: '500',
  },
  ecrsBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.highlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ecrsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  ecrsScore: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    width: 28,
    textAlign: 'right',
  },

  // Action cards
  actionCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardHalf: {
    flex: 1,
  },
  actionCardGradient: {
    padding: 16,
    gap: 4,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  actionCardEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Offline banner
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Empty state
  emptyStateEmoji: {
    fontSize: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Daily Training Card
  dailyCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  dailyCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  dailyCardBadge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dailyCardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  dailyCardDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyCardDurationText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dailyCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 26,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  dailyCardObjective: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  dailyCardButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  dailyCardButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 44,
    gap: 10,
    flexWrap: 'wrap',
  },
  dailyCardButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressStripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  progressStripDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  progressStripValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 24,
    includeFontPadding: false,
  },
  progressStripValueSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressStripLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  weekDotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  weekDotFilled: {
    backgroundColor: colors.primary,
  },

  // Skeleton loading
  skeletonHeader: {
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  skeletonCard: {
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  skeletonSpinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },

  // Program overview link
  programOverviewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    minHeight: 44,
  },
  programOverviewLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
