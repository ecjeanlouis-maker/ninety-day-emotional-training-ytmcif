
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
import { authenticatedGet } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcrsTrendPoint {
  date: string;
  emotional_identification: number;
  response_control: number;
  confidence_composure: number;
  overall_score: number;
}

interface EmotionFrequency {
  emotion: string;
  count: number;
}

interface WeeklyCompletion {
  week_start: string;
  days_completed: number;
  total_days: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earned_at?: string;
  icon: string;
}

interface AnalyticsData {
  ecrs_trend: EcrsTrendPoint[];
  emotion_frequency: EmotionFrequency[];
  weekly_completion: WeeklyCompletion[];
  milestones: Milestone[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earned_at?: string;
  icon: string;
  category: string;
}

interface ProgressData {
  current_streak: number;
  longest_streak: number;
  total_days_completed: number;
  total_xp: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  console.log('[Analytics] Screen rendered');
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('[Analytics] Fetching analytics data');
    try {
      const [analyticsRes, achievementsRes, progressRes] = await Promise.all([
        authenticatedGet<AnalyticsData>('/api/analytics'),
        authenticatedGet<{ achievements: Achievement[] }>('/api/achievements').catch(() => ({ achievements: [] })),
        authenticatedGet<ProgressData>('/api/progress').catch(() => null),
      ]);
      console.log('[Analytics] Data loaded — ECRS trend points:', analyticsRes.ecrs_trend?.length);
      console.log('[Analytics] Achievements loaded:', achievementsRes.achievements?.length);
      setAnalytics(analyticsRes);
      setAchievements(achievementsRes.achievements || []);
      setProgress(progressRes);
      setError(null);
    } catch (err) {
      console.error('[Analytics] Error fetching analytics:', err);
      setError('Unable to load analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    console.log('[Analytics] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStreak = progress?.current_streak ?? 0;
  const longestStreak = progress?.longest_streak ?? 0;
  const totalDays = progress?.total_days_completed ?? 0;
  const totalXP = progress?.total_xp ?? 0;

  const ecrsPoints = analytics?.ecrs_trend || [];
  const emotionFreq = analytics?.emotion_frequency || [];
  const weeklyComp = analytics?.weekly_completion || [];

  const maxEmotionCount = emotionFreq.length > 0 ? Math.max(...emotionFreq.map(e => e.count)) : 1;
  const maxEcrsScore = 5;

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
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={['#27AE60', '#1ABC9C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                console.log('[Analytics] Back button tapped');
                router.back();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Progress Analytics</Text>
            <Text style={styles.headerSubtitle}>Your ECCT journey at a glance</Text>
          </LinearGradient>
        </Animated.View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => { console.log('[Analytics] Retry tapped'); fetchData(); }} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Streak & Stats Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsCard}>
          <Text style={styles.cardTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>{longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={styles.statValue}>{totalDays}</Text>
              <Text style={styles.statLabel}>Days Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={styles.statValue}>{totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
        </Animated.View>

        {/* ECRS Trend */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>ECRS Score Trend</Text>
          <Text style={styles.cardSubtitle}>Last {ecrsPoints.length} assessments</Text>
          {ecrsPoints.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Complete assessments to see your trend</Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              {/* Simple bar chart */}
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Emotional ID</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.legendText}>Response Control</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
                  <Text style={styles.legendText}>Confidence</Text>
                </View>
              </View>
              <View style={styles.barsContainer}>
                {ecrsPoints.slice(-8).map((point, idx) => {
                  const ei = (point.emotional_identification / maxEcrsScore) * 100;
                  const rc = (point.response_control / maxEcrsScore) * 100;
                  const cc = (point.confidence_composure / maxEcrsScore) * 100;
                  const eiWidth = `${ei}%`;
                  const rcWidth = `${rc}%`;
                  const ccWidth = `${cc}%`;
                  const dateLabel = new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                  return (
                    <View key={idx} style={styles.barGroup}>
                      <Text style={styles.barLabel}>{dateLabel}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: eiWidth, backgroundColor: colors.primary }]} />
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: rcWidth, backgroundColor: '#3B82F6' }]} />
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: ccWidth, backgroundColor: '#27AE60' }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Emotion Frequency */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Top Emotions (Last 30 Days)</Text>
          {emotionFreq.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Log emotions to see your frequency chart</Text>
            </View>
          ) : (
            <View style={styles.emotionBars}>
              {emotionFreq.slice(0, 8).map((item, idx) => {
                const barWidth = `${(item.count / maxEmotionCount) * 100}%`;
                const barColor = idx % 3 === 0 ? colors.primary : idx % 3 === 1 ? '#3B82F6' : '#27AE60';
                return (
                  <View key={item.emotion} style={styles.emotionBarRow}>
                    <Text style={styles.emotionBarLabel}>{item.emotion}</Text>
                    <View style={styles.emotionBarTrack}>
                      <View style={[styles.emotionBarFill, { width: barWidth, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.emotionBarCount}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Weekly Completion */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Completion</Text>
          <Text style={styles.cardSubtitle}>Last 8 weeks</Text>
          {weeklyComp.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Complete days to see your weekly progress</Text>
            </View>
          ) : (
            <View style={styles.weeklyGrid}>
              {weeklyComp.slice(-8).map((week, idx) => {
                const rate = week.total_days > 0 ? week.days_completed / week.total_days : 0;
                const ratePercent = Math.round(rate * 100);
                const weekLabel = new Date(week.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const cellColor = rate >= 0.8 ? '#27AE60' : rate >= 0.5 ? '#FFB84D' : rate > 0 ? '#3B82F6' : colors.border;

                return (
                  <View key={idx} style={styles.weekCell}>
                    <View style={[styles.weekCellBar, { backgroundColor: cellColor, height: Math.max(8, rate * 60) }]} />
                    <Text style={styles.weekCellLabel}>{weekLabel}</Text>
                    <Text style={styles.weekCellPercent}>{ratePercent}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Achievements */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Achievements</Text>
          {achievements.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Complete days and milestones to earn achievements</Text>
            </View>
          ) : (
            <View style={styles.achievementsGrid}>
              {achievements.map(achievement => {
                const isEarned = achievement.earned;
                return (
                  <View key={achievement.id} style={[styles.achievementBadge, !isEarned && styles.achievementBadgeLocked]}>
                    <Text style={[styles.achievementIcon, !isEarned && styles.achievementIconLocked]}>
                      {achievement.icon || '🏅'}
                    </Text>
                    <Text style={[styles.achievementTitle, !isEarned && styles.achievementTitleLocked]} numberOfLines={2}>
                      {achievement.title}
                    </Text>
                    {isEarned && <Text style={styles.achievementEarned}>Earned</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
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
    gap: 16,
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
    padding: 20,
    gap: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
  },
  emptySection: {
    alignItems: 'center',
    padding: 20,
  },
  emptySectionText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  chartContainer: {
    gap: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  barsContainer: {
    gap: 10,
  },
  barGroup: {
    gap: 4,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.highlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  emotionBars: {
    gap: 10,
  },
  emotionBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionBarLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    width: 90,
  },
  emotionBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.highlight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  emotionBarCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    width: 24,
    textAlign: 'right',
  },
  weeklyGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  weekCellBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 8,
  },
  weekCellLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  weekCellPercent: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementBadge: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementBadgeLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementIconLocked: {
    opacity: 0.4,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  achievementTitleLocked: {
    color: colors.textSecondary,
  },
  achievementEarned: {
    fontSize: 10,
    color: '#27AE60',
    fontWeight: '700',
  },
});
