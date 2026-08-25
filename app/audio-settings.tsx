import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFS_KEY = 'audio_prefs';
const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];
const MUSIC_CHOICES = ['Calm', 'Warm', 'Focus'] as const;
type MusicChoice = typeof MUSIC_CHOICES[number];

interface AudioPrefs {
  narrationEnabled: boolean;
  rate: number;
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  musicVolume: number;
}

const DEFAULT_PREFS: AudioPrefs = {
  narrationEnabled: false,
  rate: 0.9,
  musicEnabled: false,
  musicChoice: 'Calm',
  musicVolume: 0.3,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AudioSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [prefs, setPrefs] = useState<AudioPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  useEffect(() => {
    if (loaded) savePrefs();
  }, [prefs, loaded]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  async function loadPrefs() {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setPrefs({ ...DEFAULT_PREFS, ...saved });
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }

  async function savePrefs() {
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }

  function updatePref<K extends keyof AudioPrefs>(key: K, value: AudioPrefs[K]) {
    console.log('[AudioSettings] Pref changed:', key, '=', value);
    setPrefs(prev => ({ ...prev, [key]: value }));
  }

  function handleResetDefaults() {
    console.log('[AudioSettings] Reset to defaults tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrefs(DEFAULT_PREFS);
  }

  function handleBack() {
    console.log('[AudioSettings] Back tapped');
    router.back();
  }

  function handleSpeedSelect(speed: number) {
    console.log('[AudioSettings] Speed selected:', speed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePref('rate', speed);
  }

  function handleMusicChoiceSelect(choice: MusicChoice) {
    console.log('[AudioSettings] Music choice selected:', choice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePref('musicChoice', choice);
  }

  function handleVolumeDown() {
    const next = Math.max(0, Math.round((prefs.musicVolume - 0.1) * 10) / 10);
    console.log('[AudioSettings] Volume down:', next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePref('musicVolume', next);
  }

  function handleVolumeUp() {
    const next = Math.min(1, Math.round((prefs.musicVolume + 0.1) * 10) / 10);
    console.log('[AudioSettings] Volume up:', next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePref('musicVolume', next);
  }

  async function handlePreviewVoice() {
    console.log('[AudioSettings] Preview voice tapped — rate:', prefs.rate);
    if (isPreviewing) {
      Speech.stop();
      setIsPreviewing(false);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPreviewing(true);
    const sample = 'Welcome to your daily practice. Take a comfortable breath and settle in.';
    try {
      Speech.speak(sample, {
        rate: prefs.rate,
        pitch: 1.0,
        onDone: () => setIsPreviewing(false),
        onError: () => setIsPreviewing(false),
      });
    } catch {
      setIsPreviewing(false);
    }
  }

  const volumePct = Math.round(prefs.musicVolume * 100);
  const isDark = theme.dark;
  const textColor = theme.colors.text;
  const secondaryColor = isDark ? '#98989D' : '#666';
  const glassStyle = Platform.OS !== 'ios'
    ? { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
    : {};

  const previewButtonLabel = isPreviewing ? 'Stop Preview' : 'Preview Voice';
  const previewIosIcon = isPreviewing ? 'stop.circle.fill' : 'play.circle.fill';
  const previewAndroidIcon = isPreviewing ? 'stop' : 'play-arrow';
  const previewIconColor = isPreviewing ? '#fff' : colors.primary;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Audio & Narration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Narration section ── */}
        <Text style={[styles.sectionHeading, { color: secondaryColor }]}>NARRATION</Text>
        <GlassView style={[styles.card, glassStyle]} glassEffectStyle="regular">
          {/* Enable narration */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol
                ios_icon_name="speaker.wave.2.fill"
                android_material_icon_name="volume-up"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.rowLabel, { color: textColor }]}>Enable Narration</Text>
            </View>
            <Switch
              value={prefs.narrationEnabled}
              onValueChange={(val) => {
                console.log('[AudioSettings] Narration toggle:', val);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updatePref('narrationEnabled', val);
              }}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Enable narration"
            />
          </View>

          <View style={styles.divider} />

          {/* Speed */}
          <View style={styles.speedSection}>
            <Text style={[styles.rowLabel, { color: textColor }]}>Playback Speed</Text>
            <View style={styles.speedRow}>
              {SPEED_OPTIONS.map((speed) => {
                const isSelected = prefs.rate === speed;
                const speedLabel = `${speed}×`;
                return (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedChip,
                      { borderColor: colors.primary },
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleSpeedSelect(speed)}
                    accessibilityLabel={`Speed ${speedLabel}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.speedChipText, { color: isSelected ? '#fff' : colors.primary }]}>
                      {speedLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Preview voice */}
          <View style={styles.previewRow}>
            <TouchableOpacity
              style={[styles.previewButton, isPreviewing && styles.previewButtonActive]}
              onPress={handlePreviewVoice}
              accessibilityLabel={isPreviewing ? 'Stop voice preview' : 'Preview voice and speed'}
              accessibilityRole="button"
              accessibilityHint="Plays a short sample sentence with the current speed setting"
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name={previewIosIcon}
                android_material_icon_name={previewAndroidIcon}
                size={18}
                color={previewIconColor}
              />
              <Text style={[styles.previewButtonText, isPreviewing && styles.previewButtonTextActive]}>
                {previewButtonLabel}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.previewHint, { color: secondaryColor }]}>
              Hear how narration will sound
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Voice note */}
          <View style={styles.noteRow}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={16}
              color={secondaryColor}
            />
            <Text style={[styles.noteText, { color: secondaryColor }]}>
              Uses your device's installed voices. Voice quality varies by platform.
            </Text>
          </View>

          <View style={styles.noteRow}>
            <IconSymbol
              ios_icon_name="lock.shield"
              android_material_icon_name="security"
              size={16}
              color={secondaryColor}
            />
            <Text style={[styles.noteText, { color: secondaryColor }]}>
              Narration reads lesson content only — never your personal responses.
            </Text>
          </View>
        </GlassView>

        {/* ── Background Music section ── */}
        <Text style={[styles.sectionHeading, { color: secondaryColor }]}>BACKGROUND MUSIC</Text>
        <GlassView style={[styles.card, glassStyle]} glassEffectStyle="regular">
          {/* Music toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.rowLabel, { color: textColor }]}>Background Music</Text>
            </View>
            <Switch
              value={prefs.musicEnabled}
              onValueChange={(val) => {
                console.log('[AudioSettings] Music toggle:', val);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updatePref('musicEnabled', val);
              }}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Enable background music"
            />
          </View>

          <View style={styles.divider} />

          {/* Music choice */}
          <View style={styles.speedSection}>
            <Text style={[styles.rowLabel, { color: textColor }]}>Music Style</Text>
            <View style={styles.speedRow}>
              {MUSIC_CHOICES.map((choice) => {
                const isSelected = prefs.musicChoice === choice;
                return (
                  <TouchableOpacity
                    key={choice}
                    style={[
                      styles.speedChip,
                      { borderColor: colors.primary },
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleMusicChoiceSelect(choice)}
                    accessibilityLabel={`Music style ${choice}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.speedChipText, { color: isSelected ? '#fff' : colors.primary }]}>
                      {choice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Volume */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: textColor }]}>Volume</Text>
            <View style={styles.volumeRow}>
              <TouchableOpacity
                style={styles.volButton}
                onPress={handleVolumeDown}
                accessibilityLabel="Decrease volume"
                accessibilityRole="button"
              >
                <Text style={[styles.volButtonText, { color: colors.primary }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.volValue, { color: textColor }]}>{volumePct}%</Text>
              <TouchableOpacity
                style={styles.volButton}
                onPress={handleVolumeUp}
                accessibilityLabel="Increase volume"
                accessibilityRole="button"
              >
                <Text style={[styles.volButtonText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Music coming soon note */}
          <View style={styles.noteRow}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="schedule"
              size={16}
              color={secondaryColor}
            />
            <Text style={[styles.noteText, { color: secondaryColor }]}>
              Music coming soon — ambient tracks are being prepared.
            </Text>
          </View>
        </GlassView>

        {/* ── Privacy section ── */}
        <Text style={[styles.sectionHeading, { color: secondaryColor }]}>PRIVACY</Text>
        <GlassView style={[styles.card, glassStyle]} glassEffectStyle="regular">
          <View style={styles.noteRow}>
            <IconSymbol
              ios_icon_name="mic.slash.fill"
              android_material_icon_name="mic-off"
              size={16}
              color={secondaryColor}
            />
            <Text style={[styles.noteText, { color: secondaryColor }]}>
              Audio never records your voice or transmits your responses.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.noteRow}>
            <IconSymbol
              ios_icon_name="iphone"
              android_material_icon_name="smartphone"
              size={16}
              color={secondaryColor}
            />
            <Text style={[styles.noteText, { color: secondaryColor }]}>
              Narration uses your device's text-to-speech engine.
            </Text>
          </View>
        </GlassView>

        {/* ── Reset button ── */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetDefaults}
          accessibilityLabel="Reset audio settings to defaults"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 8,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 44,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginVertical: 4,
  },
  speedSection: {
    paddingVertical: 10,
    gap: 10,
  },
  speedRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  speedChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  speedChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 76, 230, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  volButtonText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  volValue: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
    minHeight: 44,
  },
  previewButtonActive: {
    backgroundColor: colors.primary,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  previewButtonTextActive: {
    color: '#fff',
  },
  previewHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  resetButton: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
});
