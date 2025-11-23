import { db } from "../src/db/client";
import { happinessCharacters } from "../src/db/schema/happiness";
import { eq } from "drizzle-orm";

async function addMissingCharacter() {
  console.log("🔄 Adding missing character 'Playful Wanderer' (00001)...");

  try {
    // Check if character already exists
    const existing = await db
      .select()
      .from(happinessCharacters)
      .where(eq(happinessCharacters.match, "00001"))
      .limit(1);

    if (existing.length > 0) {
      console.log("✅ Character with match code 00001 already exists");
      console.log("   Updating existing character...");
      
      await db
        .update(happinessCharacters)
        .set({
          nameEn: "Playful Wanderer",
          nameAr: "المتجول المرح",
          descriptionEn: "A free-spirited explorer who finds joy in discovery and new experiences. You value freedom and delight in life's surprises.",
          descriptionAr: "مستكشف حر الروح يجد الفرح في الاكتشاف والتجارب الجديدة. تقدر الحرية وتستمتع بمفاجآت الحياة.",
          avatarUrl: "/characters/00001.png",
          updatedAt: new Date(),
        })
        .where(eq(happinessCharacters.id, existing[0].id));
      
      console.log(`✅ Updated character ID ${existing[0].id}`);
      return;
    }

    // Find the highest ID to determine next ID
    const allCharacters = await db
      .select()
      .from(happinessCharacters)
      .orderBy(happinessCharacters.id);
    
    const maxId = allCharacters.length > 0 
      ? Math.max(...allCharacters.map(c => c.id))
      : 0;
    
    const nextId = maxId + 1;

    console.log(`📝 Inserting new character with ID ${nextId}...`);

    // Insert new character
    await db.insert(happinessCharacters).values({
      id: nextId,
      nameEn: "Playful Wanderer",
      nameAr: "المتجول المرح",
      descriptionEn: "A free-spirited explorer who finds joy in discovery and new experiences. You value freedom and delight in life's surprises.",
      descriptionAr: "مستكشف حر الروح يجد الفرح في الاكتشاف والتجارب الجديدة. تقدر الحرية وتستمتع بمفاجآت الحياة.",
      match: "00001",
      avatarUrl: "/characters/00001.png",
    });

    console.log(`✅ Successfully added character ID ${nextId}: Playful Wanderer (00001)`);
  } catch (error) {
    console.error("❌ Error adding character:", error);
    throw error;
  }
}

// Run the function
addMissingCharacter()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });






