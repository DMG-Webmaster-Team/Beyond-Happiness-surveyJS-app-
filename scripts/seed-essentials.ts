import { db } from "../src/db/client";
import { essentials } from "../src/db/schema/happiness";
import { v4 as uuidv4 } from "uuid";

// Essential data - structured per your specification
// Each category = 100 points total, 4 essentials × 25 points each
const essentialsData = [
  // Meaning Category (100 points total)
  { truth: "Meaning" as const, name: "Higher Purpose" },      // 25 points max
  { truth: "Meaning" as const, name: "Values" },             // 25 points max
  { truth: "Meaning" as const, name: "Growth" },             // 25 points max
  { truth: "Meaning" as const, name: "Appreciation" },        // 25 points max

  // Delight Category (100 points total)
  { truth: "Delight" as const, name: "Creativity" },          // 25 points max
  { truth: "Delight" as const, name: "Playfulness" },         // 25 points max
  { truth: "Delight" as const, name: "Enthusiasm" },         // 25 points max
  { truth: "Delight" as const, name: "Surprise" },           // 25 points max

  // Freedom Category (100 points total)
  { truth: "Freedom" as const, name: "Safety" },             // 25 points max
  { truth: "Freedom" as const, name: "Emergency Prep" },     // 25 points max
  { truth: "Freedom" as const, name: "Personalization" },   // 25 points max
  { truth: "Freedom" as const, name: "Flexibility" },        // 25 points max

  // Engagement Category (100 points total)
  { truth: "Engagement" as const, name: "Cooperation" },     // 25 points max
  { truth: "Engagement" as const, name: "Inclusivity" },    // 25 points max
  { truth: "Engagement" as const, name: "Connectedness" },  // 25 points max
  { truth: "Engagement" as const, name: "Socialization" },   // 25 points max

  // Vitality Category (100 points total)
  { truth: "Vitality" as const, name: "Movement" },         // 25 points max
  { truth: "Vitality" as const, name: "Rejuvenation" },     // 25 points max
  { truth: "Vitality" as const, name: "Comfort" },         // 25 points max
  { truth: "Vitality" as const, name: "Mindfulness" },      // 25 points max
];

async function seedEssentials() {
  try {
    console.log("🌱 Seeding essentials...");

    // Drop and recreate table to ensure correct structure
    await db.execute(`DROP TABLE IF EXISTS essentials`);

    await db.execute(`
      CREATE TABLE essentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        truth ENUM('Meaning', 'Delight', 'Freedom', 'Engagement', 'Vitality') NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index (ignore error if it already exists)
    try {
      await db.execute(
        `CREATE INDEX essentials_truth_idx ON essentials(truth)`
      );
    } catch (error) {
      // Index might already exist, ignore error
    }

    // Update happiness_questions table structure
    try {
      // Add new columns
      await db.execute(`
        ALTER TABLE happiness_questions 
        ADD COLUMN category_values JSON NOT NULL DEFAULT '[]'
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.execute(`
        ALTER TABLE happiness_questions 
        ADD COLUMN essential_id INT DEFAULT NULL
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.execute(`
        ALTER TABLE happiness_questions 
        ADD COLUMN essential_values JSON DEFAULT NULL
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Create index for essential_id (ignore error if it already exists)
    try {
      await db.execute(
        `CREATE INDEX happiness_questions_essential_id_idx ON happiness_questions(essential_id)`
      );
    } catch (error) {
      // Index might already exist, ignore error
    }

    console.log("✅ Created essentials table and updated questions table");

    // Insert new essentials
    await db.insert(essentials).values(essentialsData);
    console.log(`✅ Inserted ${essentialsData.length} essentials`);

    // Log summary by truth
    const truths = Array.from(new Set(essentialsData.map((e) => e.truth)));
    for (const truth of truths) {
      const count = essentialsData.filter((e) => e.truth === truth).length;
      console.log(`  📁 ${truth}: ${count} essentials`);
    }

    console.log("🎉 Essentials seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding essentials:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedEssentials()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedEssentials };
