import { db } from "../src/db/client";
import { happinessCharacters } from "../src/db/schema/happiness";
import { eq, or } from "drizzle-orm";

async function fixCharacter17() {
  console.log("🔄 Fixing character ID 17 to be 'Playful Wanderer' (00001)...");

  try {
    // Update character ID 17 to be Playful Wanderer with match 00001
    await db
      .update(happinessCharacters)
      .set({
        nameEn: "Playful Wanderer",
        nameAr: "المتجول المرح",
        descriptionEn: "A free-spirited explorer who finds joy in discovery and new experiences. You value freedom and delight in life's surprises.",
        descriptionAr: "مستكشف حر الروح يجد الفرح في الاكتشاف والتجارب الجديدة. تقدر الحرية وتستمتع بمفاجآت الحياة.",
        match: "00001",
        avatarUrl: "/characters/00001.png",
        updatedAt: new Date(),
      })
      .where(eq(happinessCharacters.id, 17));

    console.log("✅ Updated character ID 17 to 'Playful Wanderer' (00001)");

    // Check if there's a duplicate character with ID 33 (the one we just added)
    const duplicate = await db
      .select()
      .from(happinessCharacters)
      .where(eq(happinessCharacters.id, 33))
      .limit(1);

    if (duplicate.length > 0 && duplicate[0].match === "00001") {
      console.log("🗑️  Removing duplicate character ID 33...");
      await db
        .delete(happinessCharacters)
        .where(eq(happinessCharacters.id, 33));
      console.log("✅ Removed duplicate character ID 33");
    }

    console.log("✅ Character fix completed!");
  } catch (error) {
    console.error("❌ Error fixing character:", error);
    throw error;
  }
}

// Run the function
fixCharacter17()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });






