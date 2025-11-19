import { db } from "../src/db/client";
import { happinessCharacters } from "../src/db/schema/happiness";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function updateCharactersFromJSON() {
  console.log("🔄 Starting character update from JSON file...");

  try {
    // Read the multilingual characters JSON file
    const jsonPath = path.join(
      process.cwd(),
      "data/happiness-characters-multilingual.json"
    );
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at: ${jsonPath}`);
    }

    const charactersData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    console.log(`📂 Loaded ${charactersData.characters.length} characters from JSON`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // Update each character in the database based on match code
    for (const character of charactersData.characters) {
      try {
        // Find character by match code
        const existingCharacters = await db
          .select()
          .from(happinessCharacters)
          .where(eq(happinessCharacters.match, character.match))
          .limit(1);

        if (existingCharacters.length === 0) {
          console.log(
            `⚠️  Character with match code ${character.match} not found in database`
          );
          notFoundCount++;
          continue;
        }

        const existingCharacter = existingCharacters[0];

        // Update character with new data from JSON
        await db
          .update(happinessCharacters)
          .set({
            nameEn: character.name.en,
            nameAr: character.name.ar,
            descriptionEn: character.description.en,
            descriptionAr: character.description.ar,
            avatarUrl: character.avatar_url || `/characters/${character.match}.png`,
            updatedAt: new Date(),
          })
          .where(eq(happinessCharacters.id, existingCharacter.id));

        console.log(
          `✅ Updated character ID ${existingCharacter.id} (${character.match}): ${character.name.en}`
        );
        updatedCount++;
      } catch (error) {
        console.error(
          `❌ Error updating character ${character.match}:`,
          error
        );
        errorCount++;
      }
    }

    console.log("\n📊 Update Summary:");
    console.log(`   ✅ Successfully updated: ${updatedCount}`);
    console.log(`   ⚠️  Not found in database: ${notFoundCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total in JSON: ${charactersData.characters.length}`);

    if (updatedCount > 0) {
      console.log("\n🎉 Character update completed successfully!");
    } else {
      console.log("\n⚠️  No characters were updated.");
    }
  } catch (error) {
    console.error("❌ Error updating characters from JSON:", error);
    throw error;
  }
}

// Run the update function
if (require.main === module) {
  updateCharactersFromJSON()
    .then(() => {
      console.log("✅ Script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export default updateCharactersFromJSON;





