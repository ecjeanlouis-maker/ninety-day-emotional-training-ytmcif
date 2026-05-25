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
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"description" text,
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
	"status" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_methods_user_id_user_id_fk') THEN
    ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_transactions_user_id_user_id_fk') THEN
    ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
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
  IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_user_id_user_id_fk') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;