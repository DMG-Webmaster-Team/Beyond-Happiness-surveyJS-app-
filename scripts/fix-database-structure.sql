-- ==========================================
-- FIX DATABASE STRUCTURE FOR DETAILED DESCRIPTIONS
-- ==========================================

-- Step 1: Verify table structure
SHOW COLUMNS FROM happiness_characters LIKE '%detailed%';

-- Step 2: Add columns if they don't exist (safe to run multiple times)
-- Note: This will error if columns already exist, which is fine
ALTER TABLE happiness_characters
ADD COLUMN IF NOT EXISTS detailed_description_en_html LONGTEXT NULL COMMENT 'Rich HTML description in English',
ADD COLUMN IF NOT EXISTS detailed_description_ar_html LONGTEXT NULL COMMENT 'Rich HTML description in Arabic';

-- Step 3: Verify all multilingual columns exist
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'happiness_characters'
  AND TABLE_SCHEMA = DATABASE()
  AND (COLUMN_NAME LIKE '%_en%' OR COLUMN_NAME LIKE '%_ar%' OR COLUMN_NAME LIKE '%detailed%')
ORDER BY ORDINAL_POSITION;

-- Step 4: Check current data status
SELECT 
    id,
    match,
    name,
    CASE 
        WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN CONCAT('✅ ', avatar_url)
        ELSE '❌ NULL or empty'
    END as avatar_status,
    CASE 
        WHEN description IS NOT NULL AND description != '' THEN CONCAT('✅ ', CHAR_LENGTH(description), ' chars')
        ELSE '❌ NULL or empty'
    END as description_status,
    CASE 
        WHEN detailed_description_en_html IS NOT NULL AND detailed_description_en_html != '' 
        THEN CONCAT('✅ ', CHAR_LENGTH(detailed_description_en_html), ' chars')
        ELSE '❌ NULL or empty'
    END as detailed_en_status,
    CASE 
        WHEN detailed_description_ar_html IS NOT NULL AND detailed_description_ar_html != '' 
        THEN CONCAT('✅ ', CHAR_LENGTH(detailed_description_ar_html), ' chars')
        ELSE '❌ NULL or empty'
    END as detailed_ar_status
FROM happiness_characters
ORDER BY match;

-- Step 5: Summary statistics
SELECT 
    COUNT(*) as total_characters,
    SUM(CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 1 ELSE 0 END) as has_avatar,
    SUM(CASE WHEN description IS NOT NULL AND description != '' THEN 1 ELSE 0 END) as has_description,
    SUM(CASE WHEN name_en IS NOT NULL THEN 1 ELSE 0 END) as has_name_en,
    SUM(CASE WHEN name_ar IS NOT NULL THEN 1 ELSE 0 END) as has_name_ar,
    SUM(CASE WHEN description_en IS NOT NULL THEN 1 ELSE 0 END) as has_description_en,
    SUM(CASE WHEN description_ar IS NOT NULL THEN 1 ELSE 0 END) as has_description_ar,
    SUM(CASE WHEN detailed_description_en_html IS NOT NULL AND detailed_description_en_html != '' THEN 1 ELSE 0 END) as has_detailed_en,
    SUM(CASE WHEN detailed_description_ar_html IS NOT NULL AND detailed_description_ar_html != '' THEN 1 ELSE 0 END) as has_detailed_ar
FROM happiness_characters;

-- Expected output:
-- If columns don't exist, first ALTER will create them
-- If data is missing, summary will show 0 for has_detailed_en and has_detailed_ar









