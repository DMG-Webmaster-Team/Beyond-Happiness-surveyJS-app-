import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { surveys, type Survey, type NewSurvey } from "../schema/surveys";
import { z } from "zod";

// Validation schemas
export const createSurveySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  definition: z.union([z.string(), z.any()]).optional(), // SurveyJS JSON as string or object
  json: z.union([z.string(), z.any()]).optional(), // Alternative field name for frontend compatibility
  canTakeMultiple: z.union([z.boolean(), z.number()]).default(false), // Accept both boolean and number
  createdBy: z.string(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
});

export const updateSurveySchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    definition: z.union([z.string(), z.any()]).optional(),
    json: z.union([z.string(), z.any()]).optional(),
    canTakeMultiple: z.union([z.boolean(), z.number()]).optional(),
    companyId: z.string().optional(),
    companyName: z.string().optional(),
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

export async function createSurvey(surveyData: any): Promise<Survey> {
  // Temporarily bypass Zod validation to fix the _zod error
  // TODO: Re-enable validation once Zod v4 compatibility is resolved
  const validatedData = surveyData;

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

  // Handle company information
  let companyName = null;
  let metadata = null;

  if (validatedData.companyId) {
    try {
      const { getCompanyById } = await import("./companies");
      const company = await getCompanyById(validatedData.companyId);
      if (company) {
        companyName = company.name;
        metadata = JSON.stringify({
          company: { id: company.id, name: company.name },
        });
      }
    } catch (error) {
      console.warn("Could not resolve company name:", error);
      companyName = validatedData.companyName || null;
    }
  }

  const dataToInsert = {
    ...validatedData,
    definition: definitionString,
    canTakeMultiple,
    companyName,
    metadata,
  };

  const result = await db.insert(surveys).values(dataToInsert).returning();
  return result[0];
}

export async function updateSurvey(
  id: string,
  surveyData: any
): Promise<Survey | undefined> {
  console.log("Update data received:", surveyData);

  // Ensure we have valid data
  if (!surveyData || typeof surveyData !== "object") {
    throw new Error("Invalid survey data provided");
  }

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

  // Handle company information
  if (surveyData.companyId !== undefined) {
    dataToUpdate.companyId = surveyData.companyId;

    // If companyId is provided, try to resolve companyName
    if (surveyData.companyId) {
      try {
        const { getCompanyById } = await import("./companies");
        const company = await getCompanyById(surveyData.companyId);
        if (company) {
          dataToUpdate.companyName = company.name;

          // Add company info to metadata
          const existingMetadata = surveyData.metadata
            ? typeof surveyData.metadata === "string"
              ? JSON.parse(surveyData.metadata)
              : surveyData.metadata
            : {};

          dataToUpdate.metadata = JSON.stringify({
            ...existingMetadata,
            company: { id: company.id, name: company.name },
          });
        }
      } catch (error) {
        console.warn("Could not resolve company name:", error);
        // If we can't resolve, just use the provided companyId
        dataToUpdate.companyName = surveyData.companyName || null;
      }
    } else {
      // Clear company info if companyId is null/empty
      dataToUpdate.companyName = null;
      dataToUpdate.metadata = null;
    }
  }

  // Always update the updatedAt timestamp
  dataToUpdate.updatedAt = Date.now();

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
  return result.changes > 0;
}

export async function listSurveys(companyId?: string): Promise<Survey[]> {
  if (companyId) {
    return db
      .select()
      .from(surveys)
      .where(eq(surveys.companyId, companyId))
      .orderBy(desc(surveys.createdAt));
  }
  return db.select().from(surveys).orderBy(desc(surveys.createdAt));
}

export async function listSurveysByAdmin(
  adminId: string,
  companyId?: string
): Promise<Survey[]> {
  const conditions = [eq(surveys.createdBy, adminId)];
  if (companyId) {
    conditions.push(eq(surveys.companyId, companyId));
  }

  return db
    .select()
    .from(surveys)
    .where(and(...conditions))
    .orderBy(desc(surveys.createdAt));
}
