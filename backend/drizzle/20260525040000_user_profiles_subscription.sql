-- Add subscription fields to user_profiles table
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "account_type" text DEFAULT 'free' NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'inactive' NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "plan_type" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "subscription_start_date" timestamp with time zone;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "subscription_end_date" timestamp with time zone;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "trial_status" text DEFAULT 'none' NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'none' NOT NULL;
