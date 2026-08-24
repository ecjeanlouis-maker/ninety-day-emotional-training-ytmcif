
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
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  is_private?: boolean;
  created_at: string;
  updated_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = ['happy', 'calm', 'anxious', 'sad', 'angry', 'grateful', 'hopeful', 'neutral'];

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', anxious: '😰', sad: '😢',
  angry: '😠', grateful: '🙏', hopeful: '🌟', neutral: '😐',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function JournalEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  console.log('[JournalEntry] Screen rendered, id:', id, 'isNew:', isNew);

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editTags, setEditTags] = useState('');

  const fetchEntry = useCallback(async () => {
    if (isNew) return;
    console.log('[JournalEntry] Fetching entry:', id);
    try {
      const res = await authenticatedGet<JournalEntry>(`/api/journal/${id}`);
      console.log('[JournalEntry] Entry loaded:', res.title);
      setEntry(res);
      setEditTitle(res.title || '');
      setEditContent(res.content || '');
      setEditMood(res.mood || '');
      setEditTags(res.tags?.join(', ') || '');
      setError(null);
    } catch (err) {
      console.error('[JournalEntry] Error fetching entry:', err);
      setError('Unable to load journal entry.');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleEdit = () => {
    console.log('[JournalEntry] Edit button tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    console.log('[JournalEntry] Cancel edit tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isNew) {
      router.back();
      return;
    }
    setIsEditing(false);
    setEditTitle(entry?.title || '');
    setEditContent(entry?.content || '');
    setEditMood(entry?.mood || '');
    setEditTags(entry?.tags?.join(', ') || '');
  };

  const handleSave = async () => {
    console.log('[JournalEntry] Save tapped — isNew:', isNew);
    if (!editTitle.trim() && !editContent.trim()) {
      Alert.alert('Empty Entry', 'Please add a title or content before saving.');
      return;
    }
    setSaving(true);
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        title: editTitle.trim() || 'Untitled Entry',
        content: editContent.trim(),
        mood: editMood || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      };
      console.log('[JournalEntry] Saving payload:', payload);

      if (isNew) {
        console.log('[JournalEntry] POST /api/journal');
        const newEntry = await authenticatedPost<JournalEntry>('/api/journal', payload);
        console.log('[JournalEntry] Entry created:', newEntry.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/journal/${newEntry.id}`);
      } else {
        console.log('[JournalEntry] PUT /api/journal/:id');
        const updated = await authenticatedPut<JournalEntry>(`/api/journal/${id}`, payload);
        console.log('[JournalEntry] Entry updated:', updated.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEntry(updated);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('[JournalEntry] Error saving entry:', err);
      Alert.alert('Error', 'Unable to save journal entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    console.log('[JournalEntry] Delete button tapped');
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[JournalEntry] Confirming delete for entry:', id);
            setDeleting(true);
            try {
              await authenticatedDelete(`/api/journal/${id}`);
              console.log('[JournalEntry] Entry deleted:', id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (err) {
              console.error('[JournalEntry] Error deleting entry:', err);
              Alert.alert('Error', 'Unable to delete entry. Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleMoodSelect = (mood: string) => {
    console.log('[JournalEntry] Mood selected:', mood);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditMood(mood === editMood ? '' : mood);
  };

  const formattedDate = entry
    ? new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { console.log('[JournalEntry] Retry tapped'); fetchEntry(); }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('[JournalEntry] Back button tapped');
            if (isEditing && !isNew) {
              handleCancelEdit();
            } else {
              router.back();
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>{isNew ? 'New Entry' : isEditing ? 'Edit Entry' : 'Journal'}</Text>

        <View style={styles.topBarActions}>
          {!isNew && !isEditing && (
            <>
              <TouchableOpacity onPress={handleEdit} style={styles.topBarButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.topBarButton} disabled={deleting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={22} color="#FF3B30" />
                )}
              </TouchableOpacity>
            </>
          )}
          {isEditing && (
            <>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.topBarButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isEditing ? (
          /* Edit mode */
          <Animated.View entering={FadeInDown.duration(300)} style={styles.editContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Entry title..."
              placeholderTextColor={colors.textSecondary}
              value={editTitle}
              onChangeText={setEditTitle}
              maxLength={100}
              onFocus={() => console.log('[JournalEntry] Title input focused')}
            />

            {/* Mood selector */}
            <View style={styles.moodSection}>
              <Text style={styles.moodSectionLabel}>How are you feeling?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodScrollContent}>
                {MOODS.map(mood => {
                  const isSelected = editMood === mood;
                  return (
                    <TouchableOpacity
                      key={mood}
                      style={[styles.moodChip, isSelected && styles.moodChipSelected]}
                      onPress={() => handleMoodSelect(mood)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.moodEmoji}>{MOOD_EMOJIS[mood]}</Text>
                      <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>{mood}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TextInput
              style={styles.contentInput}
              placeholder="Write your thoughts..."
              placeholderTextColor={colors.textSecondary}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              textAlignVertical="top"
              onFocus={() => console.log('[JournalEntry] Content input focused')}
            />

            <TextInput
              style={styles.tagsInput}
              placeholder="Tags (comma-separated, e.g. growth, anxiety, work)"
              placeholderTextColor={colors.textSecondary}
              value={editTags}
              onChangeText={setEditTags}
              onFocus={() => console.log('[JournalEntry] Tags input focused')}
            />
          </Animated.View>
        ) : (
          /* View mode */
          <Animated.View entering={FadeInDown.duration(300)} style={styles.viewContainer}>
            <Text style={styles.viewDate}>{formattedDate}</Text>
            {entry?.mood ? (
              <View style={styles.viewMoodRow}>
                <Text style={styles.viewMoodEmoji}>{MOOD_EMOJIS[entry.mood] || '😐'}</Text>
                <Text style={styles.viewMoodLabel}>{entry.mood}</Text>
              </View>
            ) : null}
            <Text style={styles.viewTitle}>{entry?.title || 'Untitled Entry'}</Text>
            <Text style={styles.viewContent}>{entry?.content || ''}</Text>
            {entry?.tags && entry.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {entry.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  editContainer: {
    padding: 16,
    gap: 16,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  moodSection: {
    gap: 8,
  },
  moodSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  moodScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 6,
  },
  moodChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  moodLabelSelected: {
    color: '#FFFFFF',
  },
  contentInput: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  tagsInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  viewContainer: {
    padding: 20,
    gap: 16,
  },
  viewDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewMoodEmoji: {
    fontSize: 20,
  },
  viewMoodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  viewTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 32,
  },
  viewContent: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
