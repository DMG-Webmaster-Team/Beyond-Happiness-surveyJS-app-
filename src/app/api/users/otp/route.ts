import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

interface OTPRequest {
  email: string;
  phone?: string;
  otp: string;
  surveyId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, phone, otp, surveyId }: OTPRequest = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Dynamically import database functions to avoid build-time issues
    const { getUserByEmail } = await import("../../../../db/queries/users");
    const { surveys } = await import("../../../../db/schema");

    // Find user by email and OTP
    const user = await getUserByEmail(email);

    if (!user || user.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // If a specific survey is requested, verify access
    if (surveyId) {
      // Get survey information
      const { db } = await import("../../../../db/client");
      const survey = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, surveyId))
        .limit(1);

      if (!survey || survey.length === 0) {
        return NextResponse.json(
          { error: "Survey not found" },
          { status: 404 }
        );
      }

      // Check if user is assigned to this survey
      const { getUserAssignments } = await import(
        "../../../../db/queries/users"
      );
      const assignments = await getUserAssignments(user.id);
      const hasAssignment = assignments.some(
        (assignment: any) => assignment.assignment.surveyId === surveyId
      );

      if (!hasAssignment) {
        return NextResponse.json(
          { error: "You are not assigned to this survey" },
          { status: 403 }
        );
      }

      // Check if user has already submitted this survey (if it's not repeatable)
      if (!survey[0].canTakeMultiple) {
        const { results } = await import("../../../../db/schema");
        const existingSubmission = await db
          .select()
          .from(results)
          .where(
            and(eq(results.userId, user.id), eq(results.surveyId, surveyId))
          )
          .limit(1);

        if (existingSubmission.length > 0) {
          return NextResponse.json(
            {
              error:
                "You have already submitted this survey. This survey can only be completed once.",
            },
            { status: 403 }
          );
        }
      }

      // Return user data and survey info with assignments
      const { otp: _, ...userData } = user;
      const response = NextResponse.json({
        success: true,
        user: {
          ...userData,
          assignments: assignments.map((assignment: any) => ({
            surveyId: assignment.assignment.surveyId,
            surveyTitle: assignment.survey.title,
            status: assignment.assignment.status,
            dueAt: assignment.assignment.dueAt,
          })),
        },
        survey: survey[0],
      });

      // Set session cookie with short expiry (closes when browser closes)
      response.cookies.set({
        name: "user_session",
        value: JSON.stringify({
          ...userData,
          assignments: assignments.map((assignment: any) => ({
            surveyId: assignment.assignment.surveyId,
            surveyTitle: assignment.survey.title,
            status: assignment.assignment.status,
            dueAt: assignment.assignment.dueAt,
          })),
          loginTime: new Date().toISOString(),
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return response;
    }

    // If no specific survey requested, return user data with assignments
    const { otp: _, ...userData } = user;

    // Get user assignments for general login
    const { getUserAssignments } = await import("../../../../db/queries/users");
    const assignments = await getUserAssignments(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        ...userData,
        assignments: assignments.map((assignment: any) => ({
          surveyId: assignment.assignment.surveyId,
          surveyTitle: assignment.survey.title,
          status: assignment.assignment.status,
          dueAt: assignment.assignment.dueAt,
        })),
      },
    });

    // Set session cookie with short expiry (closes when browser closes)
    response.cookies.set({
      name: "user_session",
      value: JSON.stringify({
        ...userData,
        assignments: assignments.map((assignment: any) => ({
          surveyId: assignment.assignment.surveyId,
          surveyTitle: assignment.survey.title,
          status: assignment.assignment.status,
          dueAt: assignment.assignment.dueAt,
        })),
        loginTime: new Date().toISOString(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
