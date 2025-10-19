-- Migration to update happiness_questions table structure
-- Add new columns for category_values and essential_values

-- Add category_values column (rename from values)
ALTER TABLE happiness_questions 
ADD COLUMN category_values JSON;

-- Add essential_id column
ALTER TABLE happiness_questions 
ADD COLUMN essential_id INT;

-- Add essential_values column
ALTER TABLE happiness_questions 
ADD COLUMN essential_values JSON;

-- Migrate existing data from 'values' to 'category_values'
UPDATE happiness_questions 
SET category_values = values 
WHERE values IS NOT NULL;

-- Set default category_values for questions that don't have values
UPDATE happiness_questions 
SET category_values = JSON_ARRAY(200, 400, 600, 800, 1000)
WHERE category_values IS NULL;

-- Add foreign key constraint for essential_id
ALTER TABLE happiness_questions 
ADD CONSTRAINT fk_happiness_questions_essential_id 
FOREIGN KEY (essential_id) REFERENCES essentials(id);

-- Create indexes
CREATE INDEX happiness_questions_essential_id_idx ON happiness_questions(essential_id);

-- Drop the old 'values' column (commented out for safety)
-- ALTER TABLE happiness_questions DROP COLUMN values;
