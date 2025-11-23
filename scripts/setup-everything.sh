#!/bin/bash

# ==========================================
# ONE-COMMAND SETUP SCRIPT
# Fixes database structure, avatars, and adds sample detailed descriptions
# ==========================================

echo "🚀 Starting complete database setup..."
echo ""

# Database credentials (adjust if needed)
DB_USER="root"
DB_NAME="happiness_survey"

# Prompt for password
echo "Enter MySQL password for user '$DB_USER':"
read -s DB_PASS

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Fixing database structure..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < scripts/fix-database-structure.sql
if [ $? -eq 0 ]; then
    echo "✅ Database structure fixed successfully"
else
    echo "❌ Error fixing database structure"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Adding avatar URLs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < scripts/populate-all-avatars.sql
if [ $? -eq 0 ]; then
    echo "✅ Avatar URLs added for all characters"
else
    echo "❌ Error adding avatar URLs"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Adding sample detailed descriptions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < scripts/add-detailed-descriptions.sql
if [ $? -eq 0 ]; then
    echo "✅ Detailed descriptions added for characters 00000 and 11111"
else
    echo "❌ Error adding detailed descriptions"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Verification:"
echo "Running quick check..."

# Quick verification
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    match,
    name,
    CASE WHEN avatar_url IS NOT NULL THEN '✅' ELSE '❌' END as avatar,
    CASE WHEN detailed_description_en_html IS NOT NULL THEN '✅' ELSE '❌' END as en_desc,
    CASE WHEN detailed_description_ar_html IS NOT NULL THEN '✅' ELSE '❌' END as ar_desc
FROM happiness_characters 
WHERE match IN ('00000', '11111')
ORDER BY match;
"

echo ""
echo "🎉 All done! You can now:"
echo "   1. Take a survey that results in character 00000 or 11111"
echo "   2. Generate a PDF"
echo "   3. See the avatar and detailed description in the PDF"
echo ""
echo "📝 To add more characters, use the template in QUICK_FIX_GUIDE.md"
echo ""









