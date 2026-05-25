-- Add columns to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'stripe' NOT NULL;

-- Add column to payment_transactions table
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text;

-- Add columns to user_profiles table
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS "stripe_customers" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"stripe_customer_id" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create stripe_config table
CREATE TABLE IF NOT EXISTS "stripe_config" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"publishable_key" text,
	"webhook_secret" text,
	"bootstrapped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create stripe_events table
CREATE TABLE IF NOT EXISTS "stripe_events" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"stripe_event_id" text NOT NULL UNIQUE,
	"type" text NOT NULL,
	"data" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create subscription_reminders table
CREATE TABLE IF NOT EXISTS "subscription_reminders" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"subscription_id" uuid NOT NULL,
	"type" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create app_content table
CREATE TABLE IF NOT EXISTS "app_content" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"subtitle" text,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
