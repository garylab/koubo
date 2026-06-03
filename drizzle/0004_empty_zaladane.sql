-- Migrate every primary key from TEXT UUID/random-id to INTEGER auto-increment.
-- Foreign keys are remapped via temporary mapping tables keyed by stable
-- columns (email for user, name+created_at for collection, content+created_at
-- for script). _script_map is kept after the migration so the Vectorize
-- re-index step can translate old vector keys → new int ids.

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

-- 1) Create new tables
CREATE TABLE `__new_user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `__new_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `__new_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `__new_verification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `__new_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `__new_script` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`title` text,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'unrecorded' NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`embedding_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `__new_collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- 2) Mapping tables (kept; _script_map is needed for Vectorize reindex)
CREATE TABLE `_user_map` (`old_id` text PRIMARY KEY, `new_id` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `_collection_map` (`old_id` text PRIMARY KEY, `new_id` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `_script_map` (`old_id` text PRIMARY KEY, `new_id` integer NOT NULL);
--> statement-breakpoint

-- 3) Migrate users (ordered by created_at for stable id sequence)
INSERT INTO `__new_user` (`name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`)
  SELECT `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`
  FROM `user` ORDER BY `created_at`;
--> statement-breakpoint
INSERT INTO `_user_map` (`old_id`, `new_id`)
  SELECT u.`id`, n.`id` FROM `user` u JOIN `__new_user` n ON u.`email` = n.`email`;
--> statement-breakpoint

-- 4) Migrate sessions
INSERT INTO `__new_session` (`expires_at`, `token`, `created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id`)
  SELECT s.`expires_at`, s.`token`, s.`created_at`, s.`updated_at`, s.`ip_address`, s.`user_agent`, m.`new_id`
  FROM `session` s JOIN `_user_map` m ON s.`user_id` = m.`old_id`;
--> statement-breakpoint

-- 5) Migrate accounts
INSERT INTO `__new_account` (`account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at`)
  SELECT a.`account_id`, a.`provider_id`, m.`new_id`, a.`access_token`, a.`refresh_token`, a.`id_token`, a.`access_token_expires_at`, a.`refresh_token_expires_at`, a.`scope`, a.`password`, a.`created_at`, a.`updated_at`
  FROM `account` a JOIN `_user_map` m ON a.`user_id` = m.`old_id`;
--> statement-breakpoint

-- 6) Migrate verification
INSERT INTO `__new_verification` (`identifier`, `value`, `expires_at`, `created_at`, `updated_at`)
  SELECT `identifier`, `value`, `expires_at`, `created_at`, `updated_at` FROM `verification`;
--> statement-breakpoint

-- 7) Migrate collections
INSERT INTO `__new_collection` (`user_id`, `name`, `is_default`, `created_at`, `updated_at`)
  SELECT m.`new_id`, c.`name`, c.`is_default`, c.`created_at`, c.`updated_at`
  FROM `collection` c JOIN `_user_map` m ON c.`user_id` = m.`old_id`
  ORDER BY c.`created_at`;
--> statement-breakpoint
INSERT INTO `_collection_map` (`old_id`, `new_id`)
  SELECT c.`id`, n.`id`
  FROM `collection` c
  JOIN `_user_map` um ON c.`user_id` = um.`old_id`
  JOIN `__new_collection` n ON n.`user_id` = um.`new_id`
    AND n.`name` = c.`name`
    AND n.`created_at` = c.`created_at`;
--> statement-breakpoint

-- 8) Migrate scripts
INSERT INTO `__new_script` (`collection_id`, `title`, `content`, `status`, `source`, `embedding_updated_at`, `created_at`, `updated_at`)
  SELECT cm.`new_id`, s.`title`, s.`content`, s.`status`, s.`source`, s.`embedding_updated_at`, s.`created_at`, s.`updated_at`
  FROM `script` s JOIN `_collection_map` cm ON s.`collection_id` = cm.`old_id`
  ORDER BY s.`created_at`;
--> statement-breakpoint
INSERT INTO `_script_map` (`old_id`, `new_id`)
  SELECT s.`id`, n.`id`
  FROM `script` s
  JOIN `_collection_map` cm ON s.`collection_id` = cm.`old_id`
  JOIN `__new_script` n ON n.`collection_id` = cm.`new_id`
    AND n.`content` = s.`content`
    AND n.`created_at` = s.`created_at`;
--> statement-breakpoint

-- 9) Drop old tables and swap names
DROP TABLE `script`;
--> statement-breakpoint
DROP TABLE `collection`;
--> statement-breakpoint
DROP TABLE `verification`;
--> statement-breakpoint
DROP TABLE `account`;
--> statement-breakpoint
DROP TABLE `session`;
--> statement-breakpoint
DROP TABLE `user`;
--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;
--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;
--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;
--> statement-breakpoint
ALTER TABLE `__new_verification` RENAME TO `verification`;
--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;
--> statement-breakpoint
ALTER TABLE `__new_script` RENAME TO `script`;
--> statement-breakpoint

-- 10) Indices
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX `collection_user_idx` ON `collection` (`user_id`);
--> statement-breakpoint
CREATE INDEX `script_collection_idx` ON `script` (`collection_id`);
--> statement-breakpoint

-- 11) Drop the user/collection mapping tables. Keep _script_map for the
--    Vectorize re-index step; it'll be dropped by the admin reindex route
--    once vectors are repopulated.
DROP TABLE `_user_map`;
--> statement-breakpoint
DROP TABLE `_collection_map`;
--> statement-breakpoint

PRAGMA foreign_keys=ON;
