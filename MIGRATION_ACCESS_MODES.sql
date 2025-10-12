-- Migration: Add Access Modes to Happiness Surveys
-- Description: Adds accessMode enum column to happiness_surveys and collectedUserData to happiness_results
-- Date: 2025-01-12

-- Add accessMode column to happiness_surveys
ALTER TABLE happiness_surveys 
ADD COLUMN access_mode ENUM('login', 'anonymous', 'collect_info') DEFAULT 'login' 
AFTER anonymous;

-- Update existing anonymous surveys to use appropriate access_mode
UPDATE happiness_surveys 
SET access_mode = 'anonymous' 
WHERE anonymous = TRUE;

-- Add collectedUserData column to happiness_results
ALTER TABLE happiness_results 
ADD COLUMN collected_user_data JSON NULL 
AFTER character_id;

-- Add comment to columns for documentation
ALTER TABLE happiness_surveys 
MODIFY COLUMN access_mode ENUM('login', 'anonymous', 'collect_info') DEFAULT 'login' 
COMMENT 'Access mode: login (requires auth & assignment), anonymous (no auth, no data), collect_info (no auth, collects user data)';

ALTER TABLE happiness_results 
MODIFY COLUMN collected_user_data JSON NULL 
COMMENT 'Collected user data for collect_info mode surveys (name, email, phone, gender, ageRange)';

