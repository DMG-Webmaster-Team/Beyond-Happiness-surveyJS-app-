import { db } from "@/db";
import { happinessQuestions } from "@/db/schema/happiness";
import { inArray } from "drizzle-orm";

export interface SubtypeScores {
  [category: string]: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export async function calculateSubtypeScores(
  answers: any[],
  categoryTotals: any
): Promise<SubtypeScores> {
  // Question mapping: Each category has 8 questions, grouped into 4 subtypes (2 questions each)
  const categoryQuestionMapping = {
    Meaning: { A: [1, 2], B: [3, 4], C: [5, 6], D: [7, 8] },
    Delight: { A: [9, 10], B: [11, 12], C: [13, 14], D: [15, 16] },
    Freedom: { A: [17, 18], B: [19, 20], C: [21, 22], D: [23, 24] },
    Engagement: { A: [25, 26], B: [27, 28], C: [29, 30], D: [31, 32] },
    Vitality: { A: [33, 34], B: [35, 36], C: [37, 38], D: [39, 40] },
  };

  // If no answers provided, fall back to proportional distribution
  if (!answers || !Array.isArray(answers)) {
    console.log(
      "📊 No individual answers available, using proportional distribution"
    );
    const subtypeScores: SubtypeScores = {};
    Object.entries(categoryTotals).forEach(([category, totalScore]) => {
      subtypeScores[category] = {
        A: Math.round((totalScore as number) * 0.25),
        B: Math.round((totalScore as number) * 0.25),
        C: Math.round((totalScore as number) * 0.25),
        D: Math.round((totalScore as number) * 0.25),
      };
    });
    return subtypeScores;
  }

  try {
    // Get all question IDs from answers
    const questionIds = answers.map((a: any) => a.questionId);

    // Fetch questions in one batch query
    const questions = await db
      .select()
      .from(happinessQuestions)
      .where(inArray(happinessQuestions.id, questionIds));

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Initialize subtype scores
    const subtypeScores: SubtypeScores = {};
    Object.keys(categoryQuestionMapping).forEach((category) => {
      subtypeScores[category] = { A: 0, B: 0, C: 0, D: 0 };
    });

    // Process each answer to calculate subtype scores
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const category =
        question.category as keyof typeof categoryQuestionMapping;
      // Handle both JSON string and already parsed array (MySQL auto-parses JSON)
      // Support migration from old 'values' field to new 'categoryValues' field
      let values;
      if (question.categoryValues) {
        values = Array.isArray(question.categoryValues)
          ? question.categoryValues
          : typeof question.categoryValues === "string"
          ? (JSON.parse(question.categoryValues) as number[])
          : [];
      } else if ((question as any).values) {
        values = Array.isArray((question as any).values)
          ? (question as any).values
          : (JSON.parse((question as any).values) as number[]);
      } else {
        values = [200, 400, 600, 800, 1000]; // Default values
      }
      const scoreIndex = answer.valueIndex - 1;

      if (scoreIndex >= 0 && scoreIndex < values.length) {
        const score = values[scoreIndex];

        // Find which subtype this question belongs to
        const categoryMapping = categoryQuestionMapping[category];
        for (const [subtype, questionIds] of Object.entries(categoryMapping)) {
          if (questionIds.includes(answer.questionId)) {
            (subtypeScores[category] as any)[subtype] += score;
            break;
          }
        }
      }
    }

    console.log(
      "📊 Calculated subtype scores from individual answers:",
      subtypeScores
    );
    return subtypeScores;
  } catch (error) {
    console.error("❌ Error calculating subtype scores:", error);
    // Fallback to proportional distribution
    const subtypeScores: SubtypeScores = {};
    Object.entries(categoryTotals).forEach(([category, totalScore]) => {
      subtypeScores[category] = {
        A: Math.round((totalScore as number) * 0.25),
        B: Math.round((totalScore as number) * 0.25),
        C: Math.round((totalScore as number) * 0.25),
        D: Math.round((totalScore as number) * 0.25),
      };
    });
    return subtypeScores;
  }
}
