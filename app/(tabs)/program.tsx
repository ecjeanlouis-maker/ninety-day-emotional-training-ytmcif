
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
import { canAccessDay } from '@/lib/access';
import { trackEvent } from '@/utils/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayContent {
  day_number: number;
  title: string;
  phase: string;
  week: number;
  lesson_content?: string;
  drill_instructions?: string;
  challenge?: string;
  reflection_prompt?: string;
  estimated_time?: string;
  is_premium?: boolean;
}

interface DayProgress {
  day_number: number;
  completed: boolean;
  completed_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES = [
  { key: 'Emotional Control',    label: 'Emotional Control',    color: '#6B4CE6', emoji: '🧘', daysStart: 1,  daysEnd: 12,  description: 'Build awareness and regulation of your emotional responses.' },
  { key: 'Confidence',           label: 'Confidence',           color: '#FFB84D', emoji: '⭐', daysStart: 13, daysEnd: 24,  description: 'Develop unshakeable self-belief and composure under pressure.' },
  { key: 'Anger Management',     label: 'Anger Management',     color: '#E74C3C', emoji: '🌊', daysStart: 25, daysEnd: 36,  description: 'Transform anger into constructive energy and calm responses.' },
  { key: 'Stress Management',    label: 'Stress Management',    color: '#3B82F6', emoji: '🍃', daysStart: 37, daysEnd: 48,  description: 'Build resilience and practical tools for managing stress.' },
  { key: 'Social Anxiety',       label: 'Social Anxiety',       color: '#F5A623', emoji: '🤝', daysStart: 49, daysEnd: 60,  description: 'Reduce social fear and build genuine connection skills.' },
  { key: 'Thought Regulation',   label: 'Thought Regulation',   color: '#27AE60', emoji: '🧠', daysStart: 61, daysEnd: 72,  description: 'Master your inner narrative and break unhelpful thought patterns.' },
  { key: 'Organization Skills',  label: 'Organization Skills',  color: '#1ABC9C', emoji: '📋', daysStart: 73, daysEnd: 81,  description: 'Build practical systems for clarity, focus, and sustainable productivity.' },
  { key: 'Communication Skills', label: 'Communication Skills', color: '#9B59B6', emoji: '💬', daysStart: 82, daysEnd: 90,  description: 'Communicate clearly, assertively, and with genuine empathy.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgramScreen() {
  console.log('[Program] Screen rendered');
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canAccess, entitlement } = useUser();

  const [days, setDays] = useState<DayContent[]>([]);
  const [progress, setProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // Use entitlement as authoritative source when loaded; fall back to RC/canAccess
  const hasDays8to90Access = entitlement !== null
    ? entitlement.days_8_90_access
    : (isSubscribed || canAccess('ecct_full_program'));
  const hasFullAccess = hasDays8to90Access;

  const fetchData = useCallback(async () => {
    console.log('[Program] Fetching program content and progress');
    try {
      if (user) {
        const [contentRes, progressRes] = await Promise.all([
          authenticatedGet<{ days: DayContent[] }>('/api/program/content'),
          authenticatedGet<{ days: DayProgress[] }>('/api/program/days').catch(() => ({ days: [] })),
        ]);
        console.log('[Program] Content loaded:', contentRes.days?.length, 'days');
        console.log('[Program] Progress loaded:', progressRes.days?.length, 'entries');
        setDays(contentRes.days || []);
        setProgress(progressRes.days || []);
      } else {
        console.log('[Program] Guest fetch — using catalog endpoint');
        const catalogRes = await fetch(`${BACKEND_URL}/api/program/catalog`);
        if (catalogRes.ok) {
          const data = await catalogRes.json();
          setDays(data.days || []);
        }
      }
      setError(null);
    } catch (err) {
      console.error('[Program] Error fetching data:', err);
      setError('Unable to load program. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-expand the week containing the current day
  useEffect(() => {
    if (progress.length === 0 && days.length === 0) return;
    const completedCount = progress.filter(p => p.completed).length;
    const currentDay = Math.min(completedCount + 1, 90);
    const currentDayContent = days.find(d => d.day_number === currentDay);
    if (currentDayContent) {
      const currentWeek = currentDayContent.week || Math.ceil(currentDay / 7);
      setExpandedWeeks(prev => new Set([...prev, currentWeek]));
    }
  }, [progress, days]);

  const handleRefresh = () => {
    console.log('[Program] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchData();
  };

  const handlePhaseSelect = (phase: string | null) => {
    console.log('[Program] Phase selected:', phase);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhase(phase === selectedPhase ? null : phase);
  };

  const handleWeekToggle = (week: number) => {
    console.log('[Program] Week toggled:', week);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  };

  const handleDayPress = (dayNumber: number) => {
    console.log('[Program] Day tapped:', dayNumber, '— hasDays8to90Access:', hasDays8to90Access);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      const lessonTitle = days.find(d => d.day_number === dayNumber)?.title ?? '';
      console.log('[Program] Guest tapped day', dayNumber, '— routing to auth with returnTo');
      trackEvent('lesson_signin_required', { day_number: dayNumber });
      router.push(`/auth?returnTo=day_${dayNumber}&lessonTitle=${encodeURIComponent(lessonTitle)}`);
      return;
    }
    // Use entitlement-aware canAccessDay check
    if (!canAccessDay(dayNumber, hasDays8to90Access)) {
      console.log('[Program] Day', dayNumber, 'locked (premium required) — pushing paywall');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    // Progression lock: check if previous day is completed
    const lastCompleted = progress.filter(p => p.completed).length;
    if (dayNumber > lastCompleted + 1) {
      console.log('[Program] Day', dayNumber, 'locked (progression) — must complete day', lastCompleted + 1, 'first');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    console.log('[Program] Routing to day:', dayNumber);
    trackEvent('day_start_routed', { day_number: dayNumber });
    router.push(`/day/${dayNumber}`);
  };

  const getDayStatus = (dayNumber: number): 'completed' | 'current' | 'locked' | 'progression_locked' | 'available' => {
    const dayProg = progress.find(p => p.day_number === dayNumber);
    if (dayProg?.completed) return 'completed';
    // Premium lock: days 8-90 without access
    if (!canAccessDay(dayNumber, hasDays8to90Access)) return 'locked';
    const lastCompleted = progress.filter(p => p.completed).length;
    // Progression lock: can't skip ahead
    if (dayNumber > lastCompleted + 1) return 'progression_locked';
    if (dayNumber === lastCompleted + 1) return 'current';
    return 'available';
  };

  const filteredDays = selectedPhase
    ? days.filter(d => d.phase === selectedPhase)
    : days;

  // Group by week
  const weeks: Record<number, DayContent[]> = {};
  filteredDays.forEach(day => {
    const w = day.week || Math.ceil(day.day_number / 7);
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push(day);
  });
  const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);

  const completedCount = progress.filter(p => p.completed).length;
  const currentDayNumber = Math.min(completedCount + 1, 90);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading program...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>90-Day ECCT Program</Text>
            <Text style={styles.headerSubtitle}>Emotional Control & Confidence Training</Text>
            <View style={styles.headerStats}>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{days.length}</Text>
                <Text style={styles.headerStatLabel}>Days</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{PHASES.length}</Text>
                <Text style={styles.headerStatLabel}>Phases</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{progress.filter(p => p.completed).length}</Text>
                <Text style={styles.headerStatLabel}>Completed</Text>
              </View>
            </View>
            {user && days.length > 0 && (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => {
                  console.log('[Program] Resume Day button tapped — day:', currentDayNumber);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/day/${currentDayNumber}`);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.resumeButtonText}>▶ Resume Day {currentDayNumber}</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Phase selector */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phaseScrollContent}
            style={styles.phaseScroll}
          >
            <TouchableOpacity
              style={[styles.phasePill, !selectedPhase && styles.phasePillActive]}
              onPress={() => handlePhaseSelect(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.phasePillText, !selectedPhase && styles.phasePillTextActive]}>All</Text>
            </TouchableOpacity>
            {PHASES.map(phase => {
              const isActive = selectedPhase === phase.key;
              return (
                <TouchableOpacity
                  key={phase.key}
                  style={[styles.phasePill, isActive && { backgroundColor: phase.color, borderColor: phase.color }]}
                  onPress={() => handlePhaseSelect(phase.key)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Filter by ${phase.label} phase, Days ${phase.daysStart} to ${phase.daysEnd}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.phasePillEmoji}>{phase.emoji}</Text>
                  <Text style={[styles.phasePillText, isActive && styles.phasePillTextActive]}>{phase.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => { console.log('[Program] Retry tapped'); fetchData(); }} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Guest sign-in nudge banner */}
        {!user && (
          <Animated.View entering={FadeInDown.delay(125).duration(500)}>
            <View style={styles.guestNudgeBanner}>
              <View style={styles.guestNudgeContent}>
                <Text style={styles.guestNudgeText}>
                  Sign in to save your progress and unlock your full 90-day journey.
                </Text>
                <TouchableOpacity
                  style={styles.guestNudgeButton}
                  onPress={() => {
                    console.log('[Program] Guest nudge Sign In tapped');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/auth');
                  }}
                  activeOpacity={0.85}
                  accessibilityLabel="Sign in to save progress"
                  accessibilityRole="button"
                >
                  <Text style={styles.guestNudgeButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Premium upgrade banner — shown when entitlement is loaded and days 8-90 are locked */}
        {!hasDays8to90Access && user && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => {
                console.log('[Program] Upgrade banner tapped');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/paywall');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBannerText}>🔒 Days 8–90 require Premium. Upgrade to unlock the full program.</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Phase Overview Cards */}
        <Animated.View entering={FadeInDown.delay(175).duration(500)}>
          <Text style={styles.sectionLabel}>8 Phases</Text>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {PHASES.map((phase, phaseIdx) => {
              const phaseDays = days.filter(d => d.phase === phase.key);
              const phaseCompleted = phaseDays.filter(d => getDayStatus(d.day_number) === 'completed').length;
              const phaseTotal = phaseDays.length || (phase.daysEnd - phase.daysStart + 1);
              const phaseProgress = phaseTotal > 0 ? phaseCompleted / phaseTotal : 0;
              const isPhaseCompleted = phaseCompleted === phaseTotal && phaseTotal > 0;
              const isCurrentPhase = !isPhaseCompleted && phaseDays.some(d => getDayStatus(d.day_number) === 'current');
              const isPremiumLocked = !hasDays8to90Access && phase.daysStart > 7;
              const isProgressionLocked = !isPremiumLocked && phaseDays.length > 0 && phaseDays.every(d => {
                const s = getDayStatus(d.day_number);
                return s === 'progression_locked';
              });
              const progressBarWidth = `${Math.round(phaseProgress * 100)}%` as `${number}%`;
              const phaseNumber = phaseIdx + 1;

              const firstAvailableDay = phaseDays.find(d => {
                const s = getDayStatus(d.day_number);
                return s === 'current' || s === 'available';
              })?.day_number ?? phaseDays[0]?.day_number ?? phase.daysStart;

              const ctaLabel = !user
                ? 'Sign in to start'
                : isPhaseCompleted
                  ? 'Review'
                  : isCurrentPhase
                    ? 'Continue'
                    : (isPremiumLocked || isProgressionLocked)
                      ? 'Locked'
                      : 'Start';

              const statusText = !user
                ? ''
                : isPhaseCompleted
                  ? 'Completed ✓'
                  : isCurrentPhase
                    ? 'Current →'
                    : (isPremiumLocked || isProgressionLocked)
                      ? 'Locked 🔒'
                      : '';

              const statusColor = isPhaseCompleted
                ? '#27AE60'
                : isCurrentPhase
                  ? colors.primary
                  : '#8E8E93';

              const isLocked = isPremiumLocked || isProgressionLocked;
              const progressLabel = `${phaseCompleted}/${phaseTotal} · ${Math.round(phaseProgress * 100)}%`;
              const dayRangeText = `Days ${phase.daysStart}–${phase.daysEnd}`;
              const accessLabel = `${phase.label}, ${dayRangeText}, ${progressLabel}, ${statusText || 'Not started'}`;
              const ctaAccessLabel = `${ctaLabel} ${phase.label}`;

              const handleCardPress = () => {
                console.log('[Program] Phase card tapped:', phase.key, '— isPremiumLocked:', isPremiumLocked, 'isProgressionLocked:', isProgressionLocked);
                trackEvent('program_card_opened', { phase_number: phaseNumber, phase_name: phase.key });
                if (!user) {
                  console.log('[Program] Guest tapped phase card:', phase.key, '— routing to auth with returnTo');
                  trackEvent('lesson_signin_required', { day_number: firstAvailableDay });
                  router.push(`/auth?returnTo=day_${firstAvailableDay}`);
                  return;
                }
                if (isPremiumLocked) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  router.push('/paywall');
                  return;
                }
                if (isProgressionLocked) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handlePhaseSelect(phase.key);
                console.log('[Program] Routing to first available day:', firstAvailableDay, 'for phase:', phase.key);
                trackEvent('day_start_routed', { day_number: firstAvailableDay });
                router.push(`/day/${firstAvailableDay}`);
              };

              return (
                <TouchableOpacity
                  key={phase.key}
                  style={[
                    styles.programCard,
                    isCurrentPhase && { borderColor: phase.color, borderWidth: 2 },
                  ]}
                  onPress={handleCardPress}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={accessLabel}
                >
                  {/* Header row: phase badge + PRO badge */}
                  <View style={styles.programCardHeader}>
                    <View style={[styles.programCardPhaseBadge, { backgroundColor: phase.color + '20' }]}>
                      <Text style={[styles.programCardPhaseBadgeText, { color: phase.color }]}>
                        Phase {phaseNumber}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {statusText ? (
                        <Text style={[styles.programCardStatusBadge, { color: statusColor }]}>
                          {statusText}
                        </Text>
                      ) : null}
                      {isPremiumLocked ? (
                        <View style={styles.programCardProBadge}>
                          <Text style={styles.programCardProBadgeText}>PRO</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Emoji + Title */}
                  <View style={styles.programCardTitleRow}>
                    <Text style={styles.programCardEmoji}>{phase.emoji}</Text>
                    <Text style={styles.programCardTitle}>{phase.label}</Text>
                  </View>

                  {/* Purpose */}
                  <Text style={styles.programCardPurpose} numberOfLines={2}>
                    {phase.description}
                  </Text>

                  {/* Meta: day range */}
                  <View style={styles.programCardMeta}>
                    <Text style={styles.programCardDayRange}>{dayRangeText}</Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.programCardProgressRow}>
                    <View style={styles.programCardProgressTrack}>
                      <View
                        style={[
                          styles.programCardProgressFill,
                          { width: progressBarWidth, backgroundColor: phase.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.programCardProgressLabel}>{progressLabel}</Text>
                  </View>

                  {/* CTA button */}
                  <TouchableOpacity
                    style={[
                      styles.programCardCTA,
                      isLocked ? styles.programCardCTALocked : { backgroundColor: phase.color },
                    ]}
                    onPress={handleCardPress}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={ctaAccessLabel}
                  >
                    <Text style={[styles.programCardCTAText, isLocked && styles.programCardCTATextLocked]}>
                      {ctaLabel}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Week accordions */}
        {weekNumbers.map((week, weekIdx) => {
          const weekDays = weeks[week];
          const isExpanded = expandedWeeks.has(week);
          const weekCompleted = weekDays.every(d => getDayStatus(d.day_number) === 'completed');
          const weekPhase = weekDays[0]?.phase || '';
          const phaseConfig = PHASES.find(p => p.key === weekPhase);
          const phaseColor = phaseConfig?.color || colors.primary;

          return (
            <Animated.View
              key={week}
              entering={FadeInDown.delay(200 + weekIdx * 50).duration(400)}
              style={styles.weekContainer}
            >
              <TouchableOpacity
                style={styles.weekHeader}
                onPress={() => handleWeekToggle(week)}
                activeOpacity={0.8}
              >
                <View style={[styles.weekColorBar, { backgroundColor: phaseColor }]} />
                <View style={styles.weekHeaderContent}>
                  <Text style={styles.weekTitle}>Week {week}</Text>
                  {weekPhase ? (
                    <Text style={[styles.weekPhase, { color: phaseColor }]}>{weekPhase}</Text>
                  ) : null}
                </View>
                <View style={styles.weekHeaderRight}>
                  {weekCompleted && (
                    <View style={styles.weekCompletedBadge}>
                      <Text style={styles.weekCompletedText}>✓</Text>
                    </View>
                  )}
                  <IconSymbol
                    ios_icon_name={isExpanded ? 'chevron.up' : 'chevron.down'}
                    android_material_icon_name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.weekDays}>
                  {weekDays.map(day => {
                    const status = getDayStatus(day.day_number);
                    const isLocked = status === 'locked';
                    const isProgressionLocked = status === 'progression_locked';
                    const isCompleted = status === 'completed';
                    const isCurrent = status === 'current';
                    const isAnyLocked = isLocked || isProgressionLocked;

                    const statusIcon = isCompleted ? '✓' : isLocked ? '🔒' : isProgressionLocked ? '🔒' : isCurrent ? '▶' : '';
                    const statusColor = isCompleted ? '#27AE60' : isAnyLocked ? '#8E8E93' : isCurrent ? colors.primary : colors.textSecondary;
                    const numberBgColor = isCompleted ? '#27AE60' : isAnyLocked ? '#8E8E93' : phaseColor;

                    const lastCompleted = progress.filter(p => p.completed).length;
                    const progressionStatusText = isProgressionLocked
                      ? `Complete Day ${lastCompleted + 1} first`
                      : '';
                    const statusText = !user
                      ? 'Sign in to start'
                      : isCompleted
                        ? 'Completed'
                        : isLocked
                          ? 'Premium'
                          : isProgressionLocked
                            ? progressionStatusText
                            : isCurrent
                              ? 'Continue'
                              : 'Available';

                    return (
                      <TouchableOpacity
                        key={day.day_number}
                        style={[
                          styles.dayCard,
                          isCompleted && styles.dayCardCompleted,
                          isCurrent && styles.dayCardCurrent,
                          isAnyLocked && styles.dayCardLocked,
                        ]}
                        onPress={() => handleDayPress(day.day_number)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.dayNumber, { backgroundColor: numberBgColor }]}>
                          <Text style={styles.dayNumberText}>{day.day_number}</Text>
                        </View>
                        <View style={styles.dayInfo}>
                          <Text style={[styles.dayTitle, isAnyLocked && styles.dayTitleLocked]} numberOfLines={2}>
                            {day.title || `Day ${day.day_number}`}
                          </Text>
                          <Text style={[styles.dayStatus, { color: statusColor }]}>
                            {statusText}
                          </Text>
                        </View>
                        <Text style={styles.dayStatusIcon}>{statusIcon}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          );
        })}

        {days.length === 0 && !loading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📚</Text>
            <Text style={styles.emptyStateTitle}>Program Coming Soon</Text>
            <Text style={styles.emptyStateSubtitle}>The 90-day program content is being prepared. Check back soon!</Text>
          </View>
        )}
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
    paddingBottom: 100,
    gap: 12,
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
  header: {
    padding: 24,
    gap: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  headerStat: {
    alignItems: 'center',
    gap: 2,
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  resumeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  phaseScroll: {
    marginTop: 4,
  },
  phaseScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 6,
  },
  phasePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  phasePillEmoji: {
    fontSize: 14,
  },
  phasePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  phasePillTextActive: {
    color: '#FFFFFF',
  },
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
  upgradeBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FFB84D',
  },
  upgradeBannerText: {
    fontSize: 13,
    color: '#B7791F',
    fontWeight: '600',
    textAlign: 'center',
  },
  weekContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  weekColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  weekHeaderContent: {
    flex: 1,
    gap: 2,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  weekPhase: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekCompletedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekCompletedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  weekDays: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCardCompleted: {
    backgroundColor: '#F0FFF4',
  },
  dayCardCurrent: {
    backgroundColor: '#F0EBFF',
  },
  dayCardLocked: {
    opacity: 0.6,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayInfo: {
    flex: 1,
    gap: 2,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  dayTitleLocked: {
    color: colors.textSecondary,
  },
  dayStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayStatusIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyStateEmoji: {
    fontSize: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  programCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programCardPhaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  programCardPhaseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  programCardStatusBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  programCardStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  programCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programCardEmoji: {
    fontSize: 26,
  },
  programCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  programCardPurpose: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: '400',
  },
  programCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programCardDayRange: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  programCardProgressRow: {
    gap: 6,
  },
  programCardProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.highlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  programCardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  programCardProgressLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  programCardCTA: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  programCardCTAText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  programCardCTALocked: {
    backgroundColor: colors.border,
  },
  programCardCTATextLocked: {
    color: colors.textSecondary,
  },
  programCardProBadge: {
    backgroundColor: '#FFB84D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  programCardProBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Guest nudge banner
  guestNudgeBanner: {
    marginHorizontal: 16,
    backgroundColor: colors.highlight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestNudgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestNudgeText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  guestNudgeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestNudgeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
