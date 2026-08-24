
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
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
import { authenticatedGet } from '@/utils/api';
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

const FREE_JOURNAL_LIMIT = 3;

const MOOD_COLORS: Record<string, string> = {
  happy: '#FFB84D',
  calm: '#3B82F6',
  anxious: '#F5A623',
  sad: '#6B7280',
  angry: '#E74C3C',
  grateful: '#1ABC9C',
  hopeful: '#6B4CE6',
  neutral: '#8E8E93',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JournalScreen() {
  console.log('[Journal] Screen rendered');
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canAccess } = useUser();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const hasFullAccess = isSubscribed || canAccess('ecct_full_program');

  const fetchEntries = useCallback(async (search?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }
    console.log('[Journal] Fetching entries, search:', search);
    try {
      const endpoint = search ? `/api/journal?search=${encodeURIComponent(search)}` : '/api/journal';
      const res = await authenticatedGet<{ entries: JournalEntry[] }>(endpoint);
      console.log('[Journal] Loaded', res.entries?.length, 'entries');
      setEntries(res.entries || []);
      setError(null);
    } catch (err) {
      console.error('[Journal] Error fetching entries:', err);
      setError('Unable to load journal entries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRefresh = () => {
    console.log('[Journal] Pull-to-refresh triggered');
    setRefreshing(true);
    fetchEntries(searchQuery);
  };

  const handleSearch = (text: string) => {
    console.log('[Journal] Search query changed:', text);
    setSearchQuery(text);
    if (text.length === 0 || text.length >= 2) {
      fetchEntries(text);
    }
  };

  const handleNewEntry = () => {
    console.log('[Journal] New Entry tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      console.log('[Journal] Guest tried to create entry — pushing auth');
      router.push('/auth');
      return;
    }
    if (!hasFullAccess && entries.length >= FREE_JOURNAL_LIMIT) {
      console.log('[Journal] Free user hit journal limit — pushing paywall');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    router.push('/journal/new');
  };

  const handleEntryPress = (entry: JournalEntry) => {
    console.log('[Journal] Entry tapped:', entry.id, entry.title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/journal/${entry.id}`);
  };

  const moodColor = (mood?: string): string => {
    if (!mood) return '#8E8E93';
    return MOOD_COLORS[mood.toLowerCase()] || '#8E8E93';
  };

  const renderEntry = ({ item, index }: { item: JournalEntry; index: number }) => {
    const dateText = formatDate(item.created_at);
    const previewText = truncate(item.content || '', 100);
    const entryMoodColor = moodColor(item.mood);

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <TouchableOpacity
          style={styles.entryCard}
          onPress={() => handleEntryPress(item)}
          activeOpacity={0.85}
        >
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle} numberOfLines={1}>{item.title || 'Untitled Entry'}</Text>
            <Text style={styles.entryDate}>{dateText}</Text>
          </View>
          {item.mood ? (
            <View style={[styles.moodChip, { backgroundColor: entryMoodColor + '20', borderColor: entryMoodColor }]}>
              <Text style={[styles.moodChipText, { color: entryMoodColor }]}>{item.mood}</Text>
            </View>
          ) : null}
          {previewText ? (
            <Text style={styles.entryPreview} numberOfLines={3}>{previewText}</Text>
          ) : null}
          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient
          colors={['#9B59B6', '#6B4CE6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Journal</Text>
              <Text style={styles.headerSubtitle}>Your private reflection space</Text>
            </View>
            <TouchableOpacity style={styles.newEntryButton} onPress={handleNewEntry} activeOpacity={0.85}>
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search journal..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => console.log('[Journal] Search input focused')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Guest state */}
      {!user ? (
        <View style={styles.guestState}>
          <Text style={styles.guestStateEmoji}>📔</Text>
          <Text style={styles.guestStateTitle}>Your Private Journal</Text>
          <Text style={styles.guestStateSubtitle}>Sign in to start writing and save your reflections securely.</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => {
              console.log('[Journal] Guest sign-in button tapped');
              router.push('/auth');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.signInButtonText}>Sign In to Start Writing</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { console.log('[Journal] Retry tapped'); fetchEntries(); }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📝</Text>
              <Text style={styles.emptyStateTitle}>Start Your Journal</Text>
              <Text style={styles.emptyStateSubtitle}>Your journal is private and secure. Start writing your reflections.</Text>
              <TouchableOpacity style={styles.newEntryButtonLarge} onPress={handleNewEntry} activeOpacity={0.85}>
                <Text style={styles.newEntryButtonLargeText}>Write First Entry</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FAB */}
      {user && !loading && (
        <TouchableOpacity style={styles.fab} onPress={handleNewEntry} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 2,
  },
  newEntryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(107, 76, 230, 0.06)',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  entryDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  moodChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  entryPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  newEntryButtonLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  newEntryButtonLargeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guestState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  guestStateEmoji: {
    fontSize: 56,
  },
  guestStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  guestStateSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(107, 76, 230, 0.4)',
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
