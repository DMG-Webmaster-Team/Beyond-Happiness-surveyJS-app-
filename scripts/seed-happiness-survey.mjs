import { db } from "../src/db/index.js";
import {
  happinessQuestions,
  happinessCharacters,
} from "../src/db/schema/happiness.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const questionsData = JSON.parse(
  readFileSync(join(__dirname, "../data/happiness-questions.json"), "utf8")
);
const charactersData = JSON.parse(
  readFileSync(join(__dirname, "../data/happiness-characters.json"), "utf8")
);

async function seedHappinessSurvey() {
  console.log("🌱 Starting happiness survey seed...");

  try {
    // Seed happiness questions
    console.log("📝 Seeding happiness questions...");

    for (const question of questionsData.questions) {
      // Check if question already exists
      const existing = await db
        .select()
        .from(happinessQuestions)
        .where(eq(happinessQuestions.id, question.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(happinessQuestions).values({
          id: question.id,
          text: question.question,
          category: question.category,
          values: JSON.stringify(question.values),
          isActive: true,
        });
        console.log(
          `✅ Added question ${question.id}: ${question.question.substring(
            0,
            50
          )}...`
        );
      } else {
        console.log(`⏭️  Question ${question.id} already exists, skipping`);
      }
    }

    // Seed happiness characters
    console.log("🎭 Seeding happiness characters...");

    for (const character of charactersData.characters) {
      // Check if character already exists
      const existing = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.id, character.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(happinessCharacters).values({
          id: character.id,
          name: character.name,
          description: character.description,
          match: character.match,
          avatarUrl: character.avatar_url,
        });
        console.log(
          `✅ Added character ${character.id}: ${character.name} (${character.match})`
        );
      } else {
        console.log(`⏭️  Character ${character.id} already exists, skipping`);
      }
    }

    console.log("🎉 Happiness survey seed completed successfully!");
    console.log(`📊 Total questions: ${questionsData.questions.length}`);
    console.log(`🎭 Total characters: ${charactersData.characters.length}`);
  } catch (error) {
    console.error("❌ Error seeding happiness survey:", error);
    throw error;
  }
}

// Run the seed function
seedHappinessSurvey()
  .then(() => {
    console.log("✅ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed script failed:", error);
    process.exit(1);
  });
