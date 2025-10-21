/**
 * Unified Happiness Scoring Service
 * 
 * This service provides consistent scoring calculations for both the results page and PDF generation.
 * It ensures that the same answer data and calculation logic is used across all components.
 */

import { db } from "@/db/client";
import { happinessQuestions } from "@/db/schema/happiness";
import { inArray } from "drizzle-orm";

export interface HappinessAnswer {
  questionId: number;
  valueIndex: number; // 1-based index (1-5)
}

export interface CategoryTotals {
  Meaning: number;
  Delight: number;
  Freedom: number;
  Engagement: number;
  Vitality: number;
}

export interface EssentialTotals {
  [essentialKey: string]: number;
}

export interface SubtypeScores {
  [category: string]: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export interface UnifiedHappinessScore {
  categoryTotals: CategoryTotals;
  essentialTotals: EssentialTotals;
  subtypeScores: SubtypeScores;
  categoryPercentages: Array<{
    name: string;
    value: number;
    score: number;
    color: string;
  }>;
  subtypePercentages: {
    [category: string]: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
  };
  overallPercentage: number;
  totalScore: number;
}

/**
 * Calculate unified happiness scores from answers
 * This is the single source of truth for all scoring calculations
 */
export async function calculateUnifiedHappinessScore(
  answers: HappinessAnswer[],
  language: "en" | "ar" = "en"
): Promise<UnifiedHappinessScore> {
  try {
    // Get all question IDs from answers
    const questionIds = answers.map((a) => a.questionId);

    // Fetch questions with essentials in one batch query
    const questions = await db
      .select({
        id: happinessQuestions.id,
        text: happinessQuestions.text,
        category: happinessQuestions.category,
        categoryValues: happinessQuestions.categoryValues,
        essentialId: happinessQuestions.essentialId,
        essentialValues: happinessQuestions.essentialValues,
        isActive: happinessQuestions.isActive,
      })
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

    // Initialize essential totals
    const essentialTotals: EssentialTotals = {};

    // Initialize subtype scores (A, B, C, D for each category)
    const subtypeScores: SubtypeScores = {
      Meaning: { A: 0, B: 0, C: 0, D: 0 },
      Delight: { A: 0, B: 0, C: 0, D: 0 },
      Freedom: { A: 0, B: 0, C: 0, D: 0 },
      Engagement: { A: 0, B: 0, C: 0, D: 0 },
      Vitality: { A: 0, B: 0, C: 0, D: 0 },
    };

    // Process each answer
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        console.warn(`Question ${answer.questionId} not found`);
        continue;
      }

      // Parse category values
      const categoryValues = Array.isArray(question.categoryValues)
        ? question.categoryValues
        : (JSON.parse(question.categoryValues as string) as number[]);

      if (!categoryValues || categoryValues.length !== 5) {
        console.warn(`Invalid category values for question ${answer.questionId}`);
        continue;
      }

      // Get score for this answer (valueIndex is 1-based, array is 0-based)
      const scoreIndex = answer.valueIndex - 1;
      if (scoreIndex >= 0 && scoreIndex < categoryValues.length) {
        const categoryScore = categoryValues[scoreIndex];
        categoryTotals[question.category as keyof CategoryTotals] += categoryScore;

        // Calculate essential score if question has an essential
        if (question.essentialId && question.essentialValues) {
          const essentialValues = Array.isArray(question.essentialValues)
            ? question.essentialValues
            : (JSON.parse(question.essentialValues as string) as number[]);

          if (scoreIndex >= 0 && scoreIndex < essentialValues.length) {
            const essentialScore = essentialValues[scoreIndex];
            const essentialKey = `essential_${question.essentialId}`;
            essentialTotals[essentialKey] =
              (essentialTotals[essentialKey] || 0) + essentialScore;
          }
        }

        // Calculate subtype scores based on question ID mapping
        const subtype = getSubtypeFromQuestionId(answer.questionId);
        if (subtype) {
          subtypeScores[question.category][subtype] += categoryScore;
        }
      } else {
        console.warn(
          `Invalid valueIndex ${answer.valueIndex} for question ${answer.questionId}`
        );
      }
    }

    // Calculate actual max scores for each category based on the questions
    const categoryMaxScores: Record<string, number> = {};
    Object.keys(categoryTotals).forEach(category => {
      const categoryQuestions = questions.filter(q => q.category === category);
      let maxScore = 0;
      categoryQuestions.forEach(q => {
        const values = Array.isArray(q.categoryValues)
          ? q.categoryValues
          : JSON.parse(q.categoryValues as string);
        maxScore += Math.max(...values);
      });
      categoryMaxScores[category] = maxScore;
    });

    // Calculate percentages using actual max scores
    const categoryPercentages = Object.entries(categoryTotals).map(
      ([category, score]) => {
        const maxPossibleScore = categoryMaxScores[category] || 2000;
        const percentage = Math.round(((score as number) / maxPossibleScore) * 100);
        const color = getCategoryColor(category).hex;
        
        return {
          name: category,
          value: percentage,
          score: score as number,
          color,
        };
      }
    );

    // Calculate subtype percentages using actual max scores
    const subtypePercentages: {
      [category: string]: { A: number; B: number; C: number; D: number };
    } = {};
    
    Object.entries(subtypeScores).forEach(([category, scores]) => {
      // Calculate actual max score for each subtype based on the questions
      const subtypeMaxScores: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      
      // Get questions for this category
      const categoryQuestions = questions.filter(q => q.category === category);
      
      // Calculate max score for each subtype
      ['A', 'B', 'C', 'D'].forEach(subtype => {
        const subtypeQuestions = categoryQuestions.filter(q => {
          const subtypeFromId = getSubtypeFromQuestionId(q.id);
          return subtypeFromId === subtype;
        });
        
        let maxScore = 0;
        subtypeQuestions.forEach(q => {
          const values = Array.isArray(q.categoryValues)
            ? q.categoryValues
            : JSON.parse(q.categoryValues as string);
          maxScore += Math.max(...values);
        });
        subtypeMaxScores[subtype] = maxScore;
      });
      
      subtypePercentages[category] = {
        A: subtypeMaxScores.A > 0 ? Math.round((scores.A / subtypeMaxScores.A) * 100) : 0,
        B: subtypeMaxScores.B > 0 ? Math.round((scores.B / subtypeMaxScores.B) * 100) : 0,
        C: subtypeMaxScores.C > 0 ? Math.round((scores.C / subtypeMaxScores.C) * 100) : 0,
        D: subtypeMaxScores.D > 0 ? Math.round((scores.D / subtypeMaxScores.D) * 100) : 0,
      };
    });

    // Calculate overall percentage using actual max scores
    const totalScore = Object.values(categoryTotals).reduce(
      (sum: number, score) => sum + (score as number),
      0
    );
    const totalMaxScore = Object.values(categoryMaxScores).reduce(
      (sum: number, max) => sum + max,
      0
    );
    const overallPercentage = Math.round((totalScore / totalMaxScore) * 100);

    return {
      categoryTotals,
      essentialTotals,
      subtypeScores,
      categoryPercentages,
      subtypePercentages,
      overallPercentage,
      totalScore,
    };
  } catch (error) {
    console.error("Error calculating unified happiness score:", error);
    throw new Error("Failed to calculate unified happiness score");
  }
}

/**
 * Get subtype (A, B, C, D) from question ID
 * Each category has 8 questions, grouped into 4 subtypes (2 questions each)
 */
function getSubtypeFromQuestionId(questionId: number): "A" | "B" | "C" | "D" | null {
  // Question mapping: Each category has 8 questions, grouped into 4 subtypes (2 questions each)
  const questionMapping = {
    Meaning: { A: [1, 2], B: [3, 4], C: [5, 6], D: [7, 8] },
    Delight: { A: [9, 10], B: [11, 12], C: [13, 14], D: [15, 16] },
    Freedom: { A: [17, 18], B: [19, 20], C: [21, 22], D: [23, 24] },
    Engagement: { A: [25, 26], B: [27, 28], C: [29, 30], D: [31, 32] },
    Vitality: { A: [33, 34], B: [35, 36], C: [37, 38], D: [39, 40] },
  };

  for (const [category, subtypes] of Object.entries(questionMapping)) {
    for (const [subtype, questionIds] of Object.entries(subtypes)) {
      if (questionIds.includes(questionId)) {
        return subtype as "A" | "B" | "C" | "D";
      }
    }
  }

  return null;
}

/**
 * Get maximum possible score for a category
 * This should match the sum of all category values for questions in that category
 */
function getMaxPossibleScoreForCategory(category: string): number {
  // These values should match the CATEGORY_MAX_SCORES from value-calculations.ts
  // Each category has 8 questions, and we need to sum the max values from all questions
  const categoryMaxScores = {
    Meaning: 2000,    // 8 questions × 250 max each
    Delight: 1500,    // 8 questions × 187.5 max each  
    Freedom: 1800,    // 8 questions × 225 max each
    Engagement: 1600, // 8 questions × 200 max each
    Vitality: 1700,   // 8 questions × 212.5 max each
  };

  return categoryMaxScores[category as keyof typeof categoryMaxScores] || 2000;
}

/**
 * Get maximum possible score for a subtype
 * Each subtype has 2 questions, each with max value of 1000, so max = 2000
 */
function getMaxPossibleScoreForSubtype(category: string): number {
  // Each subtype has 2 questions, each question can score up to 1000
  // So each subtype max = 2 × 1000 = 2000
  return 2000;
}

/**
 * Get category color
 */
function getCategoryColor(category: string) {
  const colors = {
    Meaning: { hex: "#8B5CF6", bg: "bg-purple-100", text: "text-purple-800" },
    Delight: { hex: "#F59E0B", bg: "bg-yellow-100", text: "text-yellow-800" },
    Freedom: { hex: "#10B981", bg: "bg-green-100", text: "text-green-800" },
    Engagement: { hex: "#3B82F6", bg: "bg-blue-100", text: "text-blue-800" },
    Vitality: { hex: "#EF4444", bg: "bg-red-100", text: "text-red-800" },
  };

  return colors[category as keyof typeof colors] || colors.Meaning;
}
