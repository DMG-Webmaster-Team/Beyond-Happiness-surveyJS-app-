import { NextRequest, NextResponse } from "next/server";
import { updateCompanySchema } from "@/db/queries/companies";

// Helper function to validate survey IDs exist in database
async function validateSurveyIds(
  tx: any,
  surveyIds: string[],
  happinessSurveyIds: string[]
) {
  const { surveys } = await import("../../../../db/schema/surveys");
  const { happinessSurveys } = await import("../../../../db/schema/happiness");
  const { inArray } = await import("drizzle-orm");

  console.log(
    `🔍 Validating ${surveyIds.length} regular and ${happinessSurveyIds.length} happiness survey IDs`
  );

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

  console.log(`✅ All survey IDs validated successfully`);
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

  console.log(`🔄 Updating survey assignments for company ${companyId}`);

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
    console.log(
      `✅ Added ${regularAssignments.length} regular survey assignments`
    );
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
    console.log(
      `✅ Added ${happinessAssignments.length} happiness survey assignments`
    );
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

  console.log(`👥 Auto-assigning surveys to users in company ${companyId}`);

  // Get all users in this company
  const companyUsers = await tx
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.companyId, companyId));

  if (companyUsers.length === 0) {
    console.log(`ℹ️ No users found in company ${companyId}`);
    return;
  }

  console.log(`👥 Found ${companyUsers.length} users in company`);

  const userIds = companyUsers.map((u: any) => u.id);
  const now = Date.now();

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
    console.log(
      `✅ Created ${regularAssignmentsList.length} regular survey assignments for users`
    );
  }

  if (happinessAssignmentsList.length > 0) {
    await tx.insert(happinessAssignments).values(happinessAssignmentsList);
    console.log(
      `✅ Created ${happinessAssignmentsList.length} happiness survey assignments for users`
    );
  }

  console.log(`🎉 Auto-assignment completed for company ${companyId}`);
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
    const now = Date.now();

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

    console.log(
      `✅ Synced ${userIds.length} users with company ${companyId} survey assignments`
    );
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

    console.log(`🔄 Updating company ${id} with:`, {
      name,
      surveyIds: surveyIds.length,
      happinessSurveyIds: happinessSurveyIds.length,
    });

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
    console.log(`🔄 Starting company update for ${id}`);
    const updatedCompany = await updateCompany(id, {
      name,
      description: description || null,
    });

    if (!updatedCompany) {
      throw new Error("Company not found");
    }

    console.log(`✅ Company updated successfully`);

    // Update survey assignments and sync with user assignments
    console.log(`🔄 Updating survey assignments and syncing with users`);

    const {
      updateCompanySurveyAssignments,
      updateCompanyHappinessSurveyAssignments,
    } = await import("../../../../db/queries/survey-company-assignments");

    // Auto-assign surveys to all users in the company
    console.log(`🔄 Auto-assigning surveys to company users`);

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
      console.log(`👥 Found ${companyUsers.length} users in company`);

      const userIds = companyUsers.map((u: any) => u.id);
      const now = Date.now();

      // Get all surveys that were previously assigned to this company BEFORE updating
      const { surveyCompanyAssignments, happinessSurveyCompanyAssignments } =
        await import("../../../../db/schema/survey-company-assignments");

      const previousRegularSurveys = await db
        .select({ surveyId: surveyCompanyAssignments.surveyId })
        .from(surveyCompanyAssignments)
        .where(eq(surveyCompanyAssignments.companyId, id));

      const previousHappinessSurveys = await db
        .select({ surveyId: happinessSurveyCompanyAssignments.surveyId })
        .from(happinessSurveyCompanyAssignments)
        .where(eq(happinessSurveyCompanyAssignments.companyId, id));

      const allPreviousRegularSurveyIds = previousRegularSurveys.map(
        (s) => s.surveyId
      );
      const allPreviousHappinessSurveyIds = previousHappinessSurveys.map(
        (s) => s.surveyId
      );

      // Remove ALL existing assignments for these users from company surveys
      if (allPreviousRegularSurveyIds.length > 0) {
        await db
          .delete(userAssignments)
          .where(
            and(
              inArray(userAssignments.userId, userIds),
              inArray(userAssignments.surveyId, allPreviousRegularSurveyIds)
            )
          );
        console.log(
          `🧹 Removed ${allPreviousRegularSurveyIds.length} previous regular survey assignments`
        );
      }

      if (allPreviousHappinessSurveyIds.length > 0) {
        await db
          .delete(happinessAssignments)
          .where(
            and(
              inArray(happinessAssignments.userId, userIds),
              inArray(
                happinessAssignments.surveyId,
                allPreviousHappinessSurveyIds
              )
            )
          );
        console.log(
          `🧹 Removed ${allPreviousHappinessSurveyIds.length} previous happiness survey assignments`
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
        console.log(
          `✅ Created ${regularAssignmentsList.length} regular survey assignments for users`
        );
      }

      if (happinessAssignmentsList.length > 0) {
        await db.insert(happinessAssignments).values(happinessAssignmentsList);
        console.log(
          `✅ Created ${happinessAssignmentsList.length} happiness survey assignments for users`
        );
      }

      console.log(`🎉 Auto-assignment completed for company ${id}`);
    } else {
      console.log(`ℹ️ No users found in company ${id}`);
    }

    // Update company survey assignments AFTER user assignments are handled
    await updateCompanySurveyAssignments(id, surveyIds, "system");
    await updateCompanyHappinessSurveyAssignments(
      id,
      happinessSurveyIds,
      "system"
    );

    console.log(`✅ Company survey assignments updated successfully`);

    const result = updatedCompany;

    console.log(`✅ Successfully updated company ${id}`);
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
