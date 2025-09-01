import { db } from "@/db";
import { happinessQuestions, happinessCharacters } from "@/db/schema/happiness";
import { eq, inArray } from "drizzle-orm";

export interface HappinessAnswer {
  questionId: number;
  valueIndex: number; // 1-5
}

export interface CategoryTotals {
  Meaning: number;
  Delight: number;
  Freedom: number;
  Engagement: number;
  Vitality: number;
}

export interface HappinessScore {
  categoryTotals: CategoryTotals;
  code: string;
  character: {
    id: number;
    name: string;
    description: string;
    avatarUrl: string | null;
  };
}

const THRESHOLD = 6000; // Threshold for each category to be considered "high"

export async function computeHappinessScore(
  answers: HappinessAnswer[]
): Promise<HappinessScore> {
  try {
    // Get all question IDs from answers
    const questionIds = answers.map((a) => a.questionId);

    // Fetch questions in one batch query
    const questions = await db
      .select()
      .from(happinessQuestions)
      .where(inArray(happinessQuestions.id, questionIds));

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Initialize category totals
    const categoryTotals: CategoryTotals = {
      Meaning: 0,
      Delight: 0,
      Freedom: 0,
      Engagement: 0,
      Vitality: 0,
    };

    // Process each answer
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        console.warn(`Question ${answer.questionId} not found, skipping`);
        continue;
      }

      // Parse values array from JSON
      const values = JSON.parse(question.values) as number[];

      // Get score for this answer (valueIndex is 1-based, array is 0-based)
      const scoreIndex = answer.valueIndex - 1;
      if (scoreIndex >= 0 && scoreIndex < values.length) {
        const score = values[scoreIndex];
        categoryTotals[question.category as keyof CategoryTotals] += score;
      } else {
        console.warn(
          `Invalid valueIndex ${answer.valueIndex} for question ${answer.questionId}`
        );
      }
    }

    // Generate 5-bit code based on threshold
    const code = [
      categoryTotals.Meaning >= THRESHOLD ? "1" : "0",
      categoryTotals.Delight >= THRESHOLD ? "1" : "0",
      categoryTotals.Freedom >= THRESHOLD ? "1" : "0",
      categoryTotals.Engagement >= THRESHOLD ? "1" : "0",
      categoryTotals.Vitality >= THRESHOLD ? "1" : "0",
    ].join("");

    // Look up character by match code
    const characters = await db
      .select()
      .from(happinessCharacters)
      .where(eq(happinessCharacters.match, code))
      .limit(1);

    let character;
    if (characters.length > 0) {
      const char = characters[0];
      character = {
        id: char.id,
        name: char.name,
        description: char.description,
        avatarUrl: char.avatarUrl,
      };
    } else {
      // Fallback to "Curious Nomad" (id=1) if no match found
      console.warn(`No character found for code ${code}, using fallback`);
      const fallbackChars = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.id, 1))
        .limit(1);

      if (fallbackChars.length > 0) {
        const char = fallbackChars[0];
        character = {
          id: char.id,
          name: char.name,
          description: char.description,
          avatarUrl: char.avatarUrl,
        };
      } else {
        // Ultimate fallback
        character = {
          id: 1,
          name: "Curious Nomad",
          description: "A free-spirited explorer discovering life's journey.",
          avatarUrl: "/avatars/curious-nomad.svg",
        };
      }
    }

    return {
      categoryTotals,
      code,
      character,
    };
  } catch (error) {
    console.error("Error computing happiness score:", error);
    throw new Error("Failed to compute happiness score");
  }
}
