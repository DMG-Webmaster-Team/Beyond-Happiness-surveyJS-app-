import { db } from "../src/db/client";
import { essentials } from "../src/db/schema/happiness";
import { v4 as uuidv4 } from "uuid";

// Essential data with normalized scoring (0-1000 scale)
const essentialsData = [
  // Meaning Category
  {
    id: uuidv4(),
    category: "Meaning",
    title: "Higher Purpose",
    merit: "Committing to the community",
    intent: "Show your people that the organization is dedicated to making a positive impact beyond just business success",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Meaning",
    title: "Values",
    merit: "Living authentically",
    intent: "Ensure your organization's actions align with its stated values and principles",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Meaning",
    title: "Growth",
    merit: "Developing careers",
    intent: "Provide opportunities for personal and professional development",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Meaning",
    title: "Appreciation",
    merit: "Expressing gratitude",
    intent: "Recognize and appreciate the contributions of your team members",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },

  // Delight Category
  {
    id: uuidv4(),
    category: "Delight",
    title: "Creativity",
    merit: "Encouraging innovation",
    intent: "Foster an environment where creative thinking and innovation are valued",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Delight",
    title: "Playfulness",
    merit: "Bringing joy to work",
    intent: "Create a work environment that embraces fun and lightheartedness",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Delight",
    title: "Enthusiasm",
    merit: "Inspiring passion",
    intent: "Cultivate genuine excitement and passion for the work being done",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Delight",
    title: "Surprise",
    merit: "Creating memorable moments",
    intent: "Deliver unexpected positive experiences that delight your team",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },

  // Freedom Category
  {
    id: uuidv4(),
    category: "Freedom",
    title: "Safety",
    merit: "Ensuring security",
    intent: "Create a safe environment where people feel secure to express themselves",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Freedom",
    title: "Personalization",
    merit: "Honoring individuality",
    intent: "Allow people to work in ways that suit their individual strengths and preferences",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Freedom",
    title: "Flexibility",
    merit: "Adapting to needs",
    intent: "Provide flexible work arrangements and adaptive policies",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Freedom",
    title: "Choice",
    merit: "Empowering decisions",
    intent: "Give people meaningful choices in how they approach their work",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },

  // Engagement Category
  {
    id: uuidv4(),
    category: "Engagement",
    title: "Cooperation",
    merit: "Working together",
    intent: "Foster collaborative relationships and teamwork across the organization",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Engagement",
    title: "Inclusivity",
    merit: "Welcoming everyone",
    intent: "Create an environment where all voices are heard and valued",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Engagement",
    title: "Connectedness",
    merit: "Building relationships",
    intent: "Strengthen interpersonal connections and community within the workplace",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Engagement",
    title: "Socialization",
    merit: "Fostering community",
    intent: "Encourage social interaction and community building among team members",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },

  // Vitality Category
  {
    id: uuidv4(),
    category: "Vitality",
    title: "Movement",
    merit: "Staying active",
    intent: "Promote physical activity and movement throughout the workday",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Vitality",
    title: "Rejuvenation",
    merit: "Helping families in times of need",
    intent: "Support work-life balance and recovery from stress",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Vitality",
    title: "Comfort",
    merit: "Creating ease",
    intent: "Ensure physical and emotional comfort in the work environment",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
  {
    id: uuidv4(),
    category: "Vitality",
    title: "Mindfulness",
    merit: "Reducing stress",
    intent: "Promote mindfulness practices and stress reduction techniques",
    maxScore: 25,
    value1: 0,
    value2: 150,
    value3: 500,
    value4: 750,
    value5: 1000,
  },
];

async function seedEssentials() {
  try {
    console.log("🌱 Seeding essentials...");
    
    // Create table if it doesn't exist (using raw SQL)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS essentials (
        id CHAR(36) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        merit TEXT,
        intent TEXT,
        max_score INT NOT NULL,
        value_1 INT NOT NULL,
        value_2 INT NOT NULL,
        value_3 INT NOT NULL,
        value_4 INT NOT NULL,
        value_5 INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create index (ignore error if it already exists)
    try {
      await db.execute(`CREATE INDEX essentials_category_idx ON essentials(category)`);
    } catch (error) {
      // Index might already exist, ignore error
    }
    
    // Add essential_id column to happiness_questions table if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE happiness_questions 
        ADD COLUMN essential_id CHAR(36)
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }
    
    // Create index for essential_id (ignore error if it already exists)
    try {
      await db.execute(`CREATE INDEX happiness_questions_essential_id_idx ON happiness_questions(essential_id)`);
    } catch (error) {
      // Index might already exist, ignore error
    }
    
    console.log("✅ Created essentials table and updated questions table");
    
    // Clear existing essentials
    await db.delete(essentials);
    console.log("✅ Cleared existing essentials");
    
    // Insert new essentials
    await db.insert(essentials).values(essentialsData);
    console.log(`✅ Inserted ${essentialsData.length} essentials`);
    
    // Log summary by category
    const categories = [...new Set(essentialsData.map(e => e.category))];
    for (const category of categories) {
      const count = essentialsData.filter(e => e.category === category).length;
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
