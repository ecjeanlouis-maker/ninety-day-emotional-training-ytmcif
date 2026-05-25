export type AppFeature =
  | 'dashboard'
  | 'ecct_day_1_3'
  | 'ecct_full_program'
  | 'all_daily_lessons'
  | 'confidence_challenges'
  | 'emotional_tracker_basic'
  | 'emotional_tracker_full'
  | 'journal_limited'
  | 'journal_unlimited'
  | 'progress_analytics'
  | 'ai_coach'
  | 'downloadable_worksheets'
  | 'premium_exercises';

export const FREE_FEATURES: AppFeature[] = [
  'dashboard',
  'ecct_day_1_3',
  'emotional_tracker_basic',
  'journal_limited',
  'ai_coach',
];

export const PREMIUM_FEATURES: AppFeature[] = [
  'dashboard',
  'ecct_day_1_3',
  'ecct_full_program',
  'all_daily_lessons',
  'confidence_challenges',
  'emotional_tracker_basic',
  'emotional_tracker_full',
  'journal_limited',
  'journal_unlimited',
  'progress_analytics',
  'ai_coach',
  'downloadable_worksheets',
  'premium_exercises',
];

export function hasAccess(role: 'free' | 'premium', feature: AppFeature): boolean {
  return (role === 'premium' ? PREMIUM_FEATURES : FREE_FEATURES).includes(feature);
}
