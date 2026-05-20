-- Remove deprecated fields from happiness_characters table
-- The multilingual fields (name_en, name_ar, description_en, description_ar) are now the primary fields

-- First, ensure all data is copied to the new fields (safety check)
UPDATE happiness_characters 
SET 
  name_en = COALESCE(name_en, name),
  description_en = COALESCE(description_en, description)
WHERE name_en IS NULL OR description_en IS NULL;

-- Now drop the deprecated columns
ALTER TABLE happiness_characters
DROP COLUMN `name`,
DROP COLUMN `description`;














