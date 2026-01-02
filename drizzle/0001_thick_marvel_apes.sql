-- Add column as nullable first
ALTER TABLE "webhook_mappings" ADD COLUMN "user_id" uuid;--> statement-breakpoint

-- Attribute all existing mappings to the oldest user account
UPDATE "webhook_mappings" SET "user_id" = (
  SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1
) WHERE "user_id" IS NULL;--> statement-breakpoint

-- Make the column NOT NULL
ALTER TABLE "webhook_mappings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

-- Add the foreign key constraint
ALTER TABLE "webhook_mappings" ADD CONSTRAINT "webhook_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;