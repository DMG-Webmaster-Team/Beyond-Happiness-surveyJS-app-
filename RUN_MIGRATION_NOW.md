# 🚨 URGENT: Run Database Migration

## Problem

The application is trying to query columns (`name_en`, `name_ar`, `description_en`, etc.) that don't exist in the database yet.

**Error:** `Unknown column 'name_en' in 'field list'`

## Solution

Run the database migration to add the multilingual columns:

### Option 1: Using MySQL Command Line

```bash
mysql -u root -p surveyjs_nextjs < drizzle/0009_add_multilingual_character_fields.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin

1. Open your MySQL client
2. Select the `surveyjs_nextjs` database
3. Run this SQL:

```sql
ALTER TABLE happiness_characters
ADD COLUMN name_en VARCHAR(255) AFTER name,
ADD COLUMN name_ar VARCHAR(255) AFTER name_en,
ADD COLUMN description_en TEXT AFTER description,
ADD COLUMN description_ar TEXT AFTER description_en,
ADD COLUMN detailed_description_en_html TEXT AFTER description_ar,
ADD COLUMN detailed_description_ar_html TEXT AFTER detailed_description_en_html;
```

### Option 3: Quick Fix Script

```bash
cd "/Users/Shared/Files From d.localized/Documents/projects/MV-Projects /surveyjs-nextjs"

# Run migration
cat drizzle/0009_add_multilingual_character_fields.sql | mysql -u root -p surveyjs_nextjs
```

## Verify Migration

After running the migration, verify it worked:

```sql
DESCRIBE happiness_characters;
```

You should see these new columns:

- `name_en`
- `name_ar`
- `description_en`
- `description_ar`
- `detailed_description_en_html`
- `detailed_description_ar_html`

## After Migration

1. **Restart your application**

   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Test the survey again**
   - Complete a happiness survey
   - Character name and description should now appear
   - PDF generation should work

## Temporary Workaround (If You Can't Run Migration Now)

If you can't run the migration immediately, I can modify the code to only query the legacy `name` and `description` fields until the migration is run.

---

**Status:** ❌ Migration NOT run yet  
**Action Required:** Run one of the commands above












