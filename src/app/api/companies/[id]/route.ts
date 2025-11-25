import { NextRequest, NextResponse } from "next/server";
import { updateCompanySchema } from "@/db/queries/companies";

// Helper function to validate survey IDs exist in database

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
async function validateSurveyIds(
  tx: any,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  const { surveys } = await import("../../../../db/schema/surveys");
  const { happinessSurveys } = await import("../../../../db/schema/happiness");
  const { inArray } = await import("drizzle-orm");

  // Validate regular survey IDs
  if (surveyIds.length > 0) {
    const existingSurveys = await tx
      .select({ id: surveys.id })
      .from(surveys)
      .where(inArray(surveys.id, surveyIds));

    const existingSurveyIds = new Set(existingSurveys.map((s: any) => s.id));
    const invalidSurveyIds = surveyIds.filter(
      (id) => !existingSurveyIds.has(id)
    );

    if (invalidSurveyIds.length > 0) {
      throw new Error(`Invalid survey IDs: ${invalidSurveyIds.join(", ")}`);
    }
  }

  // Validate happiness survey IDs
  if (happinessSurveyIds.length > 0) {
    const existingHappinessSurveys = await tx
      .select({ id: happinessSurveys.id })
      .from(happinessSurveys)
      .where(inArray(happinessSurveys.id, happinessSurveyIds));

    const existingHappinessSurveyIds = new Set(
      existingHappinessSurveys.map((s: any) => s.id)
    );
    const invalidHappinessSurveyIds = happinessSurveyIds.filter(
      (id) => !existingHappinessSurveyIds.has(id)
    );

    if (invalidHappinessSurveyIds.length > 0) {
      throw new Error(
        `Invalid happiness survey IDs: ${invalidHappinessSurveyIds.join(", ")}`
      );
    }
  }

}

// Helper function to update survey assignments within transaction
async function updateSurveyAssignmentsTransaction(
  tx: any,
  companyId: string,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  const { surveyCompanyAssignments, happinessSurveyCompanyAssignments } =
    await import("../../../../db/schema/survey-company-assignments");
  const { eq } = await import("drizzle-orm");
  const { createId } = await import("@paralleldrive/cuid2");

  // Remove existing assignments for this company
  await tx
    .delete(surveyCompanyAssignments)
    .where(eq(surveyCompanyAssignments.companyId, companyId));
  await tx
    .delete(happinessSurveyCompanyAssignments)
    .where(eq(happinessSurveyCompanyAssignments.companyId, companyId));

  // Add new regular survey assignments
  if (surveyIds.length > 0) {
    const regularAssignments = surveyIds.map((surveyId) => ({
      id: createId(),
      surveyId,
      companyId,
      assignedBy: "system",
    }));

    await tx.insert(surveyCompanyAssignments).values(regularAssignments);

  }

  // Add new happiness survey assignments
  if (happinessSurveyIds.length > 0) {
    const happinessAssignments = happinessSurveyIds.map((surveyId) => ({
      id: createId(),
      surveyId,
      companyId,
      assignedBy: "system",
    }));

    await tx
      .insert(happinessSurveyCompanyAssignments)
      .values(happinessAssignments);

  }
}

// Helper function to auto-assign surveys to existing company users
async function autoAssignSurveysToCompanyUsers(
  tx: any,
  companyId: string,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  const { users } = await import("../../../../db/schema/users");
  const { userAssignments } = await import(
    "../../../../db/schema/user-assignments"
  );
  const { happinessAssignments } = await import(
    "../../../../db/schema/happiness"
  );
  const { eq, and, inArray } = await import("drizzle-orm");
  const { nanoid } = await import("nanoid");

  // Get all users in this company
  const companyUsers = await tx
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.companyId, companyId));

  if (companyUsers.length === 0) {

    return;
  }

  const userIds = companyUsers.map((u: any) => u.id);
  const now = new Date();

  // Remove existing assignments for these users for the surveys we're updating
  if (surveyIds.length > 0) {
    await tx
      .delete(userAssignments)
      .where(
        and(
          inArray(userAssignments.userId, userIds),
          inArray(userAssignments.surveyId, surveyIds)
        )
      );
  }

  if (happinessSurveyIds.length > 0) {
    await tx
      .delete(happinessAssignments)
      .where(
        and(
          inArray(happinessAssignments.userId, userIds),
          inArray(happinessAssignments.surveyId, happinessSurveyIds)
        )
      );
  }

  // Create new assignments
  const regularAssignmentsList = [];
  const happinessAssignmentsList = [];

  // Regular survey assignments
  for (const user of companyUsers) {
    for (const surveyId of surveyIds) {
      regularAssignmentsList.push({
        userId: user.id,
        surveyId: surveyId,
        assignedAt: now,
        status: "pending",
      });
    }
  }

  // Happiness survey assignments
  for (const user of companyUsers) {
    for (const surveyId of happinessSurveyIds) {
      happinessAssignmentsList.push({
        id: nanoid(),
        userId: user.id,
        surveyId: surveyId,
        assignedAt: now,
        assignedBy: "system",
        isActive: true,
      });
    }
  }

  // Insert new assignments
  if (regularAssignmentsList.length > 0) {
    await tx.insert(userAssignments).values(regularAssignmentsList);

  }

  if (happinessAssignmentsList.length > 0) {
    await tx.insert(happinessAssignments).values(happinessAssignmentsList);

  }

}

// Helper function to update survey assignments using many-to-many relationships
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
    } = await import("../../../../db/queries/survey-company-assignments");

    // Update survey assignments for this company (replaces existing assignments for this company only)
    await updateCompanySurveyAssignments(companyId, surveyIds, "system");
    await updateCompanyHappinessSurveyAssignments(
      companyId,
      happinessSurveyIds,
      "system"
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
    const { db } = await import("../../../../db");
    const { users } = await import("../../../../db/schema/users");
    const { userAssignments } = await import(
      "../../../../db/schema/user-assignments"
    );
    const { happinessAssignments } = await import(
      "../../../../db/schema/happiness"
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
    const now = new Date();

    // Regular survey assignments
    if (surveyIds.length > 0) {
      const regularAssignments = [];
      for (const userId of userIds) {
        for (const surveyId of surveyIds) {
          regularAssignments.push({
            id: nanoid(),
            userId,
            surveyId,
            assignedAt: now,
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
          });
        }
      }

      if (happinessAssignmentsList.length > 0) {
        await db.insert(happinessAssignments).values(happinessAssignmentsList);
      }
    }

  } catch (error) {
    console.error("Error syncing users with company surveys:", error);
    throw error;
  }
}

// GET - Get a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { getCompanyById } = await import("../../../../db/queries/companies");
    const company = await getCompanyById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

// PUT - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, surveyIds = [], happinessSurveyIds = [] } = body;

    // Basic validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Dynamic imports
    const { db } = await import("../../../../db");
    const { updateCompany, getCompanyByName } = await import(
      "../../../../db/queries/companies"
    );

    // Check if another company with the same name exists
    const existingCompany = await getCompanyByName(name);
    if (existingCompany && existingCompany.id !== id) {
      return NextResponse.json(
        { error: "Another company with this name already exists" },
        { status: 409 }
      );
    }

    // Update company basic info

    const updatedCompany = await updateCompany(id, {
      name,
      description: description || null,
    });

    if (!updatedCompany) {
      throw new Error("Company not found");
    }

    // Update survey assignments and sync with user assignments

    const {
      updateCompanySurveyAssignments,
      updateCompanyHappinessSurveyAssignments,
    } = await import("../../../../db/queries/survey-company-assignments");

    // Auto-assign surveys to all users in the company

    // Use the database connection directly for user assignments
    const { users } = await import("../../../../db/schema/users");
    const { userAssignments } = await import(
      "../../../../db/schema/user-assignments"
    );
    const { happinessAssignments } = await import(
      "../../../../db/schema/happiness"
    );
    const { eq, and, inArray } = await import("drizzle-orm");
    const { nanoid } = await import("nanoid");

    // Get all users in this company
    const companyUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.companyId, id));

    if (companyUsers.length > 0) {

      const userIds = companyUsers.map((u: any) => u.id);
      const now = new Date();

      // Get all surveys currently assigned to this company
      const { surveyCompanyAssignments, happinessSurveyCompanyAssignments } =
        await import("../../../../db/schema/survey-company-assignments");

      const currentRegularSurveys = await db
        .select({ surveyId: surveyCompanyAssignments.surveyId })
        .from(surveyCompanyAssignments)
        .where(eq(surveyCompanyAssignments.companyId, id));

      const currentHappinessSurveys = await db
        .select({ surveyId: happinessSurveyCompanyAssignments.surveyId })
        .from(happinessSurveyCompanyAssignments)
        .where(eq(happinessSurveyCompanyAssignments.companyId, id));

      const currentRegularSurveyIds = currentRegularSurveys.map(
        (s) => s.surveyId
      );
      const currentHappinessSurveyIds = currentHappinessSurveys.map(
        (s) => s.surveyId
      );

      // Combine current and new survey IDs to get all surveys we need to clean up
      const allRegularSurveyIds = [
        ...new Set([...currentRegularSurveyIds, ...surveyIds]),
      ];
      const allHappinessSurveyIds = [
        ...new Set([...currentHappinessSurveyIds, ...happinessSurveyIds]),
      ];

      // Remove existing assignments for these specific surveys only
      if (allRegularSurveyIds.length > 0) {
        await db
          .delete(userAssignments)
          .where(
            and(
              inArray(userAssignments.userId, userIds),
              inArray(userAssignments.surveyId, allRegularSurveyIds)
            )
          );

      }

      if (allHappinessSurveyIds.length > 0) {
        await db
          .delete(happinessAssignments)
          .where(
            and(
              inArray(happinessAssignments.userId, userIds),
              inArray(happinessAssignments.surveyId, allHappinessSurveyIds)
            )
          );

      }

      // Create new assignments for currently selected surveys
      const regularAssignmentsList = [];
      const happinessAssignmentsList = [];

      // Regular survey assignments
      for (const user of companyUsers) {
        for (const surveyId of surveyIds) {
          regularAssignmentsList.push({
            userId: user.id,
            surveyId: surveyId,
            assignedAt: now,
            status: "pending",
          });
        }
      }

      // Happiness survey assignments
      for (const user of companyUsers) {
        for (const surveyId of happinessSurveyIds) {
          happinessAssignmentsList.push({
            id: nanoid(),
            userId: user.id,
            surveyId: surveyId,
            assignedAt: now,
            assignedBy: "system",
            isActive: true,
          });
        }
      }

      // Insert new assignments
      if (regularAssignmentsList.length > 0) {
        await db.insert(userAssignments).values(regularAssignmentsList);

      }

      if (happinessAssignmentsList.length > 0) {
        await db.insert(happinessAssignments).values(happinessAssignmentsList);

      }

    } else {

    }

    // Update company survey assignments AFTER user assignments are handled
    await updateCompanySurveyAssignments(id, surveyIds, "system");
    await updateCompanyHappinessSurveyAssignments(
      id,
      happinessSurveyIds,
      "system"
    );

    const result = updatedCompany;

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error updating company:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "Unknown",
      cause: error instanceof Error ? error.cause : undefined,
    });

    // Return user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("FOREIGN KEY constraint")) {
        return NextResponse.json(
          {
            error:
              "Invalid survey or company reference. Please refresh and try again.",
          },
          { status: 400 }
        );
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Invalid survey IDs")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to update company. Please try again." },
      { status: 500 }
    );
  }
}

// DELETE - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { deleteCompany } = await import("../../../../db/queries/companies");
    const deleted = await deleteCompany(id);

    if (!deleted) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
