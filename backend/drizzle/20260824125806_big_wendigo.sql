CREATE TABLE IF NOT EXISTS "app_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_content_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_payment_method_id" text NOT NULL,
	"type" text NOT NULL,
	"card_brand" text,
	"card_last4" text,
	"card_exp_month" text,
	"card_exp_year" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" uuid,
	"payment_method_id" uuid,
	"stripe_payment_intent_id" text NOT NULL,
	"stripe_invoice_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publishable_key" text,
	"webhook_secret" text,
	"bootstrapped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" uuid NOT NULL,
	"type" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"program_type" text NOT NULL,
	"plan_type" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"status" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"age_range" text NOT NULL,
	"main_goal" text NOT NULL,
	"confidence_level" integer NOT NULL,
	"emotional_control_level" integer NOT NULL,
	"role" text DEFAULT 'free' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"ai_messages_used_today" integer DEFAULT 0 NOT NULL,
	"ai_messages_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_type" text DEFAULT 'free' NOT NULL,
	"subscription_status" text DEFAULT 'inactive' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_type" text,
	"subscription_start_date" timestamp with time zone,
	"subscription_end_date" timestamp with time zone,
	"trial_status" text DEFAULT 'none' NOT NULL,
	"payment_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_methods_user_id_user_id_fk') THEN
      ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_transactions_user_id_user_id_fk') THEN
      ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_transactions_subscription_id_subscriptions_id_fk') THEN
    ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_transactions_payment_method_id_payment_methods_id_fk') THEN
    ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_user_id_user_id_fk') THEN
      ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscription_reminders_user_id_user_id_fk') THEN
      ALTER TABLE "subscription_reminders" ADD CONSTRAINT "subscription_reminders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscription_reminders_subscription_id_subscriptions_id_fk') THEN
    ALTER TABLE "subscription_reminders" ADD CONSTRAINT "subscription_reminders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_user_id_user_id_fk') THEN
      ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;