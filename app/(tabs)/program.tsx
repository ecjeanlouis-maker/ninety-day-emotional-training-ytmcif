
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
  { key: 'Awareness', label: 'Awareness', color: '#6B4CE6', emoji: '👁' },
  { key: 'Regulation', label: 'Regulation', color: '#3B82F6', emoji: '🌊' },
  { key: 'Thought Control', label: 'Thought Control', color: '#27AE60', emoji: '🧠' },
  { key: 'Confidence', label: 'Confidence', color: '#FFB84D', emoji: '⭐' },
  { key: 'Communication', label: 'Communication', color: '#9B59B6', emoji: '💬' },
  { key: 'Resilience', label: 'Resilience', color: '#E74C3C', emoji: '🛡' },
  { key: 'Integration', label: 'Integration', color: '#1ABC9C', emoji: '🔗' },
];

const FREE_DAYS = 3;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgramScreen() {
  console.log('[Program] Screen rendered');
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canAccess } = useUser();

  const [days, setDays] = useState<DayContent[]>([]);
  const [progress, setProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const hasFullAccess = isSubscribed || canAccess('ecct_full_program');

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
    console.log('[Program] Day tapped:', dayNumber, '— hasFullAccess:', hasFullAccess);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      console.log('[Program] Guest tapped day — pushing auth');
      router.push('/auth');
      return;
    }
    if (dayNumber > FREE_DAYS && !hasFullAccess) {
      console.log('[Program] Day', dayNumber, 'locked — pushing paywall');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    router.push(`/day/${dayNumber}`);
  };

  const getDayStatus = (dayNumber: number): 'completed' | 'current' | 'locked' | 'available' => {
    const dayProg = progress.find(p => p.day_number === dayNumber);
    if (dayProg?.completed) return 'completed';
    if (!hasFullAccess && dayNumber > FREE_DAYS) return 'locked';
    const lastCompleted = progress.filter(p => p.completed).length;
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

        {/* Free user banner */}
        {!hasFullAccess && user && (
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
              <Text style={styles.upgradeBannerText}>🔒 Days 4–90 require Premium. Tap to unlock all 90 days.</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

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
                    const isCompleted = status === 'completed';
                    const isCurrent = status === 'current';

                    const statusIcon = isCompleted ? '✓' : isLocked ? '🔒' : isCurrent ? '▶' : '';
                    const statusColor = isCompleted ? '#27AE60' : isLocked ? '#8E8E93' : isCurrent ? colors.primary : colors.textSecondary;

                    return (
                      <TouchableOpacity
                        key={day.day_number}
                        style={[
                          styles.dayCard,
                          isCompleted && styles.dayCardCompleted,
                          isCurrent && styles.dayCardCurrent,
                          isLocked && styles.dayCardLocked,
                        ]}
                        onPress={() => handleDayPress(day.day_number)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.dayNumber, { backgroundColor: isCompleted ? '#27AE60' : isLocked ? '#8E8E93' : phaseColor }]}>
                          <Text style={styles.dayNumberText}>{day.day_number}</Text>
                        </View>
                        <View style={styles.dayInfo}>
                          <Text style={[styles.dayTitle, isLocked && styles.dayTitleLocked]} numberOfLines={2}>
                            {day.title || `Day ${day.day_number}`}
                          </Text>
                          <Text style={[styles.dayStatus, { color: statusColor }]}>
                            {isCompleted ? 'Completed' : isLocked ? 'Premium' : isCurrent ? 'Continue' : 'Available'}
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
});
