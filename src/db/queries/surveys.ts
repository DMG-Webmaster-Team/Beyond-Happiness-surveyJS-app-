import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { surveys, type Survey, type NewSurvey } from "../schema/surveys";
import { z } from "zod";

// Validation schemas
export const createSurveySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  definition: z.union([z.string(), z.record(z.any())]).optional(), // SurveyJS JSON as string or object
  json: z.union([z.string(), z.record(z.any())]).optional(), // Alternative field name for frontend compatibility
  canTakeMultiple: z.union([z.boolean(), z.number()]).default(false), // Accept both boolean and number
  createdBy: z.string(),
});

export const updateSurveySchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    definition: z.union([z.string(), z.record(z.any())]).optional(),
    json: z.union([z.string(), z.record(z.any())]).optional(),
    canTakeMultiple: z.union([z.boolean(), z.number()]).optional(),
  })
  .strict();

// Query functions
export async function getSurveyById(id: string): Promise<Survey | undefined> {
  const result = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, id))
    .limit(1);
  return result[0];
}

export async function createSurvey(
  surveyData: z.infer<typeof createSurveySchema>
): Promise<Survey> {
  const validatedData = createSurveySchema.parse(surveyData);

  // Map json field to definition if needed and ensure it's a string
  const definition = validatedData.definition || validatedData.json || {};
  const definitionString =
    typeof definition === "string" ? definition : JSON.stringify(definition);

  // Convert boolean to integer for canTakeMultiple
  const canTakeMultiple =
    typeof validatedData.canTakeMultiple === "boolean"
      ? validatedData.canTakeMultiple
        ? 1
        : 0
      : validatedData.canTakeMultiple;

  const dataToInsert = {
    ...validatedData,
    definition: definitionString,
    canTakeMultiple,
  };

  const result = await db.insert(surveys).values(dataToInsert).returning();
  return result[0];
}

export async function updateSurvey(
  id: string,
  surveyData: any
): Promise<Survey | undefined> {
  console.log("Update data received:", surveyData);

  // Only include fields that are actually provided
  const dataToUpdate: any = {};

  // Map json field to definition if needed and ensure it's a string
  if (surveyData.definition || surveyData.json) {
    const definition = surveyData.definition || surveyData.json;
    dataToUpdate.definition =
      typeof definition === "string" ? definition : JSON.stringify(definition);
  }

  // Only include title if provided
  if (surveyData.title !== undefined) {
    dataToUpdate.title = surveyData.title;
  }

  // Only include description if provided
  if (surveyData.description !== undefined) {
    dataToUpdate.description = surveyData.description;
  }

  // Convert boolean to integer for canTakeMultiple if present
  if (surveyData.canTakeMultiple !== undefined) {
    dataToUpdate.canTakeMultiple =
      typeof surveyData.canTakeMultiple === "boolean"
        ? surveyData.canTakeMultiple
          ? 1
          : 0
        : surveyData.canTakeMultiple;
  }

  // Always update the updatedAt timestamp
  dataToUpdate.updatedAt = new Date().toISOString();

  console.log("Data to update:", dataToUpdate);

  const result = await db
    .update(surveys)
    .set(dataToUpdate)
    .where(eq(surveys.id, id))
    .returning();
  return result[0];
}

export async function updateSurveyTitle(
  id: string,
  title: string
): Promise<Survey | undefined> {
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
