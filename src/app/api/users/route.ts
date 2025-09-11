import { NextRequest, NextResponse } from "next/server";
import {
  listUsers,
  createUser,
  getUserByEmail,
} from "../../../db/queries/users";
import { userSchema } from "../../../lib/validation/import-schemas";
import {
  ErrorCode,
  createApiError,
  validateEgyptianPhone,
} from "@/utils/errors";

// GET /api/users - List users with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || undefined;

    const result = await listUsers({
      query,
      page,
      limit,
      status,
    });

    // Fetch assignments for each user (both regular and happiness)
    const usersWithAssignments = await Promise.all(
      result.users.map(async (user) => {
        const { getUserAssignments } = await import(
          "../../../db/queries/users"
        );

        // Get regular assignments
        const regularAssignments = await getUserAssignments(user.id);

        // Get happiness assignments
        const { happinessAssignments, happinessSurveys } = await import(
          "../../../db/schema/happiness"
        );
        const { db } = await import("../../../db/client");
        const { eq } = await import("drizzle-orm");

        const happinessAssignmentsResult = await db
          .select({
            assignment: happinessAssignments,
            survey: happinessSurveys,
          })
          .from(happinessAssignments)
          .innerJoin(
            happinessSurveys,
            eq(happinessAssignments.surveyId, happinessSurveys.id)
          )
          .where(eq(happinessAssignments.userId, user.id));

        // Combine all assignments
        const allAssignments = [
          ...regularAssignments.map((assignment: any) => ({
            surveyId: assignment.assignment.surveyId,
            surveyTitle: assignment.survey.title,
            status: assignment.assignment.status,
            type: "regular",
          })),
          ...happinessAssignmentsResult.map((assignment: any) => ({
            surveyId: assignment.assignment.surveyId,
            surveyTitle: assignment.survey.title,
            status: assignment.assignment.isActive ? "active" : "inactive",
            type: "happiness",
          })),
        ];

        return {
          ...user,
          assignments: allAssignments,
        };
      })
    );

    return NextResponse.json({
      data: usersWithAssignments,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user with company and survey assignment logic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = userSchema.parse(body);

    // Additional validation for phone number
    if (validatedData.phone && !validateEgyptianPhone(validatedData.phone)) {
      return NextResponse.json(createApiError(ErrorCode.PHONE_INVALID), {
        status: 400,
      });
    }

    // Validation: Must have at least one assignment: company OR surveys
    const hasCompany = !!validatedData.companyId;
    const hasSurveys =
      (validatedData.surveyAssignments?.length || 0) > 0 ||
      (validatedData.happinessSurveyAssignments?.length || 0) > 0;

    if (!hasCompany && !hasSurveys) {
      return NextResponse.json(
        {
          error:
            "Please select at least one of the following: Company, Regular Survey, or Happiness Survey.",
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // If company is selected, fetch company's surveys for auto-assignment
    let finalSurveyAssignments = validatedData.surveyAssignments || [];
    let finalHappinessAssignments =
      validatedData.happinessSurveyAssignments || [];

    if (validatedData.companyId) {
      try {
        // Use direct database queries instead of HTTP requests for better performance
        const { getCompanySurveys, getCompanyHappinessSurveys } = await import(
          "../../../db/queries/survey-company-assignments"
        );

        const [companySurveys, companyHappinessSurveys] = await Promise.all([
          getCompanySurveys(validatedData.companyId),
          getCompanyHappinessSurveys(validatedData.companyId),
        ]);

        const companySurveyIds = companySurveys.map((s: any) => s.id);
        const companyHappinessIds = companyHappinessSurveys.map(
          (s: any) => s.id
        );

        finalSurveyAssignments = Array.from(
          new Set([...finalSurveyAssignments, ...companySurveyIds])
        );
        finalHappinessAssignments = Array.from(
          new Set([...finalHappinessAssignments, ...companyHappinessIds])
        );

        console.log(
          `🏢 Auto-assigned ${companySurveyIds.length} regular surveys and ${companyHappinessIds.length} happiness surveys from company ${validatedData.companyId}`
        );
        console.log(`📋 Company survey IDs:`, companySurveyIds);
        console.log(`😊 Company happiness survey IDs:`, companyHappinessIds);
        console.log(`📊 Final survey assignments:`, finalSurveyAssignments);
        console.log(
          `😊 Final happiness assignments:`,
          finalHappinessAssignments
        );
      } catch (error) {
        console.error("Error fetching company surveys:", error);
        // Continue with manual assignments if company survey fetch fails
      }
    }

    // Create user
    const newUser = await createUser({
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone,
      status: validatedData.status,
      companyId: validatedData.companyId,
    });

    // Create survey assignments
    const assignmentResults = {
      regularAssignments: 0,
      happinessAssignments: 0,
      errors: [] as string[],
    };

    // Assign regular surveys
    if (finalSurveyAssignments.length > 0) {
      try {
        const { createUserAssignment } = await import(
          "../../../db/queries/users"
        );
        for (const surveyId of finalSurveyAssignments) {
          try {
            await createUserAssignment({
              userId: newUser.id,
              surveyId,
              status: "pending",
            });
            assignmentResults.regularAssignments++;
          } catch (error) {
            console.error(`Error assigning regular survey ${surveyId}:`, error);
            assignmentResults.errors.push(
              `Failed to assign regular survey ${surveyId}`
            );
          }
        }
      } catch (error) {
        console.error("Error importing assignment function:", error);
        assignmentResults.errors.push("Failed to load assignment system");
      }
    }

    // Assign happiness surveys
    if (finalHappinessAssignments.length > 0) {
      try {
        const { db } = await import("../../../db");
        const { happinessAssignments } = await import(
          "../../../db/schema/happiness"
        );
        const { nanoid } = await import("nanoid");

        for (const surveyId of finalHappinessAssignments) {
          try {
            await db.insert(happinessAssignments).values({
              id: nanoid(),
              surveyId,
              userId: newUser.id,
              assignedBy: "system", // Could be enhanced to track admin
              isActive: true,
            });
            assignmentResults.happinessAssignments++;
          } catch (error) {
            console.error(
              `Error assigning happiness survey ${surveyId}:`,
              error
            );
            assignmentResults.errors.push(
              `Failed to assign happiness survey ${surveyId}`
            );
          }
        }
      } catch (error) {
        console.error("Error creating happiness assignments:", error);
        assignmentResults.errors.push(
          "Failed to create happiness survey assignments"
        );
      }
    }

    const message = `User created successfully! Assigned ${assignmentResults.regularAssignments} regular surveys and ${assignmentResults.happinessAssignments} happiness surveys.`;

    return NextResponse.json(
      {
        data: newUser,
        message,
        assignments: assignmentResults,
        warnings:
          assignmentResults.errors.length > 0
            ? assignmentResults.errors
            : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(createApiError(ErrorCode.USER_CREATE_FAILED), {
      status: 500,
    });
  }
}
