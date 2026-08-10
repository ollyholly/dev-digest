ALTER TABLE "conventions" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "evidence_start_line" integer;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "evidence_end_line" integer;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "scanned_sha" text;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "fingerprint" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "conventions" SET "status" = 'accepted' WHERE "accepted" = true;--> statement-breakpoint
CREATE INDEX "conventions_ws_repo_idx" ON "conventions" USING btree ("workspace_id","repo_id");--> statement-breakpoint
CREATE INDEX "conventions_ws_repo_fp_idx" ON "conventions" USING btree ("workspace_id","repo_id","fingerprint");