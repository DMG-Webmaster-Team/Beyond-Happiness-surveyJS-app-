import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { surveys } from "@/db/schema/surveys";
import { results } from "@/db/schema/results";
import { userAssignments } from "@/db/schema/user-assignments";
import { eq, and } from "drizzle-orm";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";
interface UserSession {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  loginTime: string;
}

interface SurveySessionResponse {
  user?: {
    id: string;
    email: string;
    phone?: string;
    name?: string;
  };
  survey: {
    id: string;
    title: string;
    description?: string;
    json?: string;
    canTakeMultiple: boolean;
    isAnonymous: boolean;
    adminId: string;
  };
  submissionStatus: {
    hasSubmitted: boolean;
    canRetake: boolean;
    submissionCount: number;
  };
  assignment?: {
    status: string;
    dueAt?: Date | null;
  };
}

/**
 * Unified endpoint for survey session management
 * Handles both anonymous and authenticated surveys
 * Returns all necessary data for the survey page to render without flicker
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    const { surveyId } = params;

    if (!surveyId) {
      return NextResponse.json(
        { error: "Survey ID is required" },
        { status: 400 }
      );
    }

    // 1. Fetch the survey details first
    const [surveyData] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (!surveyData) {
      // Check if it's a happiness survey
      try {
        const { happinessSurveys } = await import("@/db/schema/happiness");
        const [happinessSurvey] = await db
          .select()
          .from(happinessSurveys)
          .where(eq(happinessSurveys.id, surveyId))
          .limit(1);

        if (happinessSurvey) {
          return NextResponse.json(
            {
              error: "This is a happiness survey",
              redirect: true,
              redirectUrl: `/happiness/${surveyId}`,
              surveyType: "happiness",
            },
            { status: 302 }
          );
        }
      } catch (error) {
        console.error("Error checking happiness survey:", error);
      }

      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // 2. Check for user authentication from cookie
    let userData: UserSession | null = null;
    const userSessionCookie = request.cookies.get("user_session");

    if (userSessionCookie) {
      try {
        const sessionData = JSON.parse(userSessionCookie.value);

        // Verify session is not expired (30 minutes)
        const loginTime = new Date(sessionData.loginTime).getTime();
        const sessionAge = Date.now() - loginTime;
        const thirtyMinutes = 30 * 60 * 1000;

        if (sessionAge <= thirtyMinutes) {
          // Verify user still exists in database
          const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, sessionData.id))
            .limit(1);
          if (dbUser) {
            userData = {
              id: dbUser.id,
              email: dbUser.email,
              phone: dbUser.phone || undefined,
              name: dbUser.name || undefined,
              loginTime: sessionData.loginTime,
            };
          } else {
          }
        } else {
        }
      } catch (error) {
        console.error("Error parsing user session:", error);
        // Invalid session, continue as anonymous
      }
    } else {
    }

    // 3. Determine submission status
    let submissionStatus = {
      hasSubmitted: false,
      canRetake: false,
      submissionCount: 0,
    };

    // For authenticated users, check their submission history
    if (userData) {
      const userResults = await db
        .select({
          id: results.id,
          surveyId: results.surveyId,
          userId: results.userId,
          submittedAt: results.submittedAt,
        })
        .from(results)
        .where(
          and(eq(results.userId, userData.id), eq(results.surveyId, surveyId))
        );

      submissionStatus.submissionCount = userResults.length;
      submissionStatus.hasSubmitted = userResults.length > 0;

      // Can retake if survey allows multiple submissions OR if never submitted
      submissionStatus.canRetake =
        Boolean(surveyData.canTakeMultiple) ||
        submissionStatus.submissionCount === 0;
    } else if (
      surveyData.isAnonymous === true ||
      (surveyData.isAnonymous as any) === 1
    ) {
      // For anonymous surveys, we can't track submissions server-side
      // The client may use temporary cookies/storage, but we always allow submission
      submissionStatus.canRetake = true;
      submissionStatus.hasSubmitted = false;
    } else {
      // Non-anonymous survey without authentication
      // This shouldn't happen due to middleware, but handle it gracefully
      return NextResponse.json(
        {
          error: "Authentication required",
          requiresAuth: true,
          redirectUrl: `/user/login?redirect=${surveyId}`,
        },
        { status: 401 }
      );
    }

    // 4. Check for survey assignment (if user is authenticated and survey is not anonymous)
    // ✅ SECURITY FIX: Block access if user is not assigned to non-anonymous survey
    // ✅ ANONYMOUS FIX: Skip assignment check entirely for anonymous surveys
    // ✅ PRODUCTION FIX: Handle MySQL boolean (1/0) and JavaScript boolean (true/false)
    const isAnonymous =
      surveyData.isAnonymous === true || (surveyData.isAnonymous as any) === 1;
    let assignmentData = null;
    if (!isAnonymous && userData) {
      // Only check assignments for non-anonymous surveys with authenticated users
      const [assignment] = await db
        .select()
        .from(userAssignments)
        .where(
          and(
            eq(userAssignments.userId, userData.id),
            eq(userAssignments.surveyId, surveyId)
          )
        )
        .limit(1);

      if (assignment) {
        assignmentData = {
          status: (assignment as any).status || "pending",
          dueAt: (assignment as any).dueAt
            ? new Date((assignment as any).dueAt)
            : null,
        };
      } else {
        // ✅ SECURITY FIX: User is authenticated but not assigned to this non-anonymous survey

        return NextResponse.json(
          {
            error: "You are not assigned to this survey",
            requiresAuth: false, // User is authenticated but not authorized
            assigned: false,
            message:
              "You are not assigned to this survey. Please contact your administrator.",
          },
          { status: 403 } // 403 Forbidden - authenticated but not authorized
        );
      }
    }

    // 5. Build the response
    const response: SurveySessionResponse = {
      survey: {
        id: surveyData.id,
        title: surveyData.title,
        description: surveyData.description || undefined,
        json:
          typeof surveyData.definition === "string"
            ? surveyData.definition
            : undefined,
        canTakeMultiple: Boolean(surveyData.canTakeMultiple),
        isAnonymous: Boolean(
          surveyData.isAnonymous === true ||
            (surveyData.isAnonymous as any) === 1
        ),
        adminId: surveyData.createdBy,
      },
      submissionStatus,
    };

    // Include user data if authenticated
    if (userData) {
      response.user = {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
      };
    }

    // Include assignment data if exists
    if (assignmentData) {
      response.assignment = assignmentData;
    }

    // Set cache headers to prevent stale data
    const apiResponse = NextResponse.json(response);
    apiResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    apiResponse.headers.set("Pragma", "no-cache");
    apiResponse.headers.set("Expires", "0");

    return apiResponse;
  } catch (error) {
    console.error("Error in survey-session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
