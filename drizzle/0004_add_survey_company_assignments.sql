-- Migration: Add survey-company assignment tables for many-to-many relationships
-- This allows surveys to be assigned to multiple companies instead of just one

CREATE TABLE `survey_company_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`company_id` text NOT NULL,
	`assigned_at` integer,
	`assigned_by` text,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade
);

CREATE TABLE `happiness_survey_company_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`company_id` text NOT NULL,
	`assigned_at` integer,
	`assigned_by` text,
	FOREIGN KEY (`survey_id`) REFERENCES `happiness_surveys`(`id`) ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade
);

-- Create indexes for performance
CREATE INDEX `survey_company_assignment_survey_id_idx` ON `survey_company_assignments` (`survey_id`);
CREATE INDEX `survey_company_assignment_company_id_idx` ON `survey_company_assignments` (`company_id`);
CREATE INDEX `survey_company_assignment_survey_company_idx` ON `survey_company_assignments` (`survey_id`,`company_id`);

CREATE INDEX `happiness_survey_company_assignment_survey_id_idx` ON `happiness_survey_company_assignments` (`survey_id`);
CREATE INDEX `happiness_survey_company_assignment_company_id_idx` ON `happiness_survey_company_assignments` (`company_id`);
CREATE INDEX `happiness_survey_company_assignment_survey_company_idx` ON `happiness_survey_company_assignments` (`survey_id`,`company_id`);

