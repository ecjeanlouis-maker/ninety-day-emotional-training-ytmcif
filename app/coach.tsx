
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'How do I stop overthinking?',
  "I'm feeling anxious today",
  'Help me prepare for a difficult conversation',
  'What should I focus on today?',
];

const CRISIS_KEYWORDS = ['988', 'crisis', 'suicide', 'self-harm', 'emergency'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoachScreen() {
  console.log('[Coach] Screen rendered');
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    console.log('[Coach] Fetching message history');
    try {
      const res = await authenticatedGet<{ messages: CoachMessage[] }>('/api/coach/messages');
      console.log('[Coach] Loaded', res.messages?.length, 'messages');
      setMessages(res.messages || []);
      setError(null);
    } catch (err) {
      console.error('[Coach] Error fetching messages:', err);
      setError('Unable to load conversation history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText) return;

    console.log('[Coach] Sending message:', messageText);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg: CoachMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      console.log('[Coach] POST /api/coach/messages payload:', { content: messageText });
      const res = await authenticatedPost<{ user_message: CoachMessage; assistant_message: CoachMessage }>(
        '/api/coach/messages',
        { content: messageText }
      );
      console.log('[Coach] Response received from coach');
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        res.user_message,
        res.assistant_message,
      ]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('[Coach] Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setError('Unable to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    console.log('[Coach] Suggested prompt tapped:', prompt);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(prompt);
  };

  const isCrisisMessage = (content: string): boolean => {
    const lower = content.toLowerCase();
    return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
  };

  const renderMessage = ({ item }: { item: CoachMessage }) => {
    const isUser = item.role === 'user';
    const isCrisis = !isUser && isCrisisMessage(item.content);

    if (isCrisis) {
      return (
        <View style={styles.crisisCard}>
          <Text style={styles.crisisTitle}>⚠ Important Resources</Text>
          <Text style={styles.crisisContent}>{item.content}</Text>
          <Text style={styles.crisisHotline}>Crisis Hotline: Call or text 988</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={styles.assistantAvatarText}>🤖</Text>
          </View>
        )}
        <View style={[styles.bubbleContent, isUser ? styles.userBubbleContent : styles.assistantBubbleContent]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, '#9B59B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('[Coach] Back button tapped');
              router.back();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <View style={styles.disclaimerChip}>
              <Text style={styles.disclaimerChipText}>Educational coaching only — not therapy</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🤖</Text>
                <Text style={styles.emptyStateTitle}>Your AI Coach</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Ask me anything about emotional control, confidence, or your ECCT journey.
                </Text>
                <View style={styles.suggestedPromptsContainer}>
                  <Text style={styles.suggestedPromptsTitle}>Try asking:</Text>
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.suggestedPrompt}
                      onPress={() => handleSuggestedPrompt(prompt)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.suggestedPromptText}>{prompt}</Text>
                      <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="send" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
          />
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask your coach..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onFocus={() => console.log('[Coach] Message input focused')}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disclaimerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  disclaimerChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  assistantAvatarText: {
    fontSize: 18,
  },
  bubbleContent: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
  },
  userBubbleContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubbleContent: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: colors.text,
  },
  crisisCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF3B30',
    gap: 8,
    marginBottom: 4,
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF3B30',
  },
  crisisContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  crisisHotline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF3B30',
    textAlign: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyStateEmoji: {
    fontSize: 56,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestedPromptsContainer: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  suggestedPromptsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  suggestedPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  suggestedPromptText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FF3B30',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
