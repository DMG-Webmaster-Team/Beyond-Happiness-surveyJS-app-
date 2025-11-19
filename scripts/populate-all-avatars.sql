-- ==========================================
-- POPULATE AVATAR URLS FOR ALL CHARACTERS
-- ==========================================

-- Update avatar URLs based on match code
-- This ensures avatars load properly in PDFs and results page

UPDATE happiness_characters SET avatar_url = '/characters/00000.png' WHERE match = '00000';
UPDATE happiness_characters SET avatar_url = '/characters/00001.png' WHERE match = '00001';
UPDATE happiness_characters SET avatar_url = '/characters/00010.png' WHERE match = '00010';
UPDATE happiness_characters SET avatar_url = '/characters/00011.png' WHERE match = '00011';
UPDATE happiness_characters SET avatar_url = '/characters/00100.png' WHERE match = '00100';
UPDATE happiness_characters SET avatar_url = '/characters/00101.png' WHERE match = '00101';
UPDATE happiness_characters SET avatar_url = '/characters/00110.png' WHERE match = '00110';
UPDATE happiness_characters SET avatar_url = '/characters/00111.png' WHERE match = '00111';
UPDATE happiness_characters SET avatar_url = '/characters/01000.png' WHERE match = '01000';
UPDATE happiness_characters SET avatar_url = '/characters/01001.png' WHERE match = '01001';
UPDATE happiness_characters SET avatar_url = '/characters/01010.png' WHERE match = '01010';
UPDATE happiness_characters SET avatar_url = '/characters/01011.png' WHERE match = '01011';
UPDATE happiness_characters SET avatar_url = '/characters/01100.png' WHERE match = '01100';
UPDATE happiness_characters SET avatar_url = '/characters/01101.png' WHERE match = '01101';
UPDATE happiness_characters SET avatar_url = '/characters/01110.png' WHERE match = '01110';
UPDATE happiness_characters SET avatar_url = '/characters/01111.png' WHERE match = '01111';
UPDATE happiness_characters SET avatar_url = '/characters/10000.png' WHERE match = '10000';
UPDATE happiness_characters SET avatar_url = '/characters/10001.png' WHERE match = '10001';
UPDATE happiness_characters SET avatar_url = '/characters/10010.png' WHERE match = '10010';
UPDATE happiness_characters SET avatar_url = '/characters/10011.png' WHERE match = '10011';
UPDATE happiness_characters SET avatar_url = '/characters/10100.png' WHERE match = '10100';
UPDATE happiness_characters SET avatar_url = '/characters/10101.png' WHERE match = '10101';
UPDATE happiness_characters SET avatar_url = '/characters/10110.png' WHERE match = '10110';
UPDATE happiness_characters SET avatar_url = '/characters/10111.png' WHERE match = '10111';
UPDATE happiness_characters SET avatar_url = '/characters/11000.png' WHERE match = '11000';
UPDATE happiness_characters SET avatar_url = '/characters/11001.png' WHERE match = '11001';
UPDATE happiness_characters SET avatar_url = '/characters/11010.png' WHERE match = '11010';
UPDATE happiness_characters SET avatar_url = '/characters/11011.png' WHERE match = '11011';
UPDATE happiness_characters SET avatar_url = '/characters/11100.png' WHERE match = '11100';
UPDATE happiness_characters SET avatar_url = '/characters/11101.png' WHERE match = '11101';
UPDATE happiness_characters SET avatar_url = '/characters/11110.png' WHERE match = '11110';
UPDATE happiness_characters SET avatar_url = '/characters/11111.png' WHERE match = '11111';

-- Verify the updates
SELECT match, avatar_url, name 
FROM happiness_characters 
ORDER BY match;

-- Expected: All 32 characters should have avatar_url like '/characters/XXXXX.png'








