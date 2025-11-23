# 🚀 Quick Start: Run Multilingual Schema Migration

## Prerequisites

- ✅ Database has `name_en`, `name_ar`, `description_en`, `description_ar` columns
- ✅ All existing data has been migrated to English fields
- ✅ Backup of database has been created

## Step 1: Check Current Schema

```bash
mysql -h localhost -P 8889 -u root -proot happiness_survey -e "DESCRIBE happiness_characters;"
```

Expected output should show:

- `name` (old - will be removed)
- `name_en` (new)
- `name_ar` (new)
- `description` (old - will be removed)
- `description_en` (new)
- `description_ar` (new)

## Step 2: Run the Migration

### Option A: Using MySQL CLI

```bash
mysql -h localhost -P 8889 -u root -proot happiness_survey < drizzle/0010_remove_deprecated_character_fields.sql
```

### Option B: Using Drizzle Kit

```bash
npx drizzle-kit push:mysql
```

### Option C: Manual SQL

```sql
-- Connect to database first
USE happiness_survey;

-- Ensure data is copied (safety check)
UPDATE happiness_characters
SET
  name_en = COALESCE(name_en, name),
  description_en = COALESCE(description_en, description)
WHERE name_en IS NULL OR description_en IS NULL;

-- Drop old columns
ALTER TABLE happiness_characters
DROP COLUMN `name`,
DROP COLUMN `description`;
```

## Step 3: Verify Migration

```bash
mysql -h localhost -P 8889 -u root -proot happiness_survey -e "DESCRIBE happiness_characters;"
```

Expected output:

- ❌ `name` (should be gone)
- ✅ `name_en`
- ✅ `name_ar`
- ❌ `description` (should be gone)
- ✅ `description_en`
- ✅ `description_ar`
- ✅ `detailed_description_en_html`
- ✅ `detailed_description_ar_html`
- ✅ `match`
- ✅ `avatar_url`

## Step 4: Test Data Integrity

```sql
-- Check all characters have English names
SELECT id, name_en, name_ar FROM happiness_characters WHERE name_en IS NULL OR name_en = '';

-- Should return 0 rows
```

## Step 5: Restart Application

```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

## Step 6: Test in Browser

### Test 1: Admin Characters Tab

1. Navigate to: `http://localhost:4000/admin`
2. Click "Characters" tab
3. Toggle between English/Arabic buttons
4. Verify characters display in correct language

### Test 2: Edit a Character

1. Click "Edit" on any character
2. Verify you see both English and Arabic description fields
3. Make a small change
4. Save
5. Refresh page and verify changes persist

### Test 3: Take a Survey

1. Navigate to a survey
2. Complete it
3. View results
4. Verify character name appears correctly
5. Download PDF
6. Verify PDF shows correct character information

## Troubleshooting

### Error: "Unknown column 'name'"

✅ **Expected after migration** - This means the migration worked!

- Update any custom code that still references old `name` field
- Use `name_en` or `name_ar` instead

### Error: "Column 'name_en' cannot be null"

❌ **Problem** - Migration didn't copy data properly

- Run the UPDATE statement again:

```sql
UPDATE happiness_characters
SET name_en = name, description_en = description
WHERE name_en IS NULL;
```

### Characters not showing in admin

- Check browser console for errors
- Verify API response: `http://localhost:4000/api/happiness/characters`
- Should return objects with `nameEn`, `nameAr`, `descriptionEn`, `descriptionAr`

### PDF generation fails

- Check server logs
- Verify scoring service is using multilingual fields
- Test with: Take a survey → View results → Download PDF

## Rollback (Emergency Only)

⚠️ **Only if absolutely necessary**

```sql
-- Add back old columns (with defaults)
ALTER TABLE happiness_characters
ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN `description` TEXT NOT NULL DEFAULT '';

-- Copy English data to old columns
UPDATE happiness_characters
SET name = name_en, description = description_en;
```

Then revert the code changes via git:

```bash
git checkout HEAD~1 -- src/db/schema/happiness.ts
git checkout HEAD~1 -- src/components/happiness/admin/CharactersTab.tsx
git checkout HEAD~1 -- src/app/api/happiness/characters/[id]/route.ts
git checkout HEAD~1 -- src/app/api/happiness/results/route.ts
git checkout HEAD~1 -- src/lib/services/happiness-scoring.ts
```

## Success Criteria ✅

Migration is successful when:

- [ ] Database has NO `name` or `description` columns
- [ ] Database HAS `name_en`, `name_ar`, `description_en`, `description_ar`
- [ ] Admin characters tab loads without errors
- [ ] Language toggle switches character display
- [ ] Character editing works for both languages
- [ ] Survey results show correct character
- [ ] PDF generation works with multilingual data
- [ ] No TypeScript/linter errors

## Next Steps After Migration

1. Add Arabic translations for all 32 characters
2. Create rich HTML detailed descriptions
3. Test with real users
4. Deploy to staging
5. Deploy to production

---

**Need Help?** Check `MULTILINGUAL_SCHEMA_MIGRATION_COMPLETE.md` for detailed documentation.








