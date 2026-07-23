ALTER TABLE `game_scores` ADD `session_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `game_scores_session_idx` ON `game_scores` (`session_id`);