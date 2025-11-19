import { eq, and, inArray } from "drizzle-orm";
import { db } from "../client";
import {
  surveyCompanyAssignments,
  happinessSurveyCompanyAssignments,
  type SurveyCompanyAssignment,
  type NewSurveyCompanyAssignment,
  type HappinessSurveyCompanyAssignment,
  type NewHappinessSurveyCompanyAssignment,
} from "../schema/survey-company-assignments";
import { companies } from "../schema/companies";
import { surveys } from "../schema/surveys";
import { happinessSurveys } from "../schema/happiness";

/**
 * Assign a regular survey to multiple companies (additive - doesn't remove existing assignments)
 */
export async function assignSurveyToCompanies(
  surveyId: string,
  companyIds: string[],
  assignedBy?: string
): Promise<SurveyCompanyAssignment[]> {
  if (companyIds.length === 0) {
    return [];
  }

  // Get existing assignments to avoid duplicates
  const existingAssignments = await db
    .select({ companyId: surveyCompanyAssignments.companyId })
    .from(surveyCompanyAssignments)
    .where(eq(surveyCompanyAssignments.surveyId, surveyId));

  const existingCompanyIds = new Set(
    existingAssignments.map((a) => a.companyId)
  );

  // Only create assignments for companies that don't already have this survey
  const newCompanyIds = companyIds.filter((id) => !existingCompanyIds.has(id));

  if (newCompanyIds.length === 0) {
    // Return existing assignments if no new ones to create
    return await db
      .select()
      .from(surveyCompanyAssignments)
      .where(eq(surveyCompanyAssignments.surveyId, surveyId));
  }

  const { createId } = await import("@paralleldrive/cuid2");
  const assignments = newCompanyIds.map((companyId) => ({
    id: createId(),
    surveyId,
    companyId,
    assignedBy,
  }));

  const result = await db.insert(surveyCompanyAssignments).values(assignments);
  return result;
}

/**
 * Assign a happiness survey to multiple companies (additive - doesn't remove existing assignments)
 */
export async function assignHappinessSurveyToCompanies(
  surveyId: string,
  companyIds: string[],
  assignedBy?: string
): Promise<HappinessSurveyCompanyAssignment[]> {
  if (companyIds.length === 0) {
    return [];
  }

  // Get existing assignments to avoid duplicates
  const existingAssignments = await db
    .select({ companyId: happinessSurveyCompanyAssignments.companyId })
    .from(happinessSurveyCompanyAssignments)
    .where(eq(happinessSurveyCompanyAssignments.surveyId, surveyId));

  const existingCompanyIds = new Set(
    existingAssignments.map((a) => a.companyId)
  );

  // Only create assignments for companies that don't already have this survey
  const newCompanyIds = companyIds.filter((id) => !existingCompanyIds.has(id));

  if (newCompanyIds.length === 0) {
    // Return existing assignments if no new ones to create
    return await db
      .select()
      .from(happinessSurveyCompanyAssignments)
      .where(eq(happinessSurveyCompanyAssignments.surveyId, surveyId));
  }

  const { createId } = await import("@paralleldrive/cuid2");
  const assignments = newCompanyIds.map((companyId) => ({
    id: createId(),
    surveyId,
    companyId,
    assignedBy,
  }));

  const result = await db
    .insert(happinessSurveyCompanyAssignments)
    .values(assignments);
  return result;
}

/**
 * Get companies assigned to a regular survey
 */
export async function getSurveyCompanies(surveyId: string): Promise<any[]> {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      description: companies.description,
      assignedAt: surveyCompanyAssignments.assignedAt,
      assignedBy: surveyCompanyAssignments.assignedBy,
    })
    .from(surveyCompanyAssignments)
    .innerJoin(companies, eq(surveyCompanyAssignments.companyId, companies.id))
    .where(eq(surveyCompanyAssignments.surveyId, surveyId));
}

/**
 * Get companies assigned to a happiness survey
 */
export async function getHappinessSurveyCompanies(
  surveyId: string
): Promise<any[]> {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      description: companies.description,
      assignedAt: happinessSurveyCompanyAssignments.assignedAt,
      assignedBy: happinessSurveyCompanyAssignments.assignedBy,
    })
    .from(happinessSurveyCompanyAssignments)
    .innerJoin(
      companies,
      eq(happinessSurveyCompanyAssignments.companyId, companies.id)
    )
    .where(eq(happinessSurveyCompanyAssignments.surveyId, surveyId));
}

/**
 * Get regular surveys assigned to a company
 * Checks both:
 * 1. Many-to-many assignments via surveyCompanyAssignments
 * 2. Direct assignments via companyId field in surveys table
 */
export async function getCompanySurveys(companyId: string): Promise<any[]> {
  // Get surveys from many-to-many table
  const assignedSurveys = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      description: surveys.description,
      isActive: surveys.isActive,
      isPublished: surveys.isPublished,
      assignedAt: surveyCompanyAssignments.assignedAt,
      assignedBy: surveyCompanyAssignments.assignedBy,
    })
    .from(surveyCompanyAssignments)
    .innerJoin(surveys, eq(surveyCompanyAssignments.surveyId, surveys.id))
    .where(
      and(
        eq(surveyCompanyAssignments.companyId, companyId),
        eq(surveys.isActive, true),
        eq(surveys.isPublished, true)
      )
    );

  // Get surveys with direct companyId assignment
  const directSurveys = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      description: surveys.description,
      isActive: surveys.isActive,
      isPublished: surveys.isPublished,
      assignedAt: surveys.createdAt, // Use createdAt as assignedAt for direct assignments
      assignedBy: "direct_assignment", // Indicate this is a direct assignment
    })
    .from(surveys)
    .where(
      and(
        eq(surveys.companyId, companyId),
        eq(surveys.isActive, true),
        eq(surveys.isPublished, true)
      )
    );

  // Merge both results, removing duplicates by id
  const surveyMap = new Map();
  [...assignedSurveys, ...directSurveys].forEach((survey) => {
    if (!surveyMap.has(survey.id)) {
      surveyMap.set(survey.id, survey);
    }
  });

  return Array.from(surveyMap.values());
}

/**
 * Get happiness surveys assigned to a company
 * Checks both:
 * 1. Many-to-many assignments via happinessSurveyCompanyAssignments
 * 2. Direct assignments via companyId field in happinessSurveys table
 */
export async function getCompanyHappinessSurveys(
  companyId: string
): Promise<any[]> {
  // Get surveys from many-to-many table
  const assignedSurveys = await db
    .select({
      id: happinessSurveys.id,
      title: happinessSurveys.title,
      isActive: happinessSurveys.isActive,
      isPublished: happinessSurveys.isPublished,
      assignedAt: happinessSurveyCompanyAssignments.assignedAt,
      assignedBy: happinessSurveyCompanyAssignments.assignedBy,
    })
    .from(happinessSurveyCompanyAssignments)
    .innerJoin(
      happinessSurveys,
      eq(happinessSurveyCompanyAssignments.surveyId, happinessSurveys.id)
    )
    .where(
      and(
        eq(happinessSurveyCompanyAssignments.companyId, companyId),
        eq(happinessSurveys.isActive, true),
        eq(happinessSurveys.isPublished, true)
      )
    );

  // Get surveys with direct companyId assignment
  const directSurveys = await db
    .select({
      id: happinessSurveys.id,
      title: happinessSurveys.title,
      isActive: happinessSurveys.isActive,
      isPublished: happinessSurveys.isPublished,
      assignedAt: happinessSurveys.createdAt, // Use createdAt as assignedAt for direct assignments
      assignedBy: "direct_assignment", // Indicate this is a direct assignment
    })
    .from(happinessSurveys)
    .where(
      and(
        eq(happinessSurveys.companyId, companyId),
        eq(happinessSurveys.isActive, true),
        eq(happinessSurveys.isPublished, true)
      )
    );

  // Merge both results, removing duplicates by id
  const surveyMap = new Map();
  [...assignedSurveys, ...directSurveys].forEach((survey) => {
    if (!surveyMap.has(survey.id)) {
      surveyMap.set(survey.id, survey);
    }
  });

  return Array.from(surveyMap.values());
}

/**
 * Get all surveys (regular + happiness) assigned to multiple companies
 */
export async function getMultiCompanySurveys(companyIds: string[]): Promise<{
  regularSurveys: any[];
  happinessSurveys: any[];
}> {
  if (companyIds.length === 0) {
    return { regularSurveys: [], happinessSurveys: [] };
  }

  const [regularSurveys, happinessSurveysResult] = await Promise.all([
    db
      .select({
        id: surveys.id,
        title: surveys.title,
        description: surveys.description,
        isActive: surveys.isActive,
        isPublished: surveys.isPublished,
      })
      .from(surveyCompanyAssignments)
      .innerJoin(surveys, eq(surveyCompanyAssignments.surveyId, surveys.id))
      .where(
        and(
          inArray(surveyCompanyAssignments.companyId, companyIds),
          eq(surveys.isActive, true),
          eq(surveys.isPublished, true)
        )
      ),

    db
      .select({
        id: happinessSurveys.id,
        title: happinessSurveys.title,
        isActive: happinessSurveys.isActive,
        isPublished: happinessSurveys.isPublished,
      })
      .from(happinessSurveyCompanyAssignments)
      .innerJoin(
        happinessSurveys,
        eq(happinessSurveyCompanyAssignments.surveyId, happinessSurveys.id)
      )
      .where(
        and(
          inArray(happinessSurveyCompanyAssignments.companyId, companyIds),
          eq(happinessSurveys.isActive, true),
          eq(happinessSurveys.isPublished, true)
        )
      ),
  ]);

  return { regularSurveys, happinessSurveys: happinessSurveysResult };
}

/**
 * Remove survey assignments for a company
 */
export async function removeSurveyCompanyAssignments(
  surveyId: string,
  companyIds: string[]
): Promise<void> {
  if (companyIds.length === 0) return;

  await Promise.all([
    db
      .delete(surveyCompanyAssignments)
      .where(
        and(
          eq(surveyCompanyAssignments.surveyId, surveyId),
          inArray(surveyCompanyAssignments.companyId, companyIds)
        )
      ),
    db
      .delete(happinessSurveyCompanyAssignments)
      .where(
        and(
          eq(happinessSurveyCompanyAssignments.surveyId, surveyId),
          inArray(happinessSurveyCompanyAssignments.companyId, companyIds)
        )
      ),
  ]);
}

/**
 * Update survey assignments for a specific company (replaces existing assignments for this company only)
 */
export async function updateCompanySurveyAssignments(
  companyId: string,
  surveyIds: string[],
  assignedBy?: string
): Promise<void> {
  // Remove existing assignments for this company
  await db
    .delete(surveyCompanyAssignments)
    .where(eq(surveyCompanyAssignments.companyId, companyId));

  // Add new assignments for this company
  if (surveyIds.length > 0) {
    // Validate that all survey IDs exist
    const { surveys } = await import("../schema/surveys");
    const { inArray } = await import("drizzle-orm");

    const existingSurveys = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(inArray(surveys.id, surveyIds));

    const existingSurveyIds = new Set(existingSurveys.map((s) => s.id));
    const validSurveyIds = surveyIds.filter((id) => existingSurveyIds.has(id));

    if (validSurveyIds.length !== surveyIds.length) {
      const invalidIds = surveyIds.filter((id) => !existingSurveyIds.has(id));
      console.warn(`⚠️ Skipping invalid survey IDs: ${invalidIds.join(", ")}`);
    }

    if (validSurveyIds.length > 0) {
      const { createId } = await import("@paralleldrive/cuid2");
      const assignments = validSurveyIds.map((surveyId) => ({
        id: createId(),
        surveyId,
        companyId,
        assignedBy,
      }));

      await db.insert(surveyCompanyAssignments).values(assignments);
    }
  }
}

/**
 * Update happiness survey assignments for a specific company (replaces existing assignments for this company only)
 */
export async function updateCompanyHappinessSurveyAssignments(
  companyId: string,
  surveyIds: string[],
  assignedBy?: string
): Promise<void> {
  // Remove existing assignments for this company
  await db
    .delete(happinessSurveyCompanyAssignments)
    .where(eq(happinessSurveyCompanyAssignments.companyId, companyId));

  // Add new assignments for this company
  if (surveyIds.length > 0) {
    // Validate that all happiness survey IDs exist
    const { happinessSurveys } = await import("../schema/happiness");
    const { inArray } = await import("drizzle-orm");

    const existingHappinessSurveys = await db
      .select({ id: happinessSurveys.id })
      .from(happinessSurveys)
      .where(inArray(happinessSurveys.id, surveyIds));

    const existingSurveyIds = new Set(
      existingHappinessSurveys.map((s) => s.id)
    );
    const validSurveyIds = surveyIds.filter((id) => existingSurveyIds.has(id));

    if (validSurveyIds.length !== surveyIds.length) {
      const invalidIds = surveyIds.filter((id) => !existingSurveyIds.has(id));
      console.warn(
        `⚠️ Skipping invalid happiness survey IDs: ${invalidIds.join(", ")}`
      );
    }

    if (validSurveyIds.length > 0) {
      const { createId } = await import("@paralleldrive/cuid2");
      const assignments = validSurveyIds.map((surveyId) => ({
        id: createId(),
        surveyId,
        companyId,
        assignedBy,
      }));

      await db.insert(happinessSurveyCompanyAssignments).values(assignments);
    }
  }
}
