import { db } from "../src/db/client";
import { happinessCharacters } from "../src/db/schema/happiness";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Provided character data
const characterData = [
  { code: "00000", name_en: "Curious Nomad", name_ar: "الرحّال الفضولي" },
  { code: "00011", name_en: "Distracted Connoisseur", name_ar: "الذوّاق المشتت" },
  { code: "00010", name_en: "Weary Diligent", name_ar: "المجتهد المُرهق" },
  { code: "01101", name_en: "Vibrant Free Spirit", name_ar: "الروح الحرة النشطة" },
  { code: "00100", name_en: "Aimless Wanderer", name_ar: "الرحّال التائه" },
  { code: "00101", name_en: "Carefree Enthusiast", name_ar: "المتحمس الهادئ" },
  { code: "00110", name_en: "Persistent Wanderer", name_ar: "الرحّال المُثابر" },
  { code: "00111", name_en: "Passionate Dabbler", name_ar: "المجرب الشغوف" },
  { code: "01000", name_en: "Energetic Drifter", name_ar: "المتجول النشيط" },
  { code: "01001", name_en: "Spirited Enjoyer", name_ar: "المُحب النشيط للحياة" },
  { code: "01010", name_en: "Determined Striver", name_ar: "المثابر المصمم" },
  { code: "01011", name_en: "Joyful Dynamo", name_ar: "القوة المبهجة" },
  { code: "01100", name_en: "Independent Sprinter", name_ar: "العدّاء المستقل" },
  { code: "00001", name_en: "Playful Wanderer", name_ar: "المرح المتنقل" },
  { code: "01110", name_en: "Tenacious Seeker", name_ar: "الباحث العنيد" },
  { code: "01111", name_en: "Thriving Adventurer", name_ar: "المُغامر المُزدهر" },
  { code: "10000", name_en: "Purposeful Stumbler", name_ar: "المتعثّر الهادف" },
  { code: "10001", name_en: "Fulfilled Dreamer", name_ar: "الحالم المُحقق" },
  { code: "10010", name_en: "Resolute Anchor", name_ar: "المرتكز الحازم" },
  { code: "10011", name_en: "Devoted Optimist", name_ar: "المتفائل المُخلص" },
  { code: "10100", name_en: "Unbound Visionary", name_ar: "الحالم المتحرر" },
  { code: "10101", name_en: "Inspired Wanderer", name_ar: "الرحّال المُلهَم" },
  { code: "10110", name_en: "Dedicated Pathfinder", name_ar: "الرائد المُكرّس" },
  { code: "10111", name_en: "Enlightened Explorer", name_ar: "المُستكشف المُستنير" },
  { code: "11000", name_en: "Driven Conqueror", name_ar: "الفاتح الطموح" },
  { code: "11001", name_en: "Spirited Seeker", name_ar: "الباحث الحيوي" },
  { code: "11010", name_en: "Committed Dynamo", name_ar: "الدينامو الملتزم" },
  { code: "11011", name_en: "Energetic Champion", name_ar: "البطل النشيط" },
  { code: "11100", name_en: "Vibrant Navigator", name_ar: "المُوجه النشط" },
  { code: "11101", name_en: "Joyful Adventurer", name_ar: "المُغامر السعيد" },
  { code: "11110", name_en: "Harmonious Achiever", name_ar: "المنجز المتوازن" },
  { code: "11111", name_en: "Radiant Fulfiller", name_ar: "المُنجز المتألق" },
];

// Create a map for quick lookup
const nameMap = new Map(
  characterData.map((c) => [c.code, { en: c.name_en, ar: c.name_ar }])
);

function updateJSONFile(filePath: string): { updated: number; notFound: number } {
  console.log(`📂 Updating ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return { updated: 0, notFound: 0 };
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let updatedCount = 0;
  let notFoundCount = 0;

  // Update each character
  for (const character of data.characters) {
    const newNames = nameMap.get(character.match);
    if (newNames) {
      character.name.en = newNames.en;
      character.name.ar = newNames.ar;
      updatedCount++;
    } else {
      console.warn(`⚠️  No new name found for code: ${character.match}`);
      notFoundCount++;
    }
  }

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`   ✅ Updated ${updatedCount} characters`);
  if (notFoundCount > 0) {
    console.log(`   ⚠️  ${notFoundCount} characters not found in provided data`);
  }

  return { updated: updatedCount, notFound: notFoundCount };
}

async function updateDatabase(): Promise<{
  updated: number;
  notFound: number;
  created: number;
}> {
  console.log("🔄 Updating database...");

  let updatedCount = 0;
  let notFoundCount = 0;
  let createdCount = 0;

  for (const charData of characterData) {
    try {
      // Find character by match code
      const existingCharacters = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.match, charData.code))
        .limit(1);

      if (existingCharacters.length === 0) {
        // Character doesn't exist, create it
        console.log(`   📝 Creating new character with match code ${charData.code}...`);
        
        // Find the highest ID
        const allCharacters = await db
          .select()
          .from(happinessCharacters)
          .orderBy(happinessCharacters.id);
        
        const maxId = allCharacters.length > 0 
          ? Math.max(...allCharacters.map(c => c.id))
          : 0;
        
        const nextId = maxId + 1;

        await db.insert(happinessCharacters).values({
          id: nextId,
          nameEn: charData.name_en,
          nameAr: charData.name_ar,
          descriptionEn: `Description for ${charData.name_en}`,
          descriptionAr: `وصف لـ ${charData.name_ar}`,
          match: charData.code,
          avatarUrl: `/characters/${charData.code}.png`,
        });

        createdCount++;
        console.log(`   ✅ Created character ID ${nextId}: ${charData.name_en} (${charData.code})`);
      } else {
        // Update existing character
        const existingCharacter = existingCharacters[0];

        await db
          .update(happinessCharacters)
          .set({
            nameEn: charData.name_en,
            nameAr: charData.name_ar,
            updatedAt: new Date(),
          })
          .where(eq(happinessCharacters.id, existingCharacter.id));

        updatedCount++;
        console.log(
          `   ✅ Updated character ID ${existingCharacter.id}: ${charData.name_en} (${charData.code})`
        );
      }
    } catch (error) {
      console.error(`   ❌ Error processing character ${charData.code}:`, error);
      notFoundCount++;
    }
  }

  return { updated: updatedCount, notFound: notFoundCount, created: createdCount };
}

async function verifySync(): Promise<boolean> {
  console.log("\n🔍 Verifying sync...");

  try {
    // Check JSON files
    const jsonPath = path.join(
      process.cwd(),
      "data/happiness-characters-multilingual.json"
    );
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    // Check database
    const dbCharacters = await db
      .select()
      .from(happinessCharacters)
      .orderBy(happinessCharacters.id);

    let allMatch = true;
    const missingCodes: string[] = [];

    // Verify all provided codes exist
    for (const charData of characterData) {
      const jsonChar = jsonData.characters.find(
        (c: any) => c.match === charData.code
      );
      const dbChar = dbCharacters.find((c) => c.match === charData.code);

      if (!jsonChar) {
        console.error(`❌ Missing in JSON: ${charData.code} - ${charData.name_en}`);
        allMatch = false;
        missingCodes.push(charData.code);
      } else if (
        jsonChar.name.en !== charData.name_en ||
        jsonChar.name.ar !== charData.name_ar
      ) {
        console.error(
          `❌ Name mismatch in JSON for ${charData.code}: Expected "${charData.name_en}" / "${charData.name_ar}", got "${jsonChar.name.en}" / "${jsonChar.name.ar}"`
        );
        allMatch = false;
      }

      if (!dbChar) {
        console.error(`❌ Missing in database: ${charData.code} - ${charData.name_en}`);
        allMatch = false;
        missingCodes.push(charData.code);
      } else if (
        dbChar.nameEn !== charData.name_en ||
        dbChar.nameAr !== charData.name_ar
      ) {
        console.error(
          `❌ Name mismatch in database for ${charData.code}: Expected "${charData.name_en}" / "${charData.name_ar}", got "${dbChar.nameEn}" / "${dbChar.nameAr}"`
        );
        allMatch = false;
      }
    }

    if (allMatch) {
      console.log("✅ All 32 characters verified and match provided data!");
      console.log(`   📊 JSON file: ${jsonData.characters.length} characters`);
      console.log(`   📊 Database: ${dbCharacters.length} characters`);
    } else {
      console.error(`❌ Verification failed. Missing codes: ${missingCodes.join(", ")}`);
    }

    return allMatch;
  } catch (error) {
    console.error("❌ Error during verification:", error);
    return false;
  }
}

async function main() {
  console.log("🔄 Starting complete character name sync...\n");

  // Step 1: Update JSON files
  console.log("📝 Step 1: Updating JSON files...");
  const jsonFiles = [
    path.join(process.cwd(), "data/happiness-characters-multilingual.json"),
    path.join(process.cwd(), "public/data/happiness-characters-multilingual.json"),
  ];

  let totalUpdated = 0;
  let totalNotFound = 0;

  for (const filePath of jsonFiles) {
    const result = updateJSONFile(filePath);
    totalUpdated += result.updated;
    totalNotFound += result.notFound;
  }

  console.log(`\n✅ JSON files updated: ${totalUpdated} characters`);

  // Step 2: Update database
  console.log("\n📝 Step 2: Updating database...");
  const dbResult = await updateDatabase();
  console.log(`\n✅ Database updated:`);
  console.log(`   ✅ Updated: ${dbResult.updated}`);
  console.log(`   📝 Created: ${dbResult.created}`);
  console.log(`   ⚠️  Not found: ${dbResult.notFound}`);

  // Step 3: Verify
  console.log("\n📝 Step 3: Verifying sync...");
  const verified = await verifySync();

  if (verified) {
    console.log("\n🎉 Character name sync completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - JSON files: ${totalUpdated} characters updated`);
    console.log(`   - Database: ${dbResult.updated} updated, ${dbResult.created} created`);
    console.log(`   - All 32 characters verified ✓`);
  } else {
    console.log("\n⚠️  Sync completed but verification found issues. Please review the output above.");
  }
}

// Run the sync function
main()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });





