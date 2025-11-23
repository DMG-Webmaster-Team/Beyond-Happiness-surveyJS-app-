/**
 * Populate English defaults for all happiness characters
 */
import { db } from "../src/db/client";
import { happinessCharacters } from "../src/db/schema/happiness";
import { eq } from "drizzle-orm";

async function populateDefaults() {
  console.log("🚀 Populating English defaults for all characters\n");

  try {
    // Fetch all characters
    const allCharacters = await db
      .select()
      .from(happinessCharacters)
      .limit(100);

    console.log(`📋 Found ${allCharacters.length} characters to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const char of allCharacters) {
      // Only update if English fields are not set
      if (!char.nameEn && !char.descriptionEn) {
        console.log(`📝 Updating character #${char.id}: ${char.name}`);

        await db
          .update(happinessCharacters)
          .set({
            nameEn: char.name,
            descriptionEn: char.description,
          })
          .where(eq(happinessCharacters.id, char.id));

        updated++;
      } else {
        console.log(
          `⏭️  Skipping character #${char.id}: ${char.name} (already has English data)`
        );
        skipped++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   - Updated: ${updated} characters`);
    console.log(`   - Skipped: ${skipped} characters`);
    console.log(`\n🎉 English defaults populated successfully!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Add Arabic translations (name_ar, description_ar)`);
    console.log(`   2. Create detailed HTML descriptions`);
    console.log(`   3. Test the PDF generation with multilingual content`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error populating defaults:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    process.exit(1);
  }
}

populateDefaults();











