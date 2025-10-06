import { NextRequest, NextResponse } from "next/server";
import { createCompanySchema } from "@/db/queries/companies";

// Helper function to update survey assignments using many-to-many relationships

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
async function updateSurveyAssignments(
  companyId: string,
  companyName: string,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  try {
    const {
      updateCompanySurveyAssignments,
      updateCompanyHappinessSurveyAssignments,
    } = await import("../../../db/queries/survey-company-assignments");

    // Update survey assignments for this company (replaces existing assignments for this company only)
    await updateCompanySurveyAssignments(companyId, surveyIds, "system");
    await updateCompanyHappinessSurveyAssignments(
      companyId,
      happinessSurveyIds,
      "system"
    );

    console.log(
      `✅ Updated survey assignments for company ${companyId}: ${surveyIds.length} regular, ${happinessSurveyIds.length} happiness`
    );
  } catch (error) {
    console.error("Error updating survey assignments:", error);
    throw error;
  }
}

// Helper function to sync existing users with company survey assignments
async function syncUsersWithCompanySurveys(
  companyId: string,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  try {
    const { db } = await import("../../../db");
    const { users } = await import("../../../db/schema/users");
    const { userAssignments } = await import(
      "../../../db/schema/user-assignments"
    );
    const { happinessAssignments } = await import(
      "../../../db/schema/happiness"
    );
    const { eq, inArray, and } = await import("drizzle-orm");
    const { nanoid } = await import("nanoid");

    // Get all users assigned to this company
    const companyUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.companyId, companyId));

    if (companyUsers.length === 0) {
      return; // No users to sync
    }

    const userIds = companyUsers.map((u) => u.id);

    // Remove existing assignments for these users for this company's surveys
    if (surveyIds.length > 0) {
      await db
        .delete(userAssignments)
        .where(
          and(
            inArray(userAssignments.userId, userIds),
            inArray(userAssignments.surveyId, surveyIds)
          )
        );
    }

    if (happinessSurveyIds.length > 0) {
      await db
        .delete(happinessAssignments)
        .where(
          and(
            inArray(happinessAssignments.userId, userIds),
            inArray(happinessAssignments.surveyId, happinessSurveyIds)
          )
        );
    }

    // Add new assignments
    const now = Date.now();

    // Regular survey assignments
    if (surveyIds.length > 0) {
      const regularAssignments = [];
      for (const userId of userIds) {
        for (const surveyId of surveyIds) {
          regularAssignments.push({
            userId,
            surveyId,
            assignedAt: now,
            status: "pending",
          });
        }
      }

      if (regularAssignments.length > 0) {
        await db.insert(userAssignments).values(regularAssignments);
      }
    }

    // Happiness survey assignments
    if (happinessSurveyIds.length > 0) {
      const happinessAssignmentsList = [];
      for (const userId of userIds) {
        for (const surveyId of happinessSurveyIds) {
          happinessAssignmentsList.push({
            id: nanoid(),
            userId,
            surveyId,
            assignedAt: now,
            assignedBy: "system",
            isActive: true,
          });
        }
      }

      if (happinessAssignmentsList.length > 0) {
        await db.insert(happinessAssignments).values(happinessAssignmentsList);
      }
    }

    console.log(
      `✅ Synced ${userIds.length} users with company ${companyId} survey assignments`
    );
  } catch (error) {
    console.error("Error syncing users with company surveys:", error);
    throw error;
  }
}

// GET - List all companies
export async function GET() {
  try {
    // Dynamic import to avoid static generation issues
    const { listCompanies } = await import("../../../db/queries/companies");
    const companies = await listCompanies();

    return NextResponse.json({
      items: companies,
      total: companies.length,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, surveyIds = [], happinessSurveyIds = [] } = body;

    // Basic validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Dynamic import to avoid static generation issues
    const { createCompany, getCompanyByName } = await import(
      "../../../db/queries/companies"
    );

    // Check if company with same name already exists
    const existingCompany = await getCompanyByName(name);
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this name already exists" },
        { status: 409 }
      );
    }

    const company = await createCompany({
      name,
      description: description || null,
    });

    // Update survey assignments for the company
    await updateSurveyAssignments(
      company.id,
      name,
      surveyIds,
      happinessSurveyIds
    );

    // Sync any existing users that might be assigned to this company
    // This handles edge cases where users were created before company surveys were assigned
    if (surveyIds.length > 0 || happinessSurveyIds.length > 0) {
      try {
        await syncUsersWithCompanySurveys(
          company.id,
          surveyIds,
          happinessSurveyIds
        );
        console.log(
          `✅ Synced existing users with new company ${company.id} survey assignments`
        );
      } catch (error) {
        console.warn(
          `⚠️ Failed to sync existing users with company ${company.id}:`,
          error
        );
        // Don't fail company creation if user sync fails
      }
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
