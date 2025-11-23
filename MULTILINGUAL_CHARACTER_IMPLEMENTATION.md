# Multilingual Character Descriptions Implementation

## Overview

This implementation adds multilingual support for character names and descriptions, with separate fields for plain text (used in UI) and rich HTML (used in PDF only).

---

## Database Changes

### New Columns in `happiness_characters` Table

```sql
ALTER TABLE happiness_characters
ADD COLUMN name_en VARCHAR(255) AFTER name,
ADD COLUMN name_ar VARCHAR(255) AFTER name_en,
ADD COLUMN description_en TEXT AFTER description,
ADD COLUMN description_ar TEXT AFTER description_en,
ADD COLUMN detailed_description_en_html TEXT AFTER description_ar,
ADD COLUMN detailed_description_ar_html TEXT AFTER detailed_description_en_html;
```

### Field Purposes

| Field                          | Type         | Purpose                        | Used In                  |
| ------------------------------ | ------------ | ------------------------------ | ------------------------ |
| `name`                         | VARCHAR(100) | Legacy name (fallback)         | Backward compatibility   |
| `name_en`                      | VARCHAR(255) | English character name         | UI & PDF                 |
| `name_ar`                      | VARCHAR(255) | Arabic character name          | UI & PDF                 |
| `description`                  | TEXT         | Legacy description (fallback)  | Backward compatibility   |
| `description_en`               | TEXT         | English plain text description | **Results page UI only** |
| `description_ar`               | TEXT         | Arabic plain text description  | **Results page UI only** |
| `detailed_description_en_html` | TEXT         | English rich HTML description  | **PDF only (last page)** |
| `detailed_description_ar_html` | TEXT         | Arabic rich HTML description   | **PDF only (last page)** |

---

## Backend Implementation

### Updated Schema (`src/db/schema/happiness.ts`)

```typescript
export const happinessCharacters = mysqlTable("happiness_characters", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  nameAr: varchar("name_ar", { length: 255 }),
  description: text("description").notNull(),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  detailedDescriptionEnHtml: text("detailed_description_en_html"),
  detailedDescriptionArHtml: text("detailed_description_ar_html"),
  match: varchar("match", { length: 5 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  // ... timestamps
});
```

### Updated Service (`src/lib/services/happiness-scoring.ts`)

The `getMultilingualCharacter()` function now returns both descriptions:

```typescript
export async function getMultilingualCharacter(
  code: string,
  language: "en" | "ar" = "en"
): Promise<{
  id: number;
  name: string;
  description: string;
  detailedDescription: string;
  avatarUrl: string;
}> {
  const char = await db.select()...;

  return {
    id: char.id,
    name:
      language === "ar"
        ? char.nameAr || char.name
        : char.nameEn || char.name,
    description:
      language === "ar"
        ? char.descriptionAr || char.description
        : char.descriptionEn || char.description,
    detailedDescription:
      language === "ar"
        ? char.detailedDescriptionArHtml || ""
        : char.detailedDescriptionEnHtml || "",
    avatarUrl: char.avatarUrl || `/characters/${code}.png`,
  };
}
```

**Fallback Logic:**

- If language-specific field is empty, falls back to legacy field
- If detailed description is empty, returns empty string (not fallback)

---

## Frontend Implementation

### Results Page (`src/app/happiness/[surveyId]/results/page.tsx`)

**Uses plain text description only:**

```tsx
<p className="text-gray-700 leading-relaxed">{result.character.description}</p>
```

✅ **No changes needed** - already uses the correct field

---

## PDF Implementation

### PDF Generation (`src/app/api/generate-pdf/route.ts`)

**Layout Structure:**

1. **Page 1:**

   - Header (Beyond Happiness branding)
   - Character name and avatar
   - ~~Character description~~ (removed)
   - Overall happiness score

2. **Page 2:**

   - Dimensions overview (bar chart)
   - Detailed dimensions (progress bars with subtypes)

3. **Page 3 (conditional):**
   - Character detailed description (rich HTML)
   - Only appears if `detailedDescription` is not empty

**Implementation:**

```typescript
${
  result.character.detailedDescription
    ? `
  <!-- Character Detailed Description (Page Break) -->
  <div style="page-break-before: always; padding: 2rem;">
    <div style="background-color: white; border-radius: 0.5rem; padding: 2rem;">
      <h3 style="font-size: 1.5rem; font-weight: 700; text-align: center;">
        ${getText("characterDesc")}
      </h3>

      <div style="
        font-size: 1.125rem;
        line-height: 1.625;
        color: #374151;
        max-width: 48rem;
        margin: 0 auto;
        text-align: ${isRTL ? "right" : "justify"};
      ">
        ${result.character.detailedDescription}
      </div>
    </div>
  </div>
  `
    : ""
}
```

**Key Features:**

- Forced page break (`page-break-before: always`)
- RTL text alignment for Arabic
- Rich HTML content rendered directly
- Conditional rendering (only if content exists)

---

## Migration Guide

### Step 1: Run Database Migration

```bash
mysql -u root -p surveyjs_nextjs < drizzle/0009_add_multilingual_character_fields.sql
```

### Step 2: Populate Initial Data

```bash
mysql -u root -p surveyjs_nextjs < scripts/seed-multilingual-characters.sql
```

Or manually update characters:

```sql
UPDATE happiness_characters
SET
  name_en = 'Character Name',
  name_ar = 'اسم الشخصية',
  description_en = 'Short plain text description for UI',
  description_ar = 'وصف نصي قصير للواجهة',
  detailed_description_en_html = '<p><strong>Rich HTML content</strong> for PDF...</p>',
  detailed_description_ar_html = '<p><strong>محتوى HTML غني</strong> لملف PDF...</p>'
WHERE match = '10000';
```

### Step 3: Test

1. Complete a happiness survey
2. View results page - should show plain description
3. Download PDF - should show detailed HTML description on last page
4. Test both English and Arabic languages

---

## HTML Content Guidelines

### Allowed HTML Tags

- `<p>` - Paragraphs
- `<strong>`, `<em>` - Text emphasis
- `<ul>`, `<ol>`, `<li>` - Lists
- `<h4>`, `<h5>` - Subheadings
- `<div>` - Containers
- `<br>` - Line breaks

### Example Rich HTML Structure

```html
<div>
  <p>
    <strong>You embody wisdom and tranquility.</strong> Your happiness comes
    from deep reflection and meaningful connections.
  </p>

  <h4>Key Characteristics</h4>
  <ul>
    <li>You value quality over quantity in relationships</li>
    <li>You practice mindfulness and self-awareness</li>
    <li>You offer guidance and support to others</li>
  </ul>

  <h4>Your Strengths</h4>
  <p>
    Your balanced approach to life allows you to maintain harmony even in
    challenging situations. You excel at:
  </p>
  <ul>
    <li>Finding peace in solitude</li>
    <li>Offering wise counsel to others</li>
    <li>Maintaining emotional equilibrium</li>
  </ul>

  <h4>Tips for Greater Happiness</h4>
  <ol>
    <li>Continue your meditation practice</li>
    <li>Share your wisdom with others</li>
    <li>Embrace new experiences mindfully</li>
  </ol>
</div>
```

### Styling Notes

- The PDF renderer applies consistent styling automatically
- Font size: 1.125rem (18px)
- Line height: 1.625
- Text color: #374151 (gray)
- Text alignment: justify (LTR) or right (RTL)

---

## Backward Compatibility

### Fallback Behavior

1. **If multilingual fields are NULL:**

   - System falls back to legacy `name` and `description` fields
   - No errors or breaking changes

2. **If detailed description is empty:**

   - PDF simply omits the last page
   - No fallback to plain description (by design)

3. **Existing data:**
   - All existing characters continue to work
   - Can be migrated gradually

### Migration Strategy

**Phase 1:** Add columns (non-breaking)

```sql
-- Columns added as nullable
```

**Phase 2:** Populate English defaults

```sql
UPDATE happiness_characters
SET name_en = name, description_en = description
WHERE name_en IS NULL;
```

**Phase 3:** Add Arabic translations

```sql
-- Manually translate and update Arabic fields
```

**Phase 4:** Add detailed HTML descriptions

```sql
-- Create rich HTML content for each character
```

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Schema changes reflected in Drizzle
- [ ] English character names display correctly
- [ ] Arabic character names display correctly (RTL)
- [ ] Results page shows plain text description
- [ ] PDF shows detailed HTML description on last page
- [ ] PDF page breaks work correctly
- [ ] Fallback to legacy fields works
- [ ] Empty detailed description doesn't break PDF
- [ ] Both EN and AR languages work in PDF

---

## Files Modified

1. `drizzle/0009_add_multilingual_character_fields.sql` - Migration
2. `src/db/schema/happiness.ts` - Schema definition
3. `src/lib/services/happiness-scoring.ts` - Character fetching logic
4. `src/app/api/generate-pdf/route.ts` - PDF generation
5. `scripts/seed-multilingual-characters.sql` - Example seed data

---

## Future Enhancements

1. **Admin UI for editing:**

   - Add rich text editor for detailed descriptions
   - Preview functionality for HTML content
   - Bulk import/export for translations

2. **Content validation:**

   - HTML sanitization for security
   - Maximum length validation
   - Required field validation

3. **Additional languages:**
   - Add columns for more languages
   - Dynamic language selection
   - Translation management system

---

## Support

For questions or issues:

1. Check migration logs for SQL errors
2. Verify Drizzle schema matches database
3. Test with sample character data
4. Review PDF generation logs for rendering issues











