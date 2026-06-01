-- Rename brand → collection (data preserved).
ALTER TABLE "brand" RENAME TO "collection";--> statement-breakpoint
ALTER TABLE "script" RENAME COLUMN "brand_id" TO "collection_id";--> statement-breakpoint

-- Constraints / indexes are auto-updated by Postgres on table rename,
-- but their names still say "brand_*". Rename for readability.
ALTER TABLE "collection" RENAME CONSTRAINT "brand_user_id_user_id_fk" TO "collection_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "script" RENAME CONSTRAINT "script_brand_id_brand_id_fk" TO "script_collection_id_collection_id_fk";--> statement-breakpoint
ALTER INDEX "brand_user_idx" RENAME TO "collection_user_idx";--> statement-breakpoint
ALTER INDEX "script_brand_idx" RENAME TO "script_collection_idx";--> statement-breakpoint

-- Default-flag column.
ALTER TABLE "collection" ADD COLUMN "is_default" boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- Mark each user's oldest collection as their default.
UPDATE "collection" SET "is_default" = true
WHERE id IN (
  SELECT DISTINCT ON (user_id) id FROM "collection" ORDER BY user_id, created_at ASC
);
