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
  data: z.record(z.any()), // Survey response data
});

export const listResultsSchema = z.object({
  surveyId: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  cursor: z.string().optional(), // For pagination
});

// Query functions
export async function getResultById(id: string): Promise<Result | undefined> {
  const result = await db.select().from(results).where(eq(results.id, id)).limit(1);
  return result[0];
}

export async function createResult(resultData: z.infer<typeof createResultSchema>): Promise<Result> {
  const validatedData = createResultSchema.parse(resultData);
  const result = await db.insert(results).values(validatedData).returning();
  return result[0];
}

export async function listResultsBySurvey(surveyId: string): Promise<Result[]> {
  return db
    .select()
    .from(results)
    .where(eq(results.surveyId, surveyId))
    .orderBy(desc(results.submittedAt));
}

export async function listResultsBySurveyPaged(params: z.infer<typeof listResultsSchema>): Promise<{
  results: Result[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  const { surveyId, limit, cursor } = listResultsSchema.parse(params);
  
  let query = db
    .select()
    .from(results)
    .orderBy(desc(results.submittedAt))
    .limit(limit + 1); // Fetch one extra to check if there are more
  
  if (surveyId) {
    query = query.where(eq(results.surveyId, surveyId));
  }
  
  if (cursor) {
    // Cursor-based pagination using submittedAt timestamp
    const cursorDate = new Date(cursor);
    query = query.where(lt(results.submittedAt, cursorDate));
  }
  
  const queryResults = await query;
  const hasMore = queryResults.length > limit;
  const items = hasMore ? queryResults.slice(0, -1) : queryResults;
  const nextCursor = hasMore && items.length > 0 
    ? items[items.length - 1].submittedAt?.toISOString()
    : undefined;
  
  return {
    results: items,
    hasMore,
    nextCursor,
  };
}

export async function getUserResultsForSurvey(userId: string, surveyId: string): Promise<Result[]> {
  return db
    .select()
    .from(results)
    .where(and(eq(results.userId, userId), eq(results.surveyId, surveyId)))
    .orderBy(desc(results.submittedAt));
}

export async function hasUserSubmittedSurvey(userId: string, surveyId: string): Promise<boolean> {
  const result = await db
    .select({ id: results.id })
    .from(results)
    .where(and(eq(results.userId, userId), eq(results.surveyId, surveyId)))
    .limit(1);
  
  return result.length > 0;
}

export async function getResultsCount(surveyId?: string): Promise<number> {
  let query = db.select({ count: results.id }).from(results);
  
  if (surveyId) {
    query = query.where(eq(results.surveyId, surveyId));
  }
  
  const result = await query;
  return result.length;
}

export async function getResultsInDateRange(
  surveyId: string,
  startDate: Date,
  endDate: Date
): Promise<Result[]> {
  return db
    .select()
    .from(results)
    .where(
      and(
        eq(results.surveyId, surveyId),
        gte(results.submittedAt, startDate),
        lt(results.submittedAt, endDate)
      )
    )
    .orderBy(desc(results.submittedAt));
}
