
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmotionalCheckin {
  id: string;
  emotion: string;
  intensity: number;
  trigger_note?: string;
  chosen_response?: string;
  notes?: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTIONS = [
  { label: 'Joy', emoji: '😊', color: '#FFB84D' },
  { label: 'Calm', emoji: '😌', color: '#3B82F6' },
  { label: 'Anxious', emoji: '😰', color: '#F5A623' },
  { label: 'Angry', emoji: '😠', color: '#E74C3C' },
  { label: 'Sad', emoji: '😢', color: '#6B7280' },
  { label: 'Frustrated', emoji: '😤', color: '#FF6B35' },
  { label: 'Confident', emoji: '💪', color: '#27AE60' },
  { label: 'Overwhelmed', emoji: '😵', color: '#9B59B6' },
  { label: 'Grateful', emoji: '🙏', color: '#1ABC9C' },
  { label: 'Fearful', emoji: '😨', color: '#8E8E93' },
  { label: 'Hopeful', emoji: '🌟', color: '#6B4CE6' },
  { label: 'Ashamed', emoji: '😔', color: '#B7791F' },
];

const INTENSITY_LABELS = ['', 'Barely noticeable', 'Mild', 'Moderate', 'Strong', 'Overwhelming'];

const FREE_CHECKINS_PER_DAY = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrackScreen() {
  console.log('[Track] Screen rendered');
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canAccess } = useUser();

  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [triggerNote, setTriggerNote] = useState('');
  const [chosenResponse, setChosenResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkins, setCheckins] = useState<EmotionalCheckin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFullAccess = isSubscribed || canAccess('ecct_full_program');

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      setLoadingCheckins(false);
      return;
    }
    console.log('[Track] Fetching recent check-ins');
    try {
      const res = await authenticatedGet<{ checkins: EmotionalCheckin[] }>('/api/checkins');
      console.log('[Track] Loaded', res.checkins?.length, 'check-ins');
      setCheckins(res.checkins || []);
      setError(null);
    } catch (err) {
      console.error('[Track] Error fetching check-ins:', err);
      setError('Unable to load check-ins.');
    } finally {
      setLoadingCheckins(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const handleRefresh = () => {
    console.log('[Track] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchCheckins();
  };

  const handleEmotionSelect = (emotion: string) => {
    console.log('[Track] Emotion selected:', emotion);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion === selectedEmotion ? null : emotion);
  };

  const handleIntensityChange = (val: number) => {
    console.log('[Track] Intensity changed to:', val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIntensity(val);
  };

  const handleLogEmotion = async () => {
    if (!user) {
      console.log('[Track] Guest tried to log emotion — pushing auth');
      router.push('/auth');
      return;
    }
    if (!selectedEmotion) {
      console.log('[Track] Log attempted without selecting emotion');
      Alert.alert('Select an emotion', 'Please select an emotion before logging.');
      return;
    }

    // Free user limit check
    if (!hasFullAccess) {
      const todayCheckins = checkins.filter(c => {
        const d = new Date(c.created_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      });
      if (todayCheckins.length >= FREE_CHECKINS_PER_DAY) {
        console.log('[Track] Free user hit daily check-in limit — pushing paywall');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push('/paywall');
        return;
      }
    }

    console.log('[Track] Logging emotion:', selectedEmotion, 'intensity:', intensity);
    setSubmitting(true);
    try {
      const payload = {
        emotion: selectedEmotion,
        intensity,
        trigger_note: triggerNote || undefined,
        chosen_response: chosenResponse || undefined,
        notes: notes || undefined,
      };
      console.log('[Track] POST /api/checkins payload:', payload);
      const newCheckin = await authenticatedPost<EmotionalCheckin>('/api/checkins', payload);
      console.log('[Track] Check-in logged successfully:', newCheckin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCheckins(prev => [newCheckin, ...prev]);
      setSelectedEmotion(null);
      setIntensity(3);
      setTriggerNote('');
      setChosenResponse('');
      setNotes('');
    } catch (err) {
      console.error('[Track] Error logging check-in:', err);
      Alert.alert('Error', 'Unable to log emotion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCheckin = (id: string) => {
    console.log('[Track] Delete check-in tapped:', id);
    Alert.alert('Delete Check-in', 'Are you sure you want to delete this check-in?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[Track] Confirming delete for check-in:', id);
          try {
            await authenticatedDelete(`/api/checkins/${id}`);
            console.log('[Track] Check-in deleted:', id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCheckins(prev => prev.filter(c => c.id !== id));
          } catch (err) {
            console.error('[Track] Error deleting check-in:', err);
            Alert.alert('Error', 'Unable to delete check-in.');
          }
        },
      },
    ]);
  };

  const selectedEmotionConfig = EMOTIONS.find(e => e.label === selectedEmotion);
  const intensityLabel = INTENSITY_LABELS[intensity] || '';
  const intensityBarWidth = `${(intensity / 5) * 100}%`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#FF3B6B', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Emotional Tracking</Text>
            <Text style={styles.headerSubtitle}>Log how you feel and build self-awareness</Text>
          </LinearGradient>
        </Animated.View>

        {/* Guest banner */}
        {!user && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <TouchableOpacity
              style={styles.guestBanner}
              onPress={() => {
                console.log('[Track] Guest banner tapped — pushing auth');
                router.push('/auth');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.guestBannerText}>Sign in to save your emotional tracking history</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Log Emotion Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Log Your Emotion</Text>

          {/* Emotion grid */}
          <View style={styles.emotionGrid}>
            {EMOTIONS.map(emotion => {
              const isSelected = selectedEmotion === emotion.label;
              return (
                <TouchableOpacity
                  key={emotion.label}
                  style={[
                    styles.emotionButton,
                    isSelected && { backgroundColor: emotion.color, borderColor: emotion.color },
                  ]}
                  onPress={() => handleEmotionSelect(emotion.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={[styles.emotionLabel, isSelected && styles.emotionLabelSelected]}>
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Intensity slider */}
          {selectedEmotion && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.intensityContainer}>
              <Text style={styles.intensityTitle}>Intensity Level</Text>
              <View style={styles.intensityButtons}>
                {[1, 2, 3, 4, 5].map(val => {
                  const isActive = intensity === val;
                  const barColor = selectedEmotionConfig?.color || colors.primary;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.intensityButton,
                        isActive && { backgroundColor: barColor, borderColor: barColor },
                      ]}
                      onPress={() => handleIntensityChange(val)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.intensityButtonText, isActive && styles.intensityButtonTextActive]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.intensityLabel}>{intensityLabel}</Text>
              <View style={styles.intensityBarTrack}>
                <View style={[styles.intensityBarFill, { width: intensityBarWidth, backgroundColor: selectedEmotionConfig?.color || colors.primary }]} />
              </View>
            </Animated.View>
          )}

          {/* Optional fields */}
          <TextInput
            style={styles.textInput}
            placeholder="What triggered this feeling? (optional)"
            placeholderTextColor={colors.textSecondary}
            value={triggerNote}
            onChangeText={setTriggerNote}
            multiline
            numberOfLines={2}
            onFocus={() => console.log('[Track] Trigger note input focused')}
          />
          <TextInput
            style={styles.textInput}
            placeholder="What did you choose to do? (optional)"
            placeholderTextColor={colors.textSecondary}
            value={chosenResponse}
            onChangeText={setChosenResponse}
            multiline
            numberOfLines={2}
            onFocus={() => console.log('[Track] Chosen response input focused')}
          />
          <TextInput
            style={styles.textInput}
            placeholder="Additional notes (optional)"
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            onFocus={() => console.log('[Track] Notes input focused')}
          />

          <TouchableOpacity
            style={[styles.logButton, (!selectedEmotion || submitting) && styles.logButtonDisabled]}
            onPress={handleLogEmotion}
            disabled={!selectedEmotion || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color="#FFFFFF" />
                <Text style={styles.logButtonText}>Log Emotion</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Check-ins */}
        {user && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Check-ins</Text>

            {loadingCheckins ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => { console.log('[Track] Retry check-ins tapped'); fetchCheckins(); }} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : checkins.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>💭</Text>
                <Text style={styles.emptyStateText}>No check-ins yet. Log your first emotion above!</Text>
              </View>
            ) : (
              checkins.slice(0, 10).map(checkin => {
                const emotionConfig = EMOTIONS.find(e => e.label === checkin.emotion);
                const checkinIntensityWidth = `${(checkin.intensity / 5) * 100}%`;
                const timeAgoText = timeAgo(checkin.created_at);

                return (
                  <View key={checkin.id} style={styles.checkinCard}>
                    <View style={styles.checkinHeader}>
                      <View style={styles.checkinLeft}>
                        <Text style={styles.checkinEmoji}>{emotionConfig?.emoji || '😐'}</Text>
                        <View style={styles.checkinInfo}>
                          <Text style={styles.checkinEmotion}>{checkin.emotion}</Text>
                          <Text style={styles.checkinTime}>{timeAgoText}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteCheckin(checkin.id)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.checkinIntensityRow}>
                      <Text style={styles.checkinIntensityLabel}>Intensity</Text>
                      <View style={styles.checkinIntensityTrack}>
                        <View style={[styles.checkinIntensityFill, { width: checkinIntensityWidth, backgroundColor: emotionConfig?.color || colors.primary }]} />
                      </View>
                      <Text style={styles.checkinIntensityValue}>{checkin.intensity}/5</Text>
                    </View>
                    {checkin.trigger_note ? (
                      <Text style={styles.checkinNote} numberOfLines={2}>Trigger: {checkin.trigger_note}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </Animated.View>
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
    gap: 16,
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
  guestBanner: {
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestBannerText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
    minHeight: 44,
  },
  emotionEmoji: {
    fontSize: 18,
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emotionLabelSelected: {
    color: '#FFFFFF',
  },
  intensityContainer: {
    gap: 8,
  },
  intensityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  intensityButtonTextActive: {
    color: '#FFFFFF',
  },
  intensityLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  intensityBarTrack: {
    height: 6,
    backgroundColor: colors.highlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  intensityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    minHeight: 52,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
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
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyStateEmoji: {
    fontSize: 36,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkinCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkinEmoji: {
    fontSize: 24,
  },
  checkinInfo: {
    gap: 2,
  },
  checkinEmotion: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  checkinTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 4,
  },
  checkinIntensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinIntensityLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 56,
    fontWeight: '500',
  },
  checkinIntensityTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.highlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  checkinIntensityFill: {
    height: '100%',
    borderRadius: 3,
  },
  checkinIntensityValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    width: 28,
    textAlign: 'right',
  },
  checkinNote: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
