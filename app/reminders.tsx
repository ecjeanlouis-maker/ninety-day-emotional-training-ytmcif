import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import { IconSymbol } from '@/components/IconSymbol';

// Conditionally import expo-notifications only on native
let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderPrefs {
  enabled: boolean;
  reminder_time: string; // HH:MM
  active_days: number[]; // 1=Mon..7=Sun
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM
  quiet_hours_end: string; // HH:MM
  missed_day_reminder: boolean;
}

type PermissionStatus = 'not_requested' | 'granted' | 'denied' | 'unavailable';

const DEFAULT_PREFS: ReminderPrefs = {
  enabled: false,
  reminder_time: '08:00',
  active_days: [1, 2, 3, 4, 5, 6, 7],
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  missed_day_reminder: false,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Notification helpers ─────────────────────────────────────────────────────

async function requestPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web' || !Notifications) return 'unavailable';
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return 'granted';
  if (existing === 'denied') return 'denied';
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

async function scheduleReminders(prefs: ReminderPrefs): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled) return;

  const parts = prefs.reminder_time.split(':');
  const hours = parseInt(parts[0] ?? '8', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);

  for (const dayOfWeek of prefs.active_days) {
    // dayOfWeek: 1=Mon..7=Sun, Notifications uses 1=Sun..7=Sat
    const notifDay = dayOfWeek === 7 ? 1 : dayOfWeek + 1;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your daily practice',
        body: 'Your 5-minute session is ready. Tap to continue your journey.',
        data: { screen: '/(tabs)/(home)' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: notifDay,
        hour: hours,
        minute: minutes,
      },
    });
  }
  console.log('[Reminders] Scheduled', prefs.active_days.length, 'weekly notifications at', prefs.reminder_time);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('not_requested');
  const [offlineWarning, setOfflineWarning] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prefs on mount
  useEffect(() => {
    loadPrefs();
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === 'web' || !Notifications) {
      setPermissionStatus('unavailable');
      return;
    }
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') setPermissionStatus('granted');
      else if (status === 'denied') setPermissionStatus('denied');
      else setPermissionStatus('not_requested');
    } catch {
      setPermissionStatus('unavailable');
    }
  };

  const loadPrefs = async () => {
    console.log('[Reminders] Loading preferences from API');
    try {
      const data = await authenticatedGet<ReminderPrefs>('/api/reminders/prefs');
      console.log('[Reminders] Prefs loaded:', data);
      setPrefs(data);
    } catch (err) {
      console.warn('[Reminders] Failed to load prefs (using defaults):', err);
      // Use defaults — offline graceful
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = useCallback(async (newPrefs: ReminderPrefs) => {
    console.log('[Reminders] Saving preferences:', newPrefs);
    setSaving(true);
    setOfflineWarning(false);
    try {
      await authenticatedPut('/api/reminders/prefs', newPrefs);
      console.log('[Reminders] Preferences saved successfully');
      // Schedule/cancel notifications after saving
      if (Platform.OS !== 'web' && permissionStatus === 'granted') {
        await scheduleReminders(newPrefs);
      }
    } catch (err) {
      console.warn('[Reminders] Failed to save prefs (offline?):', err);
      setOfflineWarning(true);
    } finally {
      setSaving(false);
    }
  }, [permissionStatus]);

  const debouncedSave = useCallback((newPrefs: ReminderPrefs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePrefs(newPrefs);
    }, 500);
  }, [savePrefs]);

  const updatePrefs = (patch: Partial<ReminderPrefs>) => {
    const newPrefs = { ...prefs, ...patch };
    setPrefs(newPrefs);
    debouncedSave(newPrefs);
  };

  const handleToggleEnabled = async (value: boolean) => {
    console.log('[Reminders] Toggle enabled:', value);
    if (value && permissionStatus !== 'granted') {
      // Request permission first
      const status = await requestPermission();
      setPermissionStatus(status);
      if (status !== 'granted') {
        console.log('[Reminders] Permission not granted — not enabling reminders');
        return;
      }
    }
    const newPrefs = { ...prefs, enabled: value };
    setPrefs(newPrefs);
    debouncedSave(newPrefs);
    if (value) {
      trackEvent('reminder_enabled');
    } else {
      trackEvent('reminder_disabled');
      if (Platform.OS !== 'web' && Notifications) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('[Reminders] All notifications cancelled');
      }
    }
  };

  const handleDayToggle = (day: number) => {
    console.log('[Reminders] Day toggled:', day);
    const activeDays = prefs.active_days.includes(day)
      ? prefs.active_days.filter(d => d !== day)
      : [...prefs.active_days, day].sort((a, b) => a - b);
    updatePrefs({ active_days: activeDays });
  };

  const handleOpenSettings = () => {
    console.log('[Reminders] Open Settings tapped');
    Linking.openSettings();
  };

  const handleBack = () => {
    console.log('[Reminders] Back button tapped');
    router.back();
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Reminders</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.webUnsupported}>
          <Text style={styles.webUnsupportedEmoji}>🔔</Text>
          <Text style={styles.webUnsupportedTitle}>Reminders on Mobile</Text>
          <Text style={styles.webUnsupportedText}>
            Reminders are available on iOS and Android. Enable them in the app on your device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Reminders</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isDenied = permissionStatus === 'denied';
  const isEnabled = prefs.enabled && permissionStatus === 'granted';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Reminders</Text>
        <View style={styles.headerSpacer}>
          {saving && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Offline warning */}
        {offlineWarning && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Changes will sync when online
            </Text>
          </View>
        )}

        {/* Permission denied banner */}
        {isDenied && (
          <View style={styles.deniedBanner}>
            <Text style={styles.deniedBannerText}>
              Notifications are blocked. Go to Settings → Notifications → Control & Confidence to enable them.
            </Text>
            <TouchableOpacity style={styles.openSettingsButton} onPress={handleOpenSettings}>
              <Text style={styles.openSettingsText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleTitle}>Enable Daily Reminders</Text>
              <Text style={styles.toggleSubtitle}>Get a gentle nudge to practice each day</Text>
            </View>
            <Switch
              value={prefs.enabled && permissionStatus === 'granted'}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={isDenied}
            />
          </View>
        </View>

        {/* Settings (only shown when enabled) */}
        {isEnabled && (
          <>
            {/* Time picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Time</Text>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Daily at</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    console.log('[Reminders] Time button tapped — current time:', prefs.reminder_time);
                    // Cycle through common times for simplicity
                    const times = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '18:00', '20:00', '21:00'];
                    const currentIndex = times.indexOf(prefs.reminder_time);
                    const nextTime = times[(currentIndex + 1) % times.length] ?? '08:00';
                    updatePrefs({ reminder_time: nextTime });
                  }}
                >
                  <Text style={styles.timeValue}>{prefs.reminder_time}</Text>
                  <Text style={styles.timeHint}>Tap to change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Days</Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, index) => {
                  const dayNum = index + 1;
                  const isActive = prefs.active_days.includes(dayNum);
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[styles.dayChip, isActive && styles.dayChipActive]}
                      onPress={() => handleDayToggle(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Timezone display */}
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="globe" android_material_icon_name="language" size={18} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </Text>
              </View>
            </View>

            {/* Quiet hours */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleTitle}>Quiet Hours</Text>
                  <Text style={styles.toggleSubtitle}>Suppress reminders during these hours</Text>
                </View>
                <Switch
                  value={prefs.quiet_hours_enabled}
                  onValueChange={(value) => {
                    console.log('[Reminders] Quiet hours toggled:', value);
                    updatePrefs({ quiet_hours_enabled: value });
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {prefs.quiet_hours_enabled && (
                <View style={styles.quietHoursRow}>
                  <Text style={styles.quietHoursLabel}>From</Text>
                  <Text style={styles.quietHoursTime}>{prefs.quiet_hours_start}</Text>
                  <Text style={styles.quietHoursLabel}>to</Text>
                  <Text style={styles.quietHoursTime}>{prefs.quiet_hours_end}</Text>
                </View>
              )}
            </View>

            {/* Missed day reminder */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleTitle}>Missed Day Reminder</Text>
                  <Text style={styles.toggleSubtitle}>A supportive nudge if you miss a day</Text>
                </View>
                <Switch
                  value={prefs.missed_day_reminder}
                  onValueChange={(value) => {
                    console.log('[Reminders] Missed day reminder toggled:', value);
                    updatePrefs({ missed_day_reminder: value });
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </>
        )}

        {/* Info footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Reminders are scheduled locally on your device. No personal information is sent to our servers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
  deniedBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 12,
  },
  deniedBannerText: {
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 20,
    fontWeight: '500',
  },
  openSettingsButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  openSettingsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeButton: {
    backgroundColor: colors.highlight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
  },
  timeHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  quietHoursLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quietHoursTime: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Web unsupported
  webUnsupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  webUnsupportedEmoji: {
    fontSize: 56,
  },
  webUnsupportedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  webUnsupportedText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
