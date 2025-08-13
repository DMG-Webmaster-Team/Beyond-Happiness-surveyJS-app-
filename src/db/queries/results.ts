import { eq, desc, and, gte, lt } from "drizzle-orm";
import { db } from "../client";
import { results, type Result, type NewResult } from "../schema/results";
import { surveys } from "../schema/surveys";
import { z } from "zod";

// Validation schemas
export const createResultSchema = z.object({
  surveyId: z.string(),
  userId: z.string().optional(),
  adminId: z.string().optional(),
  data: z.any(), // Survey response data
});

export const listResultsSchema = z.object({
  surveyId: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  cursor: z.string().optional(), // For pagination
});

// Query functions
export async function getResultById(id: string): Promise<Result | undefined> {
  const result = await db
    .select()
    .from(results)
    .where(eq(results.id, id))
    .limit(1);
  return result[0];
}

export async function createResult(resultData: any): Promise<Result> {
  // Convert data object to JSON string if it's not already a string
  const dataToInsert = {
    ...resultData,
    data:
      typeof resultData.data === "string"
        ? resultData.data
        : JSON.stringify(resultData.data || {}),
  };

  const result = await db.insert(results).values(dataToInsert).returning();
  return result[0];
}

export async function listResultsBySurvey(surveyId: string): Promise<Result[]> {
  return db
    .select()
    .from(results)
    .where(eq(results.surveyId, surveyId))
    .orderBy(desc(results.submittedAt));
}

// Temporarily disabled due to TypeScript issues with Drizzle ORM
export async function listResultsBySurveyPaged(params: any): Promise<{
  results: Result[];
  hasMore: boolean;
  nextCursor?: number;
}> {
  // TODO: Fix Drizzle ORM query building issues
  throw new Error("Function temporarily disabled - needs Drizzle ORM fixes");
}

export async function getUserResultsForSurvey(
  userId: string,
  surveyId: string
): Promise<Result[]> {
  return db
    .select()
    .from(results)
    .where(and(eq(results.userId, userId), eq(results.surveyId, surveyId)))
    .orderBy(desc(results.submittedAt));
}

export async function hasUserSubmittedSurvey(
  userId: string,
  surveyId: string
): Promise<boolean> {
  const result = await db
    .select({ id: results.id })
    .from(results)
    .where(and(eq(results.userId, userId), eq(results.surveyId, surveyId)))
    .limit(1);

  return result.length > 0;
}

// Temporarily disabled due to TypeScript issues with Drizzle ORM
export async function getResultsCount(surveyId?: string): Promise<number> {
  // TODO: Fix Drizzle ORM query building issues
  throw new Error("Function temporarily disabled - needs Drizzle ORM fixes");
}

// Temporarily disabled due to TypeScript issues with Drizzle ORM
export async function getResultsInDateRange(
  surveyId: string,
  startDate: Date,
  endDate: Date
): Promise<Result[]> {
  // TODO: Fix Drizzle ORM query building issues
  throw new Error("Function temporarily disabled - needs Drizzle ORM fixes");
}
