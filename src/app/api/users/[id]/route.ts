import { NextRequest, NextResponse } from "next/server";
import {
  getUserById,
  updateUser,
  deleteUser,
} from "../../../../db/queries/users";
import { userSchema } from "../../../../lib/validation/import-schemas";

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate input (only validate provided fields)
    const updateData = userSchema.partial().parse(body);

    // Check if company is being changed
    const isCompanyChanged =
      updateData.companyId !== undefined &&
      updateData.companyId !== existingUser.companyId;

    // Fetch company name if companyId is being updated
    if (updateData.companyId) {
      try {
        const { getCompanyById } = await import(
          "../../../../db/queries/companies"
        );
        const company = await getCompanyById(updateData.companyId);
        if (company) {
          updateData.companyName = company.name;
          console.log(
            `🏢 Updated company name: ${company.name} (${updateData.companyId})`
          );
        } else {
          console.warn(`⚠️ Company not found for ID: ${updateData.companyId}`);
          updateData.companyName = null;
        }
      } catch (error) {
        console.error("Error fetching company name during update:", error);
        updateData.companyName = null;
      }
    } else if (updateData.companyId === null || updateData.companyId === "") {
      // If company is being removed, clear the company name
      updateData.companyName = null;
    }

    // Update user
    const updatedUser = await updateUser(id, updateData);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    // If company was changed, update survey assignments
    if (isCompanyChanged && updateData.companyId) {
      console.log(
        `🔄 Company changed for user ${id}, updating survey assignments`
      );

      try {
        // Get company's surveys for auto-assignment
        const { getCompanySurveys, getCompanyHappinessSurveys } = await import(
          "../../../../db/queries/survey-company-assignments"
        );

        const [companySurveys, companyHappinessSurveys] = await Promise.all([
          getCompanySurveys(updateData.companyId),
          getCompanyHappinessSurveys(updateData.companyId),
        ]);

        const companySurveyIds = companySurveys.map((s: any) => s.id);
        const companyHappinessIds = companyHappinessSurveys.map(
          (s: any) => s.id
        );

        // Remove old company survey assignments
        if (existingUser.companyId) {
          const { db } = await import("../../../../db");
          const { userAssignments } = await import(
            "../../../../db/schema/user-assignments"
          );
          const { happinessAssignments } = await import(
            "../../../../db/schema/happiness"
          );
          const { eq, and, inArray } = await import("drizzle-orm");

          // Get old company's surveys
          const [oldCompanySurveys, oldCompanyHappinessSurveys] =
            await Promise.all([
              getCompanySurveys(existingUser.companyId),
              getCompanyHappinessSurveys(existingUser.companyId),
            ]);

          const oldCompanySurveyIds = oldCompanySurveys.map((s: any) => s.id);
          const oldCompanyHappinessIds = oldCompanyHappinessSurveys.map(
            (s: any) => s.id
          );

          // Remove old assignments
          if (oldCompanySurveyIds.length > 0) {
            await db
              .delete(userAssignments)
              .where(
                and(
                  eq(userAssignments.userId, id),
                  inArray(userAssignments.surveyId, oldCompanySurveyIds)
                )
              );
          }

          if (oldCompanyHappinessIds.length > 0) {
            await db
              .delete(happinessAssignments)
              .where(
                and(
                  eq(happinessAssignments.userId, id),
                  inArray(happinessAssignments.surveyId, oldCompanyHappinessIds)
                )
              );
          }
        }

        // Create new assignments
        if (companySurveyIds.length > 0 || companyHappinessIds.length > 0) {
          const { createUserAssignment, createHappinessAssignment } =
            await import("../../../../db/queries/users");

          const now = Date.now();

          // Create regular survey assignments
          for (const surveyId of companySurveyIds) {
            try {
              await createUserAssignment({
                userId: id,
                surveyId: surveyId,
                status: "pending",
              });
            } catch (error) {
              console.warn(
                `Failed to assign regular survey ${surveyId} to user ${id}:`,
                error
              );
            }
          }

          // Create happiness survey assignments
          for (const surveyId of companyHappinessIds) {
            try {
              await createHappinessAssignment({
                userId: id,
                surveyId: surveyId,
                assignedBy: "system",
                isActive: true,
              });
            } catch (error) {
              console.warn(
                `Failed to assign happiness survey ${surveyId} to user ${id}:`,
                error
              );
            }
          }

          console.log(
            `✅ Auto-assigned ${companySurveyIds.length} regular surveys and ${companyHappinessIds.length} happiness surveys from new company`
          );
        }
      } catch (error) {
        console.error(
          "Error updating survey assignments after company change:",
          error
        );
        // Don't fail the user update if survey assignment fails
      }
    }

    return NextResponse.json({
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Soft delete user
    const success = await deleteUser(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
