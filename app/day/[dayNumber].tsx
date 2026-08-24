
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
import CongratulationsModal from '@/components/CongratulationsModal';

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

// ─── Phase colors ─────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  Awareness: '#6B4CE6',
  Regulation: '#3B82F6',
  'Thought Control': '#27AE60',
  Confidence: '#FFB84D',
  Communication: '#9B59B6',
  Resilience: '#E74C3C',
  Integration: '#1ABC9C',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DayDetailScreen() {
  const router = useRouter();
  const { dayNumber } = useLocalSearchParams<{ dayNumber: string }>();
  const dayNum = parseInt(dayNumber || '1', 10);

  console.log('[DayDetail] Screen rendered for day:', dayNum);

  const [content, setContent] = useState<DayContent | null>(null);
  const [progress, setProgress] = useState<DayProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lessonRead, setLessonRead] = useState(false);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [ecrsScores, setEcrsScores] = useState({ emotional_identification: 3, response_control: 3, confidence_composure: 3 });

  const [completing, setCompleting] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState<string[]>([]);

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
      if (progressRes) {
        setProgress(progressRes);
        setLessonRead(progressRes.lesson_read || false);
        setDrillCompleted(progressRes.drill_completed || false);
        setReflectionText(progressRes.reflection_text || '');
      }
      setError(null);
    } catch (err) {
      console.error('[DayDetail] Error fetching day content:', err);
      setError('Unable to load day content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dayNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLessonRead = async () => {
    console.log('[DayDetail] Lesson read toggled:', !lessonRead);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !lessonRead;
    setLessonRead(newVal);
    try {
      await authenticatedPatch(`/api/program/days/${dayNum}`, { lesson_read: newVal });
    } catch (err) {
      console.error('[DayDetail] Error patching lesson_read:', err);
    }
  };

  const handleDrillCompleted = async () => {
    console.log('[DayDetail] Drill completed toggled:', !drillCompleted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !drillCompleted;
    setDrillCompleted(newVal);
    try {
      await authenticatedPatch(`/api/program/days/${dayNum}`, { drill_completed: newVal });
    } catch (err) {
      console.error('[DayDetail] Error patching drill_completed:', err);
    }
  };

  const handleEcrsChange = (key: keyof typeof ecrsScores, val: number) => {
    console.log('[DayDetail] ECRS score changed:', key, val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEcrsScores(prev => ({ ...prev, [key]: val }));
  };

  const handleCompleteDay = async () => {
    console.log('[DayDetail] Complete Day tapped for day:', dayNum);
    if (!lessonRead || !drillCompleted) {
      Alert.alert('Not Ready', 'Please mark the lesson as read and complete the drill before finishing the day.');
      return;
    }
    setCompleting(true);
    try {
      const payload = {
        reflection_text: reflectionText || undefined,
        emotional_identification: ecrsScores.emotional_identification,
        response_control: ecrsScores.response_control,
        confidence_composure: ecrsScores.confidence_composure,
      };
      console.log('[DayDetail] POST /api/program/days/:dayNum/complete payload:', payload);
      const res = await authenticatedPost<CompleteResponse>(`/api/program/days/${dayNum}/complete`, payload);
      console.log('[DayDetail] Day completed! XP earned:', res.xp_earned, 'Achievements:', res.achievements_unlocked);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setXpEarned(res.xp_earned || 0);
      setAchievementsUnlocked(res.achievements_unlocked || []);
      setShowCongrats(true);
    } catch (err) {
      console.error('[DayDetail] Error completing day:', err);
      Alert.alert('Error', 'Unable to complete the day. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleCongratsClose = () => {
    console.log('[DayDetail] Congratulations modal closed — navigating back');
    setShowCongrats(false);
    router.back();
  };

  const canComplete = lessonRead && drillCompleted;
  const phaseColor = content ? (PHASE_COLORS[content.phase] || colors.primary) : colors.primary;
  const weekText = content ? `Week ${content.week}` : '';
  const dayTitle = content?.title || `Day ${dayNum}`;

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

  if (error || !content) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.errorText}>{error || 'Content not found.'}</Text>
          <TouchableOpacity onPress={() => { console.log('[DayDetail] Retry tapped'); fetchData(); }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAlreadyCompleted = progress?.completed || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[phaseColor, phaseColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                console.log('[DayDetail] Back button tapped');
                router.back();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerMeta}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>{content.phase}</Text>
              </View>
              <Text style={styles.weekText}>{weekText}</Text>
            </View>
            <Text style={styles.dayNumber}>Day {dayNum}</Text>
            <Text style={styles.dayTitle}>{dayTitle}</Text>
            {isAlreadyCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓ Completed</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Lesson Content */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: phaseColor + '20' }]}>
              <IconSymbol ios_icon_name="book.fill" android_material_icon_name="book" size={20} color={phaseColor} />
            </View>
            <Text style={styles.sectionTitle}>Today's Lesson</Text>
          </View>
          <Text style={styles.lessonContent}>{content.lesson_content}</Text>

          {/* Audio placeholder */}
          <View style={styles.audioCard}>
            <View style={styles.audioLeft}>
              <View style={styles.audioIconBg}>
                <IconSymbol ios_icon_name="headphones" android_material_icon_name="headset" size={22} color="#8E8E93" />
              </View>
              <View>
                <Text style={styles.audioTitle}>Audio Coming Soon</Text>
                <Text style={styles.audioSubtitle}>Guided audio for this lesson</Text>
              </View>
            </View>
            <View style={styles.audioPlayButton}>
              <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={18} color="#8E8E93" />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.checkRow, lessonRead && styles.checkRowChecked]}
            onPress={handleLessonRead}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, lessonRead && { backgroundColor: '#27AE60', borderColor: '#27AE60' }]}>
              {lessonRead && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkLabel, lessonRead && styles.checkLabelChecked]}>
              I've read and understood this lesson
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Guided Drill */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#3B82F620' }]}>
              <IconSymbol ios_icon_name="figure.walk" android_material_icon_name="directions-walk" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Guided Drill</Text>
          </View>
          <Text style={styles.drillContent}>{content.drill_instructions}</Text>

          <TouchableOpacity
            style={[styles.checkRow, drillCompleted && styles.checkRowChecked]}
            onPress={handleDrillCompleted}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, drillCompleted && { backgroundColor: '#27AE60', borderColor: '#27AE60' }]}>
              {drillCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkLabel, drillCompleted && styles.checkLabelChecked]}>
              I've completed the drill
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Real-World Challenge */}
        {content.challenge ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.section, styles.challengeSection]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FFB84D20' }]}>
                <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="flash-on" size={20} color="#FFB84D" />
              </View>
              <Text style={styles.sectionTitle}>Real-World Challenge</Text>
            </View>
            <Text style={styles.challengeContent}>{content.challenge}</Text>
          </Animated.View>
        ) : null}

        {/* Reflection */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#9B59B620' }]}>
              <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color="#9B59B6" />
            </View>
            <Text style={styles.sectionTitle}>Reflection</Text>
          </View>
          {content.reflection_prompt ? (
            <Text style={styles.reflectionPrompt}>{content.reflection_prompt}</Text>
          ) : null}
          <TextInput
            style={styles.reflectionInput}
            placeholder="Write your reflection here..."
            placeholderTextColor={colors.textSecondary}
            value={reflectionText}
            onChangeText={setReflectionText}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            onFocus={() => console.log('[DayDetail] Reflection input focused')}
          />
        </Animated.View>

        {/* ECRS Check-in */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
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
        </Animated.View>

        {/* Complete Day Button */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <TouchableOpacity
            style={[styles.completeButton, (!canComplete || completing || isAlreadyCompleted) && styles.completeButtonDisabled]}
            onPress={handleCompleteDay}
            disabled={!canComplete || completing || isAlreadyCompleted}
            activeOpacity={0.85}
          >
            {completing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isAlreadyCompleted ? (
              <>
                <Text style={styles.completeButtonEmoji}>✓</Text>
                <Text style={styles.completeButtonText}>Day Completed</Text>
              </>
            ) : (
              <>
                <LinearGradient
                  colors={canComplete ? ['#27AE60', '#1ABC9C'] : [colors.border, colors.border]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.completeButtonGradient}
                >
                  <Text style={styles.completeButtonEmoji}>🏆</Text>
                  <Text style={styles.completeButtonText}>Complete Day {dayNum}</Text>
                </LinearGradient>
              </>
            )}
          </TouchableOpacity>
          {!canComplete && !isAlreadyCompleted && (
            <Text style={styles.completeHint}>Complete the lesson and drill to unlock this button</Text>
          )}
        </Animated.View>
      </ScrollView>

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
  header: {
    padding: 20,
    paddingTop: 16,
    gap: 6,
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  challengeSection: {
    backgroundColor: '#FFFBEA',
    borderColor: '#FFB84D',
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
  },
  lessonContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  audioIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  audioSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  checkRowChecked: {
    backgroundColor: '#F0FFF4',
    borderColor: '#27AE60',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  checkLabelChecked: {
    color: '#27AE60',
  },
  drillContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  challengeContent: {
    fontSize: 15,
    color: '#B7791F',
    lineHeight: 24,
    fontWeight: '500',
  },
  reflectionPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
    backgroundColor: colors.highlight,
    borderRadius: 10,
    padding: 12,
  },
  reflectionInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    lineHeight: 22,
  },
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
  completeButton: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 56,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  completeButtonEmoji: {
    fontSize: 22,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },
});
