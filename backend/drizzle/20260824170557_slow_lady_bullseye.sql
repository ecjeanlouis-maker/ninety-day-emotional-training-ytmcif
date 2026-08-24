CREATE TABLE "rc_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"app_user_id" text,
	"original_app_user_id" text,
	"normalized_status" text,
	"event_at" timestamp with time zone,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rc_webhook_events_provider_event_id_idx" ON "rc_webhook_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "rc_webhook_events_app_user_id_idx" ON "rc_webhook_events" USING btree ("app_user_id");