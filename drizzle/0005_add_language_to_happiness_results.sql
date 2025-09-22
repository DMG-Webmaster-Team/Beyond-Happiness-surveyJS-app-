-- Add language column to happiness_results table
ALTER TABLE happiness_results ADD COLUMN language TEXT DEFAULT 'en';

-- Create index on language column for better query performance
CREATE INDEX happiness_results_language_idx ON happiness_results(language);
