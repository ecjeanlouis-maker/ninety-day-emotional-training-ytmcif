
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
        const contentRes = await fetch(`${BACKEND_URL}/api/program/content`);
        if (contentRes.ok) {
          const data = await contentRes.json();
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
      console.log('[Program] Guest tapped day — pushing auth');
      router.push('/auth');
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phaseCardsContent}
            style={styles.phaseCardsScroll}
            accessibilityLabel="Phase overview — scroll to see all 8 phases"
          >
            {PHASES.map((phase) => {
              const phaseDays = days.filter(d => d.phase === phase.key);
              const phaseCompleted = phaseDays.filter(d => getDayStatus(d.day_number) === 'completed').length;
              const phaseTotal = phaseDays.length || (phase.daysEnd - phase.daysStart + 1);
              const phaseProgress = phaseTotal > 0 ? phaseCompleted / phaseTotal : 0;
              const isPhaseCompleted = phaseCompleted === phaseTotal && phaseTotal > 0;
              const isCurrentPhase = !isPhaseCompleted && phaseDays.some(d => getDayStatus(d.day_number) === 'current');
              const isLocked = phaseDays.length > 0 && phaseDays.every(d => getDayStatus(d.day_number) === 'locked' || getDayStatus(d.day_number) === 'progression_locked');
              const progressBarWidth = `${Math.round(phaseProgress * 100)}%` as `${number}%`;
              const phaseCardBorderStyle = isCurrentPhase ? { borderColor: phase.color, borderWidth: 2 } : {};
              const phaseCardBgStyle = isPhaseCompleted ? styles.phaseCardCompleted : {};
              const completedLabel = isPhaseCompleted ? ', completed' : isCurrentPhase ? ', current phase' : isLocked ? ', locked' : '';
              const accessLabel = `${phase.label}, Days ${phase.daysStart} to ${phase.daysEnd}, ${phaseCompleted} of ${phaseTotal} days completed${completedLabel}`;

              return (
                <TouchableOpacity
                  key={phase.key}
                  style={[styles.phaseCard, phaseCardBorderStyle, phaseCardBgStyle]}
                  onPress={() => handlePhaseSelect(selectedPhase === phase.key ? null : phase.key)}
                  activeOpacity={0.85}
                  accessibilityLabel={accessLabel}
                  accessibilityRole="button"
                >
                  <Text style={styles.phaseCardEmoji}>{phase.emoji}</Text>
                  <Text style={styles.phaseCardLabel} numberOfLines={2}>{phase.label}</Text>
                  <Text style={styles.phaseCardRange}>
                    Days {phase.daysStart}
                    {'–'}
                    {phase.daysEnd}
                  </Text>
                  <View style={styles.phaseCardProgressTrack}>
                    <View style={[styles.phaseCardProgressFill, { width: progressBarWidth, backgroundColor: phase.color }]} />
                  </View>
                  <Text style={styles.phaseCardCount}>{phaseCompleted}/{phaseTotal}</Text>
                  {isPhaseCompleted && <Text style={styles.phaseCardDone}>✓</Text>}
                  {isCurrentPhase && <View style={[styles.phaseCardCurrentDot, { backgroundColor: phase.color }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
                    const statusText = isCompleted
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
  phaseCardsScroll: {
    marginTop: 4,
  },
  phaseCardsContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
    paddingBottom: 8,
  },
  phaseCard: {
    width: 110,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    alignItems: 'center',
  },
  phaseCardCompleted: {
    backgroundColor: '#F0FFF4',
    borderColor: '#27AE60',
  },
  phaseCardEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  phaseCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  phaseCardRange: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  phaseCardProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.highlight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  phaseCardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  phaseCardCount: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  phaseCardDone: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '800',
  },
  phaseCardCurrentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
