CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"age_range" text NOT NULL,
	"main_goal" text NOT NULL,
	"confidence_level" integer NOT NULL,
	"emotional_control_level" integer NOT NULL,
	"role" text DEFAULT 'free' NOT NULL,
	"ai_messages_used_today" integer DEFAULT 0 NOT NULL,
	"ai_messages_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
