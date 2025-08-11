import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { surveys, type Survey, type NewSurvey } from "../schema/surveys";
import { z } from "zod";

// Validation schemas
export const createSurveySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  definition: z.record(z.any()), // SurveyJS JSON
  canTakeMultiple: z.boolean().default(false),
  createdBy: z.string(),
});

export const updateSurveySchema = createSurveySchema.partial().omit({ createdBy: true });

// Query functions
export async function getSurveyById(id: string): Promise<Survey | undefined> {
  const result = await db.select().from(surveys).where(eq(surveys.id, id)).limit(1);
  return result[0];
}

export async function createSurvey(surveyData: z.infer<typeof createSurveySchema>): Promise<Survey> {
  const validatedData = createSurveySchema.parse(surveyData);
  const result = await db.insert(surveys).values(validatedData).returning();
  return result[0];
}

export async function updateSurvey(id: string, surveyData: z.infer<typeof updateSurveySchema>): Promise<Survey | undefined> {
  const validatedData = updateSurveySchema.parse(surveyData);
  const result = await db
    .update(surveys)
    .set(validatedData)
    .where(eq(surveys.id, id))
    .returning();
  return result[0];
}

export async function updateSurveyTitle(id: string, title: string): Promise<Survey | undefined> {
  const result = await db
    .update(surveys)
    .set({ title })
    .where(eq(surveys.id, id))
    .returning();
  return result[0];
}

export async function deleteSurvey(id: string): Promise<boolean> {
  const result = await db.delete(surveys).where(eq(surveys.id, id));
  return result.rowsAffected > 0;
}

export async function listSurveys(): Promise<Survey[]> {
  return db.select().from(surveys).orderBy(desc(surveys.createdAt));
}

export async function listSurveysByAdmin(adminId: string): Promise<Survey[]> {
  return db
    .select()
    .from(surveys)
    .where(eq(surveys.createdBy, adminId))
    .orderBy(desc(surveys.createdAt));
}
