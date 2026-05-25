import { pgTable, uuid, text, timestamp, boolean, decimal, integer, jsonb } from 'drizzle-orm/pg-core';
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