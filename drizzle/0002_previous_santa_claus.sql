CREATE TABLE "github_discord_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_mapping_id" uuid NOT NULL,
	"github_username" varchar(255) NOT NULL,
	"discord_user_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_discord_users_webhook_mapping_id_github_username_unique" UNIQUE("webhook_mapping_id","github_username")
);
--> statement-breakpoint
CREATE TABLE "ping_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_mapping_id" uuid NOT NULL,
	"event_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ping_settings_webhook_mapping_id_event_key_unique" UNIQUE("webhook_mapping_id","event_key")
);
--> statement-breakpoint
ALTER TABLE "github_discord_users" ADD CONSTRAINT "github_discord_users_webhook_mapping_id_webhook_mappings_id_fk" FOREIGN KEY ("webhook_mapping_id") REFERENCES "public"."webhook_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_discord_users" ADD CONSTRAINT "github_discord_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ping_settings" ADD CONSTRAINT "ping_settings_webhook_mapping_id_webhook_mappings_id_fk" FOREIGN KEY ("webhook_mapping_id") REFERENCES "public"."webhook_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ping_settings" ADD CONSTRAINT "ping_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;