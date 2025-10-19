import { db } from "../src/db/client";
import { essentials } from "../src/db/schema/happiness";
import { v4 as uuidv4 } from "uuid";

// Essential data - simplified structure
const essentialsData = [
  // Meaning Category
  { truth: "Meaning", name: "Higher Purpose" },
  { truth: "Meaning", name: "Values" },
  { truth: "Meaning", name: "Growth" },
  { truth: "Meaning", name: "Appreciation" },

  // Delight Category
  { truth: "Delight", name: "Creativity" },
  { truth: "Delight", name: "Playfulness" },
  { truth: "Delight", name: "Enthusiasm" },
  { truth: "Delight", name: "Surprise" },

  // Freedom Category
  { truth: "Freedom", name: "Safety" },
  { truth: "Freedom", name: "Personalization" },
  { truth: "Freedom", name: "Flexibility" },
  { truth: "Freedom", name: "Choice" },

  // Engagement Category
  { truth: "Engagement", name: "Cooperation" },
  { truth: "Engagement", name: "Inclusivity" },
  { truth: "Engagement", name: "Connectedness" },
  { truth: "Engagement", name: "Socialization" },

  // Vitality Category
  { truth: "Vitality", name: "Movement" },
  { truth: "Vitality", name: "Rejuvenation" },
  { truth: "Vitality", name: "Comfort" },
  { truth: "Vitality", name: "Mindfulness" },
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

    // Log summary by category
    const categories = Array.from(
      new Set(essentialsData.map((e) => e.category))
    );
    for (const category of categories) {
      const count = essentialsData.filter(
        (e) => e.category === category
      ).length;
      console.log(`  📁 ${category}: ${count} essentials`);
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
