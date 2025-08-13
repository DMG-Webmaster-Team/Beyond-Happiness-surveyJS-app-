import { NextRequest, NextResponse } from "next/server";
import {
  listUsers,
  createUser,
  getUserByEmail,
} from "../../../db/queries/users";
import { userSchema } from "../../../lib/validation/import-schemas";

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

    // Fetch assignments for each user
    const usersWithAssignments = await Promise.all(
      result.users.map(async (user) => {
        const { getUserAssignments } = await import(
          "../../../db/queries/users"
        );
        const assignments = await getUserAssignments(user.id);

        return {
          ...user,
          assignments: assignments.map((assignment: any) => ({
            surveyId: assignment.assignment.surveyId,
            surveyTitle: assignment.survey.title,
            status: assignment.assignment.status,
          })),
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

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = userSchema.parse(body);

    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create user
    const newUser = await createUser(validatedData);

    return NextResponse.json(
      {
        data: newUser,
        message: "User created successfully",
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
