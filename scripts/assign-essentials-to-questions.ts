import { db } from "../src/db/client";
import { happinessQuestions, essentials } from "../src/db/schema/happiness";
import { eq, asc } from "drizzle-orm";

// Essential mapping based on actual database contents
const essentialMapping = [
  // Meaning Category
  "Higher Purpose",
  "Values",
  "Growth",
  "Appreciation",
  // Delight Category
  "Creativity",
  "Playfulness",
  "Enthusiasm",
  "Surprise",
  // Freedom Category
  "Safety",
  "Emergency Prep",
  "Personalization",
  "Flexibility",
  // Engagement Category
  "Cooperation",
  "Inclusivity",
  "Connectedness",
  "Socialization",
  // Vitality Category
  "Movement",
  "Rejuvenation",
  "Comfort",
  "Mindfulness",
];

// Default Essential values as specified
const DEFAULT_ESSENTIAL_VALUES = [0, 3.125, 6.25, 9.375, 12.5];

async function assignEssentialsToQuestions() {
  try {
    console.log("🔄 Starting Essential assignment to questions...");

    // First, get all essentials to create a name-to-id mapping
    const allEssentials = await db
      .select({
        id: essentials.id,
        name: essentials.name,
        truth: essentials.truth,
      })
      .from(essentials)
      .orderBy(asc(essentials.id));

    console.log(`📋 Found ${allEssentials.length} essentials in database`);

    // Create mapping from essential name to ID
    const essentialNameToId = new Map<string, number>();
    allEssentials.forEach((essential) => {
      essentialNameToId.set(essential.name, essential.id);
    });

    // Verify all required essentials exist
    const missingEssentials = essentialMapping.filter(
      (name) => !essentialNameToId.has(name)
    );
    if (missingEssentials.length > 0) {
      console.error("❌ Missing essentials in database:", missingEssentials);
      throw new Error(`Missing essentials: ${missingEssentials.join(", ")}`);
    }

    // Get all existing questions ordered by ID
    const allQuestions = await db
      .select({
        id: happinessQuestions.id,
        text: happinessQuestions.text,
        category: happinessQuestions.category,
        essentialId: happinessQuestions.essentialId,
        essentialValues: happinessQuestions.essentialValues,
      })
      .from(happinessQuestions)
      .orderBy(asc(happinessQuestions.id));

    console.log(`📋 Found ${allQuestions.length} questions in database`);

    if (allQuestions.length < 40) {
      console.warn(
        `⚠️ Only ${allQuestions.length} questions found, expected 40`
      );
    }

    // Assign essentials to questions (2 questions per essential)
    let updateCount = 0;
    const updates = [];

    for (let i = 0; i < allQuestions.length && i < 40; i++) {
      const question = allQuestions[i];
      const essentialIndex = Math.floor(i / 2); // 2 questions per essential

      if (essentialIndex >= essentialMapping.length) {
        console.warn(
          `⚠️ Question ${question.id} (index ${i}) exceeds essential mapping`
        );
        break;
      }

      const essentialName = essentialMapping[essentialIndex];
      const essentialId = essentialNameToId.get(essentialName);

      if (!essentialId) {
        console.error(
          `❌ Essential "${essentialName}" not found for question ${question.id}`
        );
        continue;
      }

      // Check if question already has this essential assigned
      if (question.essentialId === essentialId) {
        console.log(
          `✅ Question ${question.id} already has essential "${essentialName}"`
        );
        continue;
      }

      // Prepare update
      updates.push({
        questionId: question.id,
        essentialId: essentialId,
        essentialName: essentialName,
        essentialValues: DEFAULT_ESSENTIAL_VALUES,
      });

      updateCount++;
    }

    console.log(`🔄 Preparing to update ${updateCount} questions...`);

    // Execute updates
    for (const update of updates) {
      try {
        await db
          .update(happinessQuestions)
          .set({
            essentialId: update.essentialId,
            essentialValues: update.essentialValues,
          })
          .where(eq(happinessQuestions.id, update.questionId));

        console.log(
          `✅ Updated question ${update.questionId} → "${update.essentialName}"`
        );
      } catch (error) {
        console.error(
          `❌ Failed to update question ${update.questionId}:`,
          error
        );
      }
    }

    // Verify the assignment
    console.log("\n📊 Verification - Questions by Essential:");
    const verification = await db
      .select({
        id: happinessQuestions.id,
        text: happinessQuestions.text,
        category: happinessQuestions.category,
        essentialId: happinessQuestions.essentialId,
        essentialName: essentials.name,
      })
      .from(happinessQuestions)
      .leftJoin(essentials, eq(happinessQuestions.essentialId, essentials.id))
      .orderBy(asc(happinessQuestions.id));

    // Group by essential for display
    const groupedByEssential = new Map<string, any[]>();
    verification.forEach((q) => {
      const essentialName = q.essentialName || "No Essential";
      if (!groupedByEssential.has(essentialName)) {
        groupedByEssential.set(essentialName, []);
      }
      groupedByEssential.get(essentialName)!.push(q);
    });

    // Display results
    for (const [essentialName, questions] of Array.from(groupedByEssential)) {
      console.log(`\n📁 ${essentialName}: ${questions.length} questions`);
      questions.forEach((q: any) => {
        console.log(`  - Q${q.id}: ${q.text.substring(0, 50)}...`);
      });
    }

    console.log(`\n🎉 Essential assignment completed!`);
    console.log(`📊 Summary:`);
    console.log(`  - Total questions processed: ${allQuestions.length}`);
    console.log(`  - Questions updated: ${updateCount}`);
    console.log(`  - Essentials assigned: ${groupedByEssential.size - 1}`); // -1 for "No Essential"
    console.log(`  - Default values: [${DEFAULT_ESSENTIAL_VALUES.join(", ")}]`);
  } catch (error) {
    console.error("❌ Error assigning essentials to questions:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  assignEssentialsToQuestions()
    .then(() => {
      console.log("✅ Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

export { assignEssentialsToQuestions };
