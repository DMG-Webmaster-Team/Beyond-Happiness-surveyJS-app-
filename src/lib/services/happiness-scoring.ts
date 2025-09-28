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

export interface MultilingualCharacter {
  id: number;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  match: string;
  avatar_url: string;
}

// Get multilingual character data
export async function getMultilingualCharacter(
  code: string,
  language: "en" | "ar" = "en"
): Promise<{
  id: number;
  name: string;
  description: string;
  avatarUrl: string;
}> {
  try {
    // Try to load multilingual character data from file system
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "data",
      "happiness-characters-multilingual.json"
    );

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const multilingualData = JSON.parse(fileContent);
      const character = multilingualData.characters.find(
        (c: MultilingualCharacter) => c.match === code
      );

      if (character) {
        return {
          id: character.id,
          name: character.name[language] || character.name.en,
          description:
            character.description[language] || character.description.en,
          avatarUrl: character.avatar_url,
        };
      }
    }
  } catch (error) {
    console.warn(
      "Failed to load multilingual character data, falling back to database"
    );
  }

  // Fallback to database
  const characters = await db
    .select()
    .from(happinessCharacters)
    .where(eq(happinessCharacters.match, code))
    .limit(1);

  if (characters.length > 0) {
    const char = characters[0];
    return {
      id: char.id,
      name: char.name,
      description: char.description,
      avatarUrl: char.avatarUrl || `/characters/${code}.png`,
    };
  }

  // Ultimate fallback
  return {
    id: 1,
    name: language === "ar" ? "الرحالة الفضولي" : "Curious Nomad",
    description:
      language === "ar"
        ? "مستكشف حر الروح يجد الفرح في الاكتشاف والتجارب الجديدة."
        : "A free-spirited explorer who finds joy in discovery and new experiences.",
    avatarUrl: "/characters/00000.png",
  };
}

const THRESHOLD = 6000; // Threshold for each category to be considered "high"

export async function computeHappinessScore(
  answers: HappinessAnswer[],
  language: "en" | "ar" = "en"
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

    // Get multilingual character data
    const character = await getMultilingualCharacter(code, language);

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
