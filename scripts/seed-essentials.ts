import { db } from "../src/db/client";
import { essentials } from "../src/db/schema/happiness";
import { v4 as uuidv4 } from "uuid";

// Essential data - simplified structure with proper typing
const essentialsData = [
  // Meaning Category
  { truth: "Meaning" as const, name: "Higher Purpose" },
  { truth: "Meaning" as const, name: "Values" },
  { truth: "Meaning" as const, name: "Growth" },
  { truth: "Meaning" as const, name: "Appreciation" },

  // Delight Category
  { truth: "Delight" as const, name: "Creativity" },
  { truth: "Delight" as const, name: "Playfulness" },
  { truth: "Delight" as const, name: "Enthusiasm" },
  { truth: "Delight" as const, name: "Surprise" },

  // Freedom Category
  { truth: "Freedom" as const, name: "Safety" },
  { truth: "Freedom" as const, name: "Personalization" },
  { truth: "Freedom" as const, name: "Flexibility" },
  { truth: "Freedom" as const, name: "Choice" },

  // Engagement Category
  { truth: "Engagement" as const, name: "Cooperation" },
  { truth: "Engagement" as const, name: "Inclusivity" },
  { truth: "Engagement" as const, name: "Connectedness" },
  { truth: "Engagement" as const, name: "Socialization" },

  // Vitality Category
  { truth: "Vitality" as const, name: "Movement" },
  { truth: "Vitality" as const, name: "Rejuvenation" },
  { truth: "Vitality" as const, name: "Comfort" },
  { truth: "Vitality" as const, name: "Mindfulness" },
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
