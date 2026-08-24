import { pgTable, uuid, text, timestamp, boolean, decimal, integer, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  stripePaymentMethodId: text('stripe_payment_method_id').notNull().unique(),
  type: text('type').notNull(), // 'card', 'paypal', etc.
  cardBrand: text('card_brand'), // 'Visa', 'Mastercard', 'Amex', 'Discover'
  cardLast4: text('card_last4'),
  cardExpMonth: text('card_exp_month'), // MM
  cardExpYear: text('card_exp_year'), // YY
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  programType: text('program_type').notNull(), // 'emotional', 'confidence', etc.
  planType: text('plan_type').notNull(), // 'monthly', 'lifetime', 'premium-lifetime'
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCustomerId: text('stripe_customer_id'),
  provider: text('provider').default('stripe').notNull(), // 'stripe', 'revenueCat'
  status: text('status').notNull(), // 'active', 'cancelled', 'expired', 'pending'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('usd').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null' }),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
  stripeInvoiceId: text('stripe_invoice_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('usd').notNull(),
  status: text('status').notNull(), // 'succeeded', 'pending', 'failed', 'refunded'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey().notNull(),
  fullName: text('full_name').notNull(),
  ageRange: text('age_range').notNull(), // 'under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'
  mainGoal: text('main_goal').notNull(), // 'emotional_control', 'build_confidence', etc.
  confidenceLevel: integer('confidence_level').notNull(), // 1-5
  emotionalControlLevel: integer('emotional_control_level').notNull(), // 1-5
  role: text('role').notNull().default('free'), // 'free', 'premium', 'admin'
  isActive: boolean('is_active').notNull().default(true),
  aiMessagesUsedToday: integer('ai_messages_used_today').notNull().default(0),
  aiMessagesResetAt: timestamp('ai_messages_reset_at', { withTimezone: true }).notNull().defaultNow(),
  // Subscription fields
  accountType: text('account_type').notNull().default('free'), // 'free', 'premium'
  subscriptionStatus: text('subscription_status').notNull().default('inactive'), // 'inactive', 'active', 'past_due', 'cancelled', 'expired', 'trialing'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  planType: text('plan_type'), // 'monthly', 'yearly', 'lifetime'
  subscriptionStartDate: timestamp('subscription_start_date', { withTimezone: true }),
  subscriptionEndDate: timestamp('subscription_end_date', { withTimezone: true }),
  trialStatus: text('trial_status').notNull().default('none'), // 'none', 'active', 'expired', 'converted'
  paymentStatus: text('payment_status').notNull().default('none'), // 'none', 'succeeded', 'failed', 'pending', 'refunded'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stripeCustomers = pgTable('stripe_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeConfig = pgTable('stripe_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  publishableKey: text('publishable_key'),
  webhookSecret: text('webhook_secret'),
  bootstrapped: boolean('bootstrapped').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  type: text('type').notNull(),
  data: jsonb('data'),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionReminders = pgTable('subscription_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'renewal_upcoming', 'renewal_failed'
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const appContent = pgTable('app_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(), // 'welcome', 'paywall', etc.
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  content: jsonb('content'), // Stores HTML, feature list, or other structured data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userOnboarding = pgTable('user_onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferredName: text('preferred_name'),
  primaryGoal: text('primary_goal'),
  biggestChallenge: text('biggest_challenge'),
  reminderTime: text('reminder_time'),
  assessmentStatus: text('assessment_status').notNull().default('not_started'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userAssessments = pgTable('user_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  emotionalIdentification: integer('emotional_identification').notNull(),
  responseControl: integer('response_control').notNull(),
  confidenceComposure: integer('confidence_composure').notNull(),
  overallScore: integer('overall_score').notNull(),
  assessmentType: text('assessment_type').notNull().default('baseline'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  currentDay: integer('current_day').notNull().default(1),
  totalDaysCompleted: integer('total_days_completed').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  weeklyCompletion: jsonb('weekly_completion').notNull().default([]),
  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userDayProgress = pgTable('user_day_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  lessonRead: boolean('lesson_read').notNull().default(false),
  drillCompleted: boolean('drill_completed').notNull().default(false),
  completed: boolean('completed').notNull().default(false),
  reflectionText: text('reflection_text'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userDayUnique: uniqueIndex('user_day_unique').on(t.userId, t.dayNumber),
}));

export const emotionalCheckins = pgTable('emotional_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  emotion: text('emotion').notNull(),
  intensity: integer('intensity').notNull().default(3),
  triggerNote: text('trigger_note'),
  chosenResponse: text('chosen_response'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userCheckinUnique: uniqueIndex('emotional_checkins_user_id_id_idx').on(t.userId, t.id),
}));

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Entry'),
  content: text('content').notNull().default(''),
  mood: text('mood'),
  tags: jsonb('tags').notNull().default([]),
  isPrivate: boolean('is_private').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userEntryUnique: uniqueIndex('journal_entries_user_id_id_idx').on(t.userId, t.id),
}));

export const userEntitlementGrants = pgTable('user_entitlement_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => userProfiles.userId),
  grantedBy: text('granted_by').notNull(),
  reason: text('reason').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('user_entitlement_grants_user_id_idx').on(t.userId),
}));

export const rcWebhookEvents = pgTable('rc_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerEventId: text('provider_event_id').notNull(),
  eventType: text('event_type').notNull(),
  appUserId: text('app_user_id'),
  originalAppUserId: text('original_app_user_id'),
  normalizedStatus: text('normalized_status'),
  eventAt: timestamp('event_at', { withTimezone: true }),
  processed: boolean('processed').notNull().default(false),
  processingError: text('processing_error'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, (t) => ({
  providerEventIdUnique: uniqueIndex('rc_webhook_events_provider_event_id_idx').on(t.providerEventId),
  appUserIdx: index('rc_webhook_events_app_user_id_idx').on(t.appUserId),
}));

export const userReminderPrefs = pgTable('user_reminder_prefs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  reminderTime: text('reminder_time').notNull().default('08:00'),
  timezone: text('timezone').notNull().default('UTC'),
  activeDays: jsonb('active_days').notNull().default([1, 2, 3, 4, 5, 6, 7]),
  quietHoursStart: text('quiet_hours_start'),
  quietHoursEnd: text('quiet_hours_end'),
  missedDayReminder: boolean('missed_day_reminder').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdUnique: uniqueIndex('user_reminder_prefs_user_id_idx').on(t.userId),
}));

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  eventName: text('event_name').notNull(),
  properties: jsonb('properties').notNull().default({}),
  sessionId: text('session_id'),
  platform: text('platform'),
  appVersion: text('app_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('analytics_events_user_id_idx').on(t.userId),
  eventNameIdx: index('analytics_events_event_name_idx').on(t.eventName),
  createdAtIdx: index('analytics_events_created_at_idx').on(t.createdAt),
}));

export const analyticsConsent = pgTable('analytics_consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  usageAnalyticsEnabled: boolean('usage_analytics_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdUnique: uniqueIndex('analytics_consent_user_id_idx').on(t.userId),
}));

export const accountDeletionRequests = pgTable('account_deletion_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  scheduledDeletionAt: timestamp('scheduled_deletion_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('pending'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  billingNote: text('billing_note'),
}, (t) => ({
  userIdIdx: index('account_deletion_requests_user_id_idx').on(t.userId),
}));