-- Migration: Add user_survey_sessions table for survey session management
-- This table stores survey configuration snapshots to prevent mid-survey changes from affecting user experience

CREATE TABLE `user_survey_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`survey_id` text NOT NULL,
	`survey_config` text NOT NULL,
	`survey_title` text NOT NULL,
	`survey_description` text,
	`can_take_multiple` integer DEFAULT 0,
	`is_anonymous` integer DEFAULT 0,
	`status` text DEFAULT 'active' NOT NULL,
	`progress` text,
	`created_at` integer,
	`updated_at` integer,
	`expires_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE cascade
);

-- Create indexes for performance
CREATE INDEX `user_survey_session_user_id_idx` ON `user_survey_sessions` (`user_id`);
CREATE INDEX `user_survey_session_survey_id_idx` ON `user_survey_sessions` (`survey_id`);
CREATE INDEX `user_survey_session_status_idx` ON `user_survey_sessions` (`status`);
CREATE INDEX `user_survey_session_user_survey_idx` ON `user_survey_sessions` (`user_id`,`survey_id`);
CREATE INDEX `user_survey_session_expires_at_idx` ON `user_survey_sessions` (`expires_at`);

