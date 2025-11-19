-- Add multilingual fields to happiness_characters table
-- This enables separate plain and detailed HTML descriptions per language

ALTER TABLE happiness_characters
ADD COLUMN name_en VARCHAR(255) AFTER name,
ADD COLUMN name_ar VARCHAR(255) AFTER name_en,
ADD COLUMN description_en TEXT AFTER description,
ADD COLUMN description_ar TEXT AFTER description_en,
ADD COLUMN detailed_description_en_html TEXT AFTER description_ar,
ADD COLUMN detailed_description_ar_html TEXT AFTER detailed_description_en_html;

-- Optional: Populate English defaults from existing data
-- UPDATE happiness_characters SET name_en = name, description_en = description WHERE name_en IS NULL;











