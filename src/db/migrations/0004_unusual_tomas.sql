CREATE TABLE `game_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`reason` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_blocks_kind_value_idx` ON `game_blocks` (`kind`,`value`);--> statement-breakpoint
CREATE INDEX `game_blocks_active_idx` ON `game_blocks` (`active`);--> statement-breakpoint
CREATE TABLE `game_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`display_name` text NOT NULL,
	`message` text NOT NULL,
	`score` integer,
	`ip_hash` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_comments_game_created_idx` ON `game_comments` (`game_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `game_comments_ip_created_idx` ON `game_comments` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `game_comments_status_created_idx` ON `game_comments` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`player_name` text NOT NULL,
	`score` integer NOT NULL,
	`accepted_names` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_scores_fingerprint_idx` ON `game_scores` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `game_scores_game_score_idx` ON `game_scores` (`game_id`,`score`,`duration_ms`);--> statement-breakpoint
CREATE INDEX `game_scores_ip_created_idx` ON `game_scores` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `game_scores_created_idx` ON `game_scores` (`created_at`);