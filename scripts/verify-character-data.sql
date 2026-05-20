-- Quick verification script to check character data status

-- Check which characters have avatar URLs
SELECT 
    id,
    match,
    name,
    CASE 
        WHEN avatar_url IS NOT NULL THEN CONCAT('✅ ', avatar_url)
        ELSE '❌ NULL'
    END as avatar_status,
    CASE 
        WHEN description IS NOT NULL THEN CONCAT('✅ ', LENGTH(description), ' chars')
        ELSE '❌ NULL'
    END as description_status,
    CASE 
        WHEN detailed_description_en_html IS NOT NULL THEN CONCAT('✅ ', LENGTH(detailed_description_en_html), ' chars')
        ELSE '❌ NULL'
    END as detailed_en_status,
    CASE 
        WHEN detailed_description_ar_html IS NOT NULL THEN CONCAT('✅ ', LENGTH(detailed_description_ar_html), ' chars')
        ELSE '❌ NULL'
    END as detailed_ar_status
FROM happiness_characters
ORDER BY match;

-- Summary count
SELECT 
    COUNT(*) as total_characters,
    SUM(CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END) as has_avatar,
    SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as has_description,
    SUM(CASE WHEN detailed_description_en_html IS NOT NULL THEN 1 ELSE 0 END) as has_detailed_en,
    SUM(CASE WHEN detailed_description_ar_html IS NOT NULL THEN 1 ELSE 0 END) as has_detailed_ar
FROM happiness_characters;














