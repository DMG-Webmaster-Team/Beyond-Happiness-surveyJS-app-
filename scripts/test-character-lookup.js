/**
 * Test script to verify character lookup and database structure
 */

const { db } = require("../src/db/client.ts");
const { happinessCharacters } = require("../src/db/schema/happiness.ts");
const { eq } = require("drizzle-orm");

async function testCharacterLookup() {
  console.log("🧪 Testing Character Lookup\n");

  try {
    // Test 1: Check if table exists and has data
    console.log("1️⃣ Fetching all characters...");
    const allCharacters = await db.select().from(happinessCharacters).limit(3);

    console.log(`   Found ${allCharacters.length} characters`);
    if (allCharacters.length > 0) {
      const firstChar = allCharacters[0];
      console.log("   First character structure:");
      console.log("   - id:", firstChar.id);
      console.log("   - name:", firstChar.name);
      console.log(
        "   - description:",
        firstChar.description?.substring(0, 50) + "..."
      );
      console.log("   - match:", firstChar.match);
      console.log("   - nameEn:", firstChar.nameEn || "(not set)");
      console.log("   - nameAr:", firstChar.nameAr || "(not set)");
      console.log(
        "   - descriptionEn:",
        firstChar.descriptionEn ? "(exists)" : "(not set)"
      );
      console.log(
        "   - descriptionAr:",
        firstChar.descriptionAr ? "(exists)" : "(not set)"
      );
      console.log(
        "   - detailedDescriptionEnHtml:",
        firstChar.detailedDescriptionEnHtml ? "(exists)" : "(not set)"
      );
      console.log(
        "   - detailedDescriptionArHtml:",
        firstChar.detailedDescriptionArHtml ? "(exists)" : "(not set)"
      );
    }

    // Test 2: Lookup by match code (common test codes)
    console.log("\n2️⃣ Testing lookup by match code...");
    const testCodes = ["11111", "00000", "10101", "01010"];

    for (const code of testCodes) {
      const characters = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.match, code))
        .limit(1);

      if (characters.length > 0) {
        const char = characters[0];
        console.log(`   ✅ Code ${code}: Found "${char.name}"`);
      } else {
        console.log(`   ❌ Code ${code}: Not found`);
      }
    }

    // Test 3: Check database columns
    console.log("\n3️⃣ Checking database table structure...");
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'happiness_characters'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("   Columns in happiness_characters table:");
    columns.forEach((col) => {
      console.log(
        `   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${
          col.IS_NULLABLE === "YES" ? "nullable" : "required"
        })`
      );
    });

    // Test 4: Check if migration was run
    console.log("\n4️⃣ Checking for multilingual columns...");
    const hasMultilingual = columns.some(
      (col) => col.COLUMN_NAME === "name_en"
    );

    if (hasMultilingual) {
      console.log("   ✅ Multilingual columns exist!");
    } else {
      console.log("   ❌ Multilingual columns NOT found!");
      console.log("   📝 You need to run the migration:");
      console.log(
        "   mysql -u root -p surveyjs_nextjs < drizzle/0009_add_multilingual_character_fields.sql"
      );
    }

    console.log("\n✅ Test complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

testCharacterLookup();












