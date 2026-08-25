import { apiPost } from './api';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Allowlisted event names — must match backend
export type AnalyticsEventName =
  | 'onboarding_started' | 'onboarding_completed' | 'account_created' | 'login_success'
  | 'assessment_completed' | 'day_viewed' | 'exercise_started' | 'exercise_completed'
  | 'day_completed' | 'reminder_enabled' | 'reminder_disabled' | 'reminder_opened'
  | 'paywall_viewed' | 'purchase_started' | 'purchase_canceled' | 'purchase_verification_pending'
  | 'purchase_verified' | 'purchase_failed' | 'restore_started' | 'restore_verified' | 'restore_failed'
  | 'journal_entry_created' | 'account_export_requested' | 'account_deletion_requested' | 'account_deletion_completed'
  | 'assessment_skipped' | 'program_intro_viewed' | 'start_journey_tapped' | 'program_card_opened' | 'day_start_routed'
  | 'narration_started' | 'narration_completed' | 'narration_stopped'
  | 'music_enabled' | 'music_disabled' | 'audio_error';

// Safe properties — no free text, no sensitive data
export type SafeEventProperties = Record<string, string | number | boolean | null>;

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) sessionId = Math.random().toString(36).slice(2);
  return sessionId;
}

// Queue events and flush in batches
const eventQueue: { event_name: string; properties: SafeEventProperties; timestamp: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(name: AnalyticsEventName, properties: SafeEventProperties = {}): void {
  console.log('[Analytics] trackEvent:', name, properties);
  eventQueue.push({
    event_name: name,
    properties,
    timestamp: new Date().toISOString(),
  });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 2000);
  }
}

async function flushEvents(): Promise<void> {
  flushTimer = null;
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, 20);
  console.log('[Analytics] Flushing', batch.length, 'events to /api/analytics/events');
  try {
    await apiPost('/api/analytics/events', {
      events: batch.map(e => ({
        ...e,
        session_id: getSessionId(),
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? 'unknown',
      })),
    });
    console.log('[Analytics] Flush successful');
  } catch {
    // Silently fail — analytics must never break the app
  }
}
