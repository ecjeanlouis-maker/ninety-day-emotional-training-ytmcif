import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AccessibilityInfo,
  Switch,
} from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { trackEvent } from '@/utils/analytics';

// ─── Music is not yet available — no unlicensed audio bundled ─────────────────
const MUSIC_AVAILABLE = false;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AudioCompanionProps {
  dayNumber: number;
  title: string;
  lessonContent: string;
  drillInstructions: string;
  reflectionPrompt: string;
  challenge: string;
  safetyNote?: string;
  currentStep: number; // 0=Lesson, 1=Drill, 2=Reflect, 3=Complete
  onSectionChange?: (section: number) => void;
}

interface AudioPrefs {
  rate: number;
  musicEnabled: boolean;
  musicVolume: number;
}

const PREFS_KEY = 'audio_prefs';
const SECTION_LABELS = ['Lesson', 'Practice', 'Reflection', 'Closing'];
const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

// ─── Text helpers ─────────────────────────────────────────────────────────────

function normalizeText(raw: string): string {
  return raw
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip markdown
    .replace(/[*_#`~]/g, '')
    // HTML entities
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, 'and')
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&nbsp;/g, ' ')
    // Remove emoji (Unicode ranges)
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Expand common abbreviations for natural speech
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\betc\./gi, 'and so on')
    .replace(/\bvs\./gi, 'versus')
    .replace(/\bapprox\./gi, 'approximately')
    // Numbered steps: "1." → "Step 1."
    .replace(/^(\d+)\.\s/gm, 'Step $1. ')
    // Add natural pause after section headers (colon at end of short phrase)
    .replace(/([A-Z][^.!?]{0,40}):\s/g, '$1. ')
    // Collapse multiple spaces/newlines
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chunkText(text: string, maxLen = 200): string[] {
  if (text.length <= maxLen) return [text];
  const sentences = text.split(/(?<=\. )/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

function buildSectionText(
  section: number,
  props: AudioCompanionProps
): string {
  const { title, lessonContent, drillInstructions, reflectionPrompt, challenge, safetyNote, dayNumber } = props;
  switch (section) {
    case 0:
      // Title pause, then objective intro, then lesson
      return normalizeText(
        `${title}. ... Today's focus. ${lessonContent}`
      );
    case 1:
      // Guided practice with step-by-step pacing
      return normalizeText(
        `Guided practice. ... ${drillInstructions}`
      );
    case 2:
      // Reflection with pause before prompt, then real-world action
      return normalizeText(
        `Reflection. ... Take a moment. ${reflectionPrompt}. ... Your real-world action for today. ${challenge}`
      );
    case 3: {
      const closing = `Well done completing Day ${dayNumber}. Take a breath and notice how you feel.`;
      return normalizeText(safetyNote ? `${safetyNote}. ... ${closing}` : closing);
    }
    default:
      return '';
  }
}

// ─── Voice selection ──────────────────────────────────────────────────────────

/**
 * Curated preference lists derived from documented Apple/Google TTS voice metadata.
 * These are real system voice identifiers known to present as professional male voices.
 * The function never assumes any single voice exists — it tries each in order and
 * falls back gracefully to the best available neutral/quality voice.
 *
 * Sources:
 *   iOS/macOS: AVSpeechSynthesisVoice identifiers (com.apple.voice.*)
 *   Android: locale-based selection (no stable named-voice API)
 *   Web: SpeechSynthesis API (browser-dependent)
 */

// iOS: documented male-presenting enhanced/premium voice identifiers (en-US/en-GB/en-AU)
// These are real Apple system voices available on iOS 16+ devices.
const IOS_MALE_VOICE_IDS = [
  'com.apple.voice.enhanced.en-US.Rishi',    // Indian English, calm, clear
  'com.apple.voice.premium.en-US.Rishi',
  'com.apple.voice.enhanced.en-GB.Daniel',   // British English, professional
  'com.apple.voice.premium.en-GB.Daniel',
  'com.apple.voice.enhanced.en-US.Aaron',    // US English, neutral male
  'com.apple.voice.premium.en-US.Aaron',
  'com.apple.voice.enhanced.en-AU.Lee',      // Australian English, warm
  'com.apple.voice.premium.en-AU.Lee',
  'com.apple.voice.enhanced.en-US.Fred',     // Classic US male
  'com.apple.ttsbundle.Daniel-compact',      // Compact fallback
  'com.apple.ttsbundle.Rishi-compact',
];

// Name fragments that strongly indicate male-presenting voices across platforms
// Based on documented voice names from Apple, Google, and common TTS providers.
// Gender inference from name is a heuristic only — used as a tiebreaker, not sole criterion.
const MALE_NAME_FRAGMENTS = [
  'daniel', 'aaron', 'rishi', 'lee', 'fred', 'tom', 'alex',
  'oliver', 'arthur', 'george', 'james', 'thomas', 'william',
  'gordon', 'reed', 'liam', 'ryan', 'nathan', 'evan', 'eric',
  'david', 'mark', 'paul', 'peter', 'richard', 'robert', 'john',
  // Google/Android TTS male voice name fragments
  'male', 'man',
];

// Voices to avoid regardless of gender — theatrical, novelty, or low-quality
const AVOID_FRAGMENTS = [
  'whisper', 'novelty', 'trinoids', 'zarvox', 'cellos', 'bells',
  'boing', 'bubbles', 'deranged', 'hysterical', 'junior', 'organ',
  'pipe', 'princess', 'ralph', 'robot', 'wobble', 'bad', 'good',
];

// Quality indicators that boost score
const QUALITY_FRAGMENTS = ['premium', 'enhanced', 'neural', 'natural', 'siri', 'eloquence'];

/**
 * Select the best available professional male-presenting English system voice.
 * Falls back to highest-quality neutral voice if no male voice is identifiable.
 * Never downloads voices, clones a person, or assumes a specific voice exists.
 */
async function selectBestVoice(): Promise<{ identifier: string | undefined; isMaleFallback: boolean }> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return { identifier: undefined, isMaleFallback: false };

    // Filter to English voices
    const englishVoices = voices.filter(v => v.language?.toLowerCase().startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    // iOS: try curated male voice IDs in preference order first
    if (Platform.OS === 'ios') {
      for (const preferredId of IOS_MALE_VOICE_IDS) {
        const match = pool.find(v => v.identifier === preferredId);
        if (match) return { identifier: match.identifier, isMaleFallback: false };
      }
    }

    // Score all voices
    const scored = pool.map(v => {
      const id = (v.identifier ?? '').toLowerCase();
      const name = (v.name ?? '').toLowerCase();
      const combined = id + ' ' + name;
      let score = 0;

      // Hard disqualify theatrical/novelty voices
      if (AVOID_FRAGMENTS.some(k => combined.includes(k))) return { voice: v, score: -1000 };

      // Quality boost
      if (QUALITY_FRAGMENTS.some(k => combined.includes(k))) score += 20;

      // Male name heuristic (tiebreaker only — not sole criterion)
      if (MALE_NAME_FRAGMENTS.some(k => combined.includes(k))) score += 15;

      // Locale preference
      if (v.language?.toLowerCase() === 'en-us') score += 8;
      else if (v.language?.toLowerCase() === 'en-gb') score += 6;
      else if (v.language?.toLowerCase().startsWith('en')) score += 3;

      return { voice: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score <= -1000) return { identifier: undefined, isMaleFallback: false };

    // Determine if we found a likely male voice or fell back to neutral
    const bestCombined = ((best.voice.identifier ?? '') + ' ' + (best.voice.name ?? '')).toLowerCase();
    const isMaleFallback = !MALE_NAME_FRAGMENTS.some(k => bestCombined.includes(k));

    return { identifier: best.voice.identifier, isMaleFallback };
  } catch {
    return { identifier: undefined, isMaleFallback: false };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AudioCompanion(props: AudioCompanionProps) {
  const { dayNumber, currentStep, onSectionChange } = props;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(currentStep);
  const [rate, setRate] = useState(0.9);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [screenReaderDismissed, setScreenReaderDismissed] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [voiceIsMaleFallback, setVoiceIsMaleFallback] = useState(false);

  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const playingRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Load prefs on mount ──
  useEffect(() => {
    mountedRef.current = true;
    loadPrefs();
    checkScreenReader();
    return () => {
      mountedRef.current = false;
      stopSpeech();
    };
  }, []);

  // ── Sync section with currentStep prop ──
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentSectionRef = useRef(currentSection);
  currentSectionRef.current = currentSection;

  useEffect(() => {
    if (currentSectionRef.current !== currentStep) {
      if (isPlayingRef.current) {
        stopSpeech();
        setIsPlaying(false);
      }
      setCurrentSection(currentStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ── Save prefs on change ──
  useEffect(() => {
    savePrefs();
  }, [rate, musicEnabled, musicVolume]);

  async function loadPrefs() {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        const prefs: AudioPrefs = JSON.parse(raw);
        if (mountedRef.current) {
          if (prefs.rate) setRate(prefs.rate);
          if (typeof prefs.musicEnabled === 'boolean') setMusicEnabled(prefs.musicEnabled);
          if (typeof prefs.musicVolume === 'number') setMusicVolume(prefs.musicVolume);
        }
      }
    } catch {
      // ignore
    }
    // Select best voice after loading prefs
    const { identifier, isMaleFallback } = await selectBestVoice();
    if (mountedRef.current) {
      setSelectedVoice(identifier);
      setVoiceIsMaleFallback(isMaleFallback);
    }
  }

  async function savePrefs() {
    try {
      const prefs: AudioPrefs = { rate, musicEnabled, musicVolume };
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }

  async function checkScreenReader() {
    try {
      const active = await AccessibilityInfo.isScreenReaderEnabled();
      if (mountedRef.current) setScreenReaderActive(active);
    } catch {
      // ignore
    }
  }

  function stopSpeech() {
    playingRef.current = false;
    try {
      Speech.stop();
    } catch {
      // ignore
    }
  }

  const speakChunks = useCallback(
    (chunks: string[], index: number) => {
      if (!playingRef.current || index >= chunks.length) {
        if (mountedRef.current) {
          setIsPlaying(false);
          setIsLoading(false);
          if (index >= chunks.length && playingRef.current) {
            trackEvent('narration_completed', { day_number: dayNumber });
          }
        }
        playingRef.current = false;
        return;
      }
      chunkIndexRef.current = index;
      Speech.speak(chunks[index], {
        rate,
        pitch: 1.0,
        voice: selectedVoice,
        onStart: () => {
          if (mountedRef.current) setIsLoading(false);
        },
        onDone: () => {
          if (playingRef.current && mountedRef.current) {
            speakChunks(chunks, index + 1);
          }
        },
        onError: (err) => {
          console.error('[AudioCompanion] TTS error:', err);
          if (mountedRef.current) {
            setError('Narration error. Please try again.');
            setIsPlaying(false);
            setIsLoading(false);
            trackEvent('audio_error', { day_number: dayNumber, reason: 'tts_error' });
          }
          playingRef.current = false;
        },
      });
    },
    [rate, selectedVoice, dayNumber]
  );

  const handlePlayPause = async () => {
    if (isLoading) return;
    console.log('[AudioCompanion] Play/Pause tapped — isPlaying:', isPlaying, 'day:', dayNumber);

    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
      trackEvent('narration_stopped', { day_number: dayNumber });
      return;
    }

    // Check TTS availability
    try {
      const available = await Speech.getAvailableVoicesAsync();
      if (Platform.OS !== 'web' && available.length === 0) {
        setVoiceUnavailable(true);
        trackEvent('audio_error', { day_number: dayNumber, reason: 'tts_unavailable' });
        return;
      }
    } catch {
      // On web, getAvailableVoicesAsync may not be supported — proceed anyway
    }

    setError(null);
    setIsLoading(true);
    setIsPlaying(true);
    playingRef.current = true;

    const text = buildSectionText(currentSection, props);
    const chunks = chunkText(text);
    chunksRef.current = chunks;
    chunkIndexRef.current = 0;

    trackEvent('narration_started', { day_number: dayNumber });
    speakChunks(chunks, 0);
  };

  const handleRestart = () => {
    console.log('[AudioCompanion] Restart tapped — section:', currentSection, 'day:', dayNumber);
    stopSpeech();
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
  };

  const handlePrevSection = () => {
    const next = Math.max(0, currentSection - 1);
    console.log('[AudioCompanion] Prev section tapped — going to section:', next, 'day:', dayNumber);
    stopSpeech();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentSection(next);
    onSectionChange?.(next);
  };

  const handleNextSection = () => {
    const next = Math.min(3, currentSection + 1);
    console.log('[AudioCompanion] Next section tapped — going to section:', next, 'day:', dayNumber);
    stopSpeech();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentSection(next);
    onSectionChange?.(next);
  };

  const handleSpeedSelect = (speed: number) => {
    console.log('[AudioCompanion] Speed changed to:', speed, 'day:', dayNumber);
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      stopSpeech();
      setIsPlaying(false);
    }
    setRate(speed);
  };

  const handleMusicToggle = (val: boolean) => {
    console.log('[AudioCompanion] Music toggle:', val, 'day:', dayNumber);
    setMusicEnabled(val);
    if (val) {
      trackEvent('music_enabled', { day_number: dayNumber });
    } else {
      trackEvent('music_disabled', { day_number: dayNumber });
    }
  };

  const handleVolumeDown = () => {
    const next = Math.max(0, Math.round((musicVolume - 0.1) * 10) / 10);
    console.log('[AudioCompanion] Volume down:', next, 'day:', dayNumber);
    setMusicVolume(next);
  };

  const handleVolumeUp = () => {
    const next = Math.min(1, Math.round((musicVolume + 0.1) * 10) / 10);
    console.log('[AudioCompanion] Volume up:', next, 'day:', dayNumber);
    setMusicVolume(next);
  };

  const handlePreviewVoice = async () => {
    if (isLoading || isPlaying) return;
    console.log('[AudioCompanion] Preview voice tapped — rate:', rate, 'voice:', selectedVoice);
    const sample = 'Welcome to your daily practice. Take a comfortable breath and settle in.';
    try {
      await Speech.stop();
      Speech.speak(sample, {
        rate,
        pitch: 1.0,
        voice: selectedVoice,
        onError: () => {
          if (mountedRef.current) setError('Preview not available on this device.');
        },
      });
    } catch {
      setError('Preview not available on this device.');
    }
  };

  // ── Status text ──
  let statusText = 'Ready';
  if (isLoading) statusText = 'Loading...';
  else if (isPlaying) statusText = 'Playing...';
  else if (error) statusText = error;
  else if (voiceUnavailable) statusText = 'Narration not available on this device';

  const sectionLabel = SECTION_LABELS[currentSection] ?? 'Lesson';
  const volumePct = Math.round(musicVolume * 100);

  // ── Screen reader warning ──
  if (screenReaderActive && !screenReaderDismissed) {
    return (
      <View style={styles.srWarning}>
        <Text style={styles.srWarningText}>
          Screen reader detected — narration may conflict with VoiceOver/TalkBack. Tap to dismiss and use written text.
        </Text>
        <TouchableOpacity
          style={styles.srDismissButton}
          onPress={() => {
            console.log('[AudioCompanion] Screen reader warning dismissed');
            setScreenReaderDismissed(true);
          }}
          accessibilityLabel="Dismiss screen reader warning"
          accessibilityRole="button"
        >
          <Text style={styles.srDismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>Section:</Text>
        <Text style={styles.sectionValue}>{sectionLabel}</Text>
      </View>

      {/* Transport controls */}
      <View style={styles.transportRow}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePrevSection}
          accessibilityLabel="Previous section"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.controlIcon}>⏮</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={handlePlayPause}
          disabled={isLoading}
          accessibilityLabel={isPlaying ? 'Pause narration' : 'Play narration'}
          accessibilityRole="button"
          accessibilityState={{ selected: isPlaying }}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRestart}
          accessibilityLabel="Restart section"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.controlIcon}>⟳</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleNextSection}
          accessibilityLabel="Next section"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.controlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <Text
        style={[styles.statusText, error ? styles.statusError : null]}
        accessibilityLiveRegion="polite"
      >
        {statusText}
      </Text>
      {voiceIsMaleFallback && (
        <Text style={styles.voiceFallbackNote}>
          No male voice found — using best available system voice
        </Text>
      )}

      {/* Speed selector */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed:</Text>
        {SPEED_OPTIONS.map((speed) => {
          const isSelected = rate === speed;
          const speedLabel = `${speed}×`;
          return (
            <TouchableOpacity
              key={speed}
              style={[styles.speedChip, isSelected && styles.speedChipSelected]}
              onPress={() => handleSpeedSelect(speed)}
              accessibilityLabel={`Speed ${speedLabel}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.speedChipText, isSelected && styles.speedChipTextSelected]}>
                {speedLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Preview voice */}
      <TouchableOpacity
        style={styles.previewButton}
        onPress={handlePreviewVoice}
        disabled={isLoading || isPlaying}
        accessibilityLabel="Preview voice and speed"
        accessibilityRole="button"
        accessibilityHint="Plays a short sample sentence with the current voice and speed settings"
      >
        <Text style={[styles.previewButtonText, (isLoading || isPlaying) && styles.previewButtonDisabled]}>
          🔊 Preview Voice
        </Text>
      </TouchableOpacity>

      {/* Music section */}
      <View style={styles.musicRow}>
        <Text style={styles.musicLabel}>Music:</Text>
        {Platform.OS === 'web' ? (
          <Text style={styles.musicUnavailable}>Not available on web</Text>
        ) : !MUSIC_AVAILABLE ? (
          <Text style={styles.musicUnavailable}>Coming soon</Text>
        ) : (
          <>
            <Switch
              value={musicEnabled}
              onValueChange={handleMusicToggle}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Toggle background music"
            />
            {musicEnabled && (
              <View style={styles.volumeRow}>
                <TouchableOpacity
                  style={styles.volButton}
                  onPress={handleVolumeDown}
                  accessibilityLabel="Decrease volume"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.volButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.volValue}>{volumePct}%</Text>
                <TouchableOpacity
                  style={styles.volButton}
                  onPress={handleVolumeUp}
                  accessibilityLabel="Increase volume"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.volButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(107, 76, 230, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 76, 230, 0.2)',
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sectionValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statusError: {
    color: '#FF3B30',
  },
  voiceFallbackNote: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  speedLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  speedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 76, 230, 0.3)',
    minWidth: 44,
    alignItems: 'center',
  },
  speedChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedChipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  speedChipTextSelected: {
    color: '#FFFFFF',
  },
  previewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(107, 76, 230, 0.4)',
    minHeight: 44,
    justifyContent: 'center',
  },
  previewButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  previewButtonDisabled: {
    opacity: 0.4,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  musicLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  musicUnavailable: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  volButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 76, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volButtonText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  volValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'center',
  },
  srWarning: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD54F',
    marginBottom: 16,
    gap: 10,
  },
  srWarningText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  srDismissButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E65100',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  srDismissText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
