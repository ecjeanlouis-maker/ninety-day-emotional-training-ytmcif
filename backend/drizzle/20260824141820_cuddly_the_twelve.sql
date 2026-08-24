CREATE TABLE "user_day_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"lesson_read" boolean DEFAULT false NOT NULL,
	"drill_completed" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"reflection_text" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_day_progress" ADD CONSTRAINT "user_day_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_day_unique" ON "user_day_progress" USING btree ("user_id","day_number");