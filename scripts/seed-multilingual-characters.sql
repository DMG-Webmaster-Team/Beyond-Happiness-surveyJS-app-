-- Example seed script for multilingual character descriptions
-- This demonstrates how to populate the new multilingual fields

-- Example 1: Update a character with full multilingual content
UPDATE happiness_characters
SET
  name_en = 'The Optimistic Explorer',
  name_ar = 'المستكشف المتفائل',
  description_en = 'You see every challenge as an opportunity.',
  description_ar = 'ترى كل تحدٍ كفرصة.',
  detailed_description_en_html = '<p><strong>You are resilient and curious.</strong> Your happiness stems from growth and exploration.</p><ul><li>You take risks and embrace uncertainty</li><li>You inspire others with your positive outlook</li><li>You find joy in learning and discovery</li></ul><p>Your unique combination of high vitality and engagement means you thrive when actively pursuing meaningful goals.</p>',
  detailed_description_ar_html = '<p><strong>أنت مرن وفضولي.</strong> سعادتك تأتي من النمو والاكتشاف.</p><ul><li>تأخذ المخاطر وتتقبل عدم اليقين</li><li>تلهم الآخرين بنظرتك الإيجابية</li><li>تجد الفرح في التعلم والاكتشاف</li></ul><p>مزيجك الفريد من الحيوية العالية والانخراط يعني أنك تزدهر عند السعي بنشاط وراء أهداف ذات مغزى.</p>'
WHERE match = '10000';

-- Example 2: Update another character
UPDATE happiness_characters
SET
  name_en = 'The Peaceful Sage',
  name_ar = 'الحكيم المسالم',
  description_en = 'You find contentment in simplicity and inner peace.',
  description_ar = 'تجد الرضا في البساطة والسلام الداخلي.',
  detailed_description_en_html = '<p><strong>You embody wisdom and tranquility.</strong> Your happiness comes from deep reflection and meaningful connections.</p><ul><li>You value quality over quantity in relationships</li><li>You practice mindfulness and self-awareness</li><li>You offer guidance and support to others</li></ul><p>Your balanced approach to life allows you to maintain harmony even in challenging situations.</p>',
  detailed_description_ar_html = '<p><strong>أنت تجسد الحكمة والهدوء.</strong> سعادتك تأتي من التأمل العميق والروابط ذات المغزى.</p><ul><li>تقدر الجودة على الكمية في العلاقات</li><li>تمارس اليقظة الذهنية والوعي الذاتي</li><li>تقدم التوجيه والدعم للآخرين</li></ul><p>نهجك المتوازن في الحياة يسمح لك بالحفاظ على الانسجام حتى في المواقف الصعبة.</p>'
WHERE match = '01111';

-- Example 3: Update with English only (Arabic will fallback to base fields)
UPDATE happiness_characters
SET
  name_en = 'The Creative Dreamer',
  description_en = 'You live in a world of imagination and possibilities.',
  detailed_description_en_html = '<p><strong>You are an artist at heart.</strong> Your happiness flows from creative expression and aesthetic experiences.</p><ul><li>You see beauty in unexpected places</li><li>You express yourself through various art forms</li><li>You inspire others with your unique perspective</li></ul><p>Your high delight score reflects your ability to find joy in the creative process itself.</p>'
WHERE match = '01000';

-- Example 4: Populate all 32 characters with basic multilingual data
-- (This is a template - you would need to customize for each character)

-- For characters without multilingual data yet, copy from base fields
UPDATE happiness_characters
SET
  name_en = name,
  description_en = description
WHERE name_en IS NULL;

-- Note: detailed_description fields should be populated manually with rich HTML content
-- The HTML can include:
-- - <p> paragraphs
-- - <strong>, <em> for emphasis
-- - <ul>, <ol>, <li> for lists
-- - <h4>, <h5> for subheadings
-- - Basic inline styles if needed

-- Example of rich HTML structure:
/*
<div>
  <p><strong>Introduction paragraph with emphasis.</strong></p>
  
  <h4>Key Characteristics</h4>
  <ul>
    <li>First characteristic</li>
    <li>Second characteristic</li>
    <li>Third characteristic</li>
  </ul>
  
  <h4>Your Strengths</h4>
  <p>Detailed explanation of strengths...</p>
  
  <h4>Growth Areas</h4>
  <p>Suggestions for personal development...</p>
  
  <h4>Tips for Happiness</h4>
  <ol>
    <li>First actionable tip</li>
    <li>Second actionable tip</li>
    <li>Third actionable tip</li>
  </ol>
</div>
*/














