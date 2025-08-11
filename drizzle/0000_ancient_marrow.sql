CREATE TABLE `admins` (
	`id` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`name` varchar(255),
	`otp` varchar(10),
	`assigned_survey_id` varchar(128),
	`has_submitted` boolean DEFAULT false,
	`submitted_at` timestamp,
	`company_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`definition` json NOT NULL,
	`can_take_multiple` boolean DEFAULT false,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` varchar(128) NOT NULL,
	`survey_id` varchar(128) NOT NULL,
	`user_id` varchar(128),
	`admin_id` varchar(128),
	`data` json NOT NULL,
	`submitted_at` timestamp DEFAULT (now()),
	CONSTRAINT `results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_created_by_admins_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_admin_id_admins_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_email_idx` ON `admins` (`email`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `assigned_survey_idx` ON `users` (`assigned_survey_id`);--> statement-breakpoint
CREATE INDEX `survey_created_by_idx` ON `surveys` (`created_by`);--> statement-breakpoint
CREATE INDEX `survey_created_at_idx` ON `surveys` (`created_at`);--> statement-breakpoint
CREATE INDEX `result_survey_id_idx` ON `results` (`survey_id`);--> statement-breakpoint
CREATE INDEX `result_user_id_idx` ON `results` (`user_id`);--> statement-breakpoint
CREATE INDEX `result_submitted_at_idx` ON `results` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `result_survey_user_idx` ON `results` (`survey_id`,`user_id`);