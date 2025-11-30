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

    console.log(
      `[survey-session] 🔍 Starting survey session lookup for surveyId: ${surveyId}`
    );

    if (!surveyId) {
      console.log(`[survey-session] ❌ No surveyId provided`);
      return NextResponse.json(
        { error: "Survey ID is required" },
        { status: 400 }
      );
    }

    // 1. Fetch the survey details first
    console.log(`[survey-session] 📊 Looking up survey in surveys table...`);
    const [surveyData] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (!surveyData) {
      console.log(
        `[survey-session] ⚠️ Survey ${surveyId} not found in surveys table, checking happiness_surveys...`
      );
      // Check if it's a happiness survey
      try {
        const { happinessSurveys } = await import("@/db/schema/happiness");
        const [happinessSurvey] = await db
          .select()
          .from(happinessSurveys)
          .where(eq(happinessSurveys.id, surveyId))
          .limit(1);

        if (happinessSurvey) {
          console.log(
            `[survey-session] ✅ Found survey ${surveyId} in happiness_surveys table`
          );

          // Check accessMode to determine routing
          const accessMode = happinessSurvey.accessMode || "login";
          console.log(
            `[survey-session] 🔐 Happiness survey accessMode: ${accessMode}`
          );

          // Only redirect anonymous and collect_info surveys to /happiness/[id]
          // Login-required surveys should NOT be redirected - they stay at /user/survey/[id]
          if (accessMode === "anonymous" || accessMode === "collect_info") {
            console.log(
              `[survey-session] 🎭 Anonymous/collect_info happiness survey - redirecting to /happiness/${surveyId}`
            );
            return NextResponse.json(
              {
                error: "This is an anonymous happiness survey",
                redirect: true,
                redirectUrl: `/happiness/${surveyId}`,
                surveyType: "happiness",
                accessMode,
              },
              { status: 302 }
            );
          }

          // For login-required happiness surveys, return a special response
          // indicating this is a happiness survey that requires auth
          // The /user/survey/[id] page will detect this and render appropriately
          console.log(
            `[survey-session] 🔒 Login-required happiness survey - returning happiness survey indicator`
          );
          return NextResponse.json(
            {
              isHappinessSurvey: true,
              surveyType: "happiness",
              accessMode,
              requiresAuth: true,
              survey: {
                id: happinessSurvey.id,
                title: happinessSurvey.title,
                accessMode: happinessSurvey.accessMode,
              },
            },
            { status: 200 }
          );
        }
      } catch (error) {
        console.error(
          "[survey-session] ❌ Error checking happiness survey:",
          error
        );
      }

      console.log(
        `[survey-session] ❌ Survey ${surveyId} not found in any table`
      );
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Log survey found and check isAnonymous value
    console.log(
      `[survey-session] ✅ Survey found: ${surveyData.id} - "${surveyData.title}"`
    );
    console.log(
      `[survey-session] 📋 Raw isAnonymous value from DB:`,
      surveyData.isAnonymous,
      `(type: ${typeof surveyData.isAnonymous})`
    );

    // Check isAnonymous early for logging
    const isAnonymousEarly =
      surveyData.isAnonymous === true || (surveyData.isAnonymous as any) === 1;
    console.log(
      `[survey-session] 🔐 isAnonymous check result: ${isAnonymousEarly} (${
        surveyData.isAnonymous === true ? "true match" : ""
      } ${(surveyData.isAnonymous as any) === 1 ? "1 match" : ""})`
    );

    // 2. Check for user authentication from cookie
    let userData: UserSession | null = null;
    const userSessionCookie = request.cookies.get("user_session");

    console.log(
      `[survey-session] 🍪 User session cookie present: ${!!userSessionCookie}`
    );

    if (isAnonymousEarly) {
      console.log(
        `[survey-session] 🎭 Anonymous survey detected - skipping session parsing`
      );
    }

    if (userSessionCookie && !isAnonymousEarly) {
      console.log(
        `[survey-session] 🔑 Parsing user session cookie (non-anonymous survey)...`
      );
      try {
        const sessionData = JSON.parse(userSessionCookie.value);

        // Verify session is not expired (30 minutes)
        const loginTime = new Date(sessionData.loginTime).getTime();
        const sessionAge = Date.now() - loginTime;
        const thirtyMinutes = 30 * 60 * 1000;

        if (sessionAge <= thirtyMinutes) {
          console.log(
            `[survey-session] ✅ Session valid, verifying user in database...`
          );
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
            console.log(
              `[survey-session] ✅ User authenticated: ${userData.email}`
            );
          } else {
            console.log(
              `[survey-session] ⚠️ User ${sessionData.id} not found in database`
            );
          }
        } else {
          console.log(
            `[survey-session] ⚠️ Session expired (age: ${Math.round(
              sessionAge / 1000 / 60
            )} minutes)`
          );
        }
      } catch (error) {
        console.error("[survey-session] ❌ Error parsing user session:", error);
        // Invalid session, continue as anonymous
      }
    } else if (userSessionCookie && isAnonymousEarly) {
      console.log(
        `[survey-session] 🎭 Anonymous survey - session cookie present but skipping parsing`
      );
    } else {
      console.log(
        `[survey-session] 👤 No session cookie - proceeding as anonymous`
      );
    }

    // 3. Determine submission status
    console.log(`[survey-session] 📝 Determining submission status...`);
    let submissionStatus = {
      hasSubmitted: false,
      canRetake: false,
      submissionCount: 0,
    };

    // For authenticated users, check their submission history
    if (userData) {
      console.log(
        `[survey-session] 👤 Checking submission history for authenticated user...`
      );
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
      console.log(
        `[survey-session] 🎭 Anonymous survey - allowing submission (no tracking)`
      );
      submissionStatus.canRetake = true;
      submissionStatus.hasSubmitted = false;
    } else {
      console.log(
        `[survey-session] 🔒 Non-anonymous survey without authentication - requiring auth`
      );
      // Non-anonymous survey without authentication
      // This shouldn't happen due to middleware, but handle it gracefully
      return NextResponse.json(
        {
          error: "Authentication required",
          requiresAuth: true,
          redirectUrl: `/user/survey/${surveyId}`,
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
    console.log(`[survey-session] 🔐 Final isAnonymous check: ${isAnonymous}`);

    let assignmentData = null;
    if (!isAnonymous && userData) {
      console.log(
        `[survey-session] 📋 Checking assignment for authenticated user...`
      );
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
    console.log(`[survey-session] 📦 Building response...`);
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
      console.log(`[survey-session] 👤 Including user data in response`);
    } else {
      console.log(`[survey-session] 👤 No user data in response (anonymous)`);
    }

    // Include assignment data if exists
    if (assignmentData) {
      response.assignment = assignmentData;
      console.log(`[survey-session] 📋 Including assignment data in response`);
    }

    console.log(
      `[survey-session] ✅ Response built successfully - isAnonymous: ${
        response.survey.isAnonymous
      }, hasUser: ${!!response.user}`
    );

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
    console.error("[survey-session] ❌ Error in survey-session API:", error);
    console.error(
      "[survey-session] ❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
