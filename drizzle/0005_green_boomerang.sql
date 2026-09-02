PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_script` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`title` text,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`embedding_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_script`("id", "collection_id", "title", "content", "status", "source", "embedding_updated_at", "created_at", "updated_at") SELECT "id", "collection_id", "title", "content", "status", "source", "embedding_updated_at", "created_at", "updated_at" FROM `script`;--> statement-breakpoint
DROP TABLE `script`;--> statement-breakpoint
ALTER TABLE `__new_script` RENAME TO `script`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `script_collection_idx` ON `script` (`collection_id`);--> statement-breakpoint
-- Backfill: empty content ⇒ 待编写 (draft). Prior default 'unrecorded' meant
-- every content-less row was mislabelled as 已编写.
UPDATE `script` SET `status` = 'draft' WHERE TRIM(`content`) = '' AND `status` = 'unrecorded';