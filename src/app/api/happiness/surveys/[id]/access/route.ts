import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessSurveys,
  happinessAssignments,
  happinessResults,
  happinessCharacters,
} from "@/db/schema/happiness";
import { eq, and, desc } from "drizzle-orm";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;

    // Get survey details first
    const survey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (survey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const surveyData = survey[0];
    // Fallback for missing accessMode column (before migration)
    const accessMode =
      surveyData.accessMode || (surveyData.anonymous ? "anonymous" : "login");

    // For anonymous and collect_info modes, always allow access (subject to cooldown if configured)
    if (accessMode === "anonymous" || accessMode === "collect_info") {
      // For anonymous and collect_info surveys, we could still enforce cooldown based on IP or other identifier
      // But for now, we'll allow unlimited access
      return NextResponse.json({
        assigned: true,
        requiresAuth: false,
        canAccess: true,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message:
          accessMode === "collect_info"
            ? "Access granted - user data will be collected"
            : "Access granted to anonymous survey",
        survey: {
          ...surveyData,
          accessMode,
        },
        accessMode,
      });
    }

    // For non-anonymous surveys, get userId from session cookie
    const userSession = request.cookies.get("user_session");
    let userId: string | null = null;

    if (userSession) {
      try {
        // Handle both string and object values
        const sessionData =
          typeof userSession.value === "string"
            ? JSON.parse(userSession.value)
            : userSession.value;

        // Validate session data structure
        if (sessionData && sessionData.id && sessionData.loginTime) {
          const loginTime = new Date(sessionData.loginTime).getTime();
          const sessionAge = Date.now() - loginTime;
          const thirtyMinutes = 30 * 60 * 1000;

          if (sessionAge <= thirtyMinutes) {
            userId = sessionData.id;
          } else {
            console.log("🔍 Session expired:", {
              sessionAge: Math.round(sessionAge / 1000 / 60),
              maxAge: 30,
              userId: sessionData.id,
            });
          }
        } else {
          console.log("🔍 Invalid session data structure:", sessionData);
        }
      } catch (error) {
        console.error("Error parsing session cookie:", error);
      }
    }

    // Log session debugging info
    console.log("🔍 CROSS-TAB TEST - Happiness Access API Debug:", {
      path: "/access",
      method: "GET",
      surveyId,
      hasSessionCookie: !!userSession,
      userIdFromSession: userId,
      sessionCookieValue: userSession
        ? userSession.value.substring(0, 50) + "..."
        : null,
      anonymous: surveyData.anonymous,
      timestamp: new Date().toISOString(),
      userAgent:
        request.headers.get("user-agent")?.substring(0, 100) || "unknown",
    });

    if (!userId) {
      return NextResponse.json({
        assigned: false,
        requiresAuth: true,
        canAccess: false,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message: "Authentication required for this survey",
        survey: {
          ...surveyData,
          accessMode,
        },
        accessMode,
      });
    }

    // Check if user is assigned to this survey (either directly or via company)
    console.log("🔍 Checking happiness assignment:", {
      surveyId,
      userId,
      checkingTable: "happiness_assignments",
    });

    const assignment = await db
      .select()
      .from(happinessAssignments)
      .where(
        and(
          eq(happinessAssignments.surveyId, surveyId),
          eq(happinessAssignments.userId, userId),
          eq(happinessAssignments.isActive, true)
        )
      )
      .limit(1);

    console.log("🔍 CROSS-TAB TEST - Assignment check result:", {
      assignmentFound: assignment.length > 0,
      assignmentCount: assignment.length,
      assignment: assignment[0] || null,
      surveyId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // If no direct assignment, check if user's company matches survey's company
    if (assignment.length === 0 && surveyData.companyId) {
      console.log("🔍 No direct assignment, checking company access:", {
        surveyCompanyId: surveyData.companyId,
        userId,
      });

      // Import users schema
      const { users } = await import("@/db/schema/users");

      // Get user's company
      const user = await db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length > 0 && user[0].companyId === surveyData.companyId) {
        console.log("✅ User has access via company assignment:", {
          userCompanyId: user[0].companyId,
          surveyCompanyId: surveyData.companyId,
        });

        // Grant access via company membership
        // Continue to cooldown check below
      } else {
        console.log("❌ User not assigned to happiness survey:", {
          surveyId,
          userId,
          userCompanyId: user[0]?.companyId || null,
          surveyCompanyId: surveyData.companyId,
          message:
            "No active assignment found in happiness_assignments table or company mismatch",
        });

        return NextResponse.json({
          assigned: false,
          requiresAuth: false, // User is authenticated, but not assigned
          canAccess: false,
          cooldown: false,
          cooldownRemaining: 0,
          hasPreviousResult: false,
          message: "You are not assigned to this survey",
          survey: {
            ...surveyData,
            accessMode,
          },
          accessMode,
        });
      }
    } else if (assignment.length === 0) {
      console.log("❌ User not assigned to happiness survey:", {
        surveyId,
        userId,
        message: "No active assignment found and no company assignment",
      });

      return NextResponse.json({
        assigned: false,
        requiresAuth: false, // User is authenticated, but not assigned
        canAccess: false,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message: "You are not assigned to this survey",
        survey: {
          ...surveyData,
          accessMode,
        },
        accessMode,
      });
    }

    // Check cooldown if there are existing results
    const recentResults = await db
      .select({
        id: happinessResults.id,
        createdAt: happinessResults.createdAt,
        code: happinessResults.code,
        categoryTotals: happinessResults.categoryTotals,
        characterId: happinessResults.characterId,
      })
      .from(happinessResults)
      .where(
        and(
          eq(happinessResults.surveyId, surveyId),
          eq(happinessResults.userId, userId)
        )
      )
      .orderBy(desc(happinessResults.createdAt))
      .limit(1);

    if (recentResults.length === 0) {
      // No previous results, access allowed
      return NextResponse.json({
        assigned: true,
        requiresAuth: true,
        canAccess: true,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message: "Access granted",
        survey: {
          ...surveyData,
          accessMode,
        },
        accessMode,
      });
    }

    // Check cooldown
    const cooldownDays = surveyData.retakeCooldownDays || 0;
    if (cooldownDays > 0) {
      const lastSubmission = recentResults[0];
      if (lastSubmission.createdAt) {
        const cooldownPeriod = cooldownDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        const lastSubmissionTime = new Date(lastSubmission.createdAt).getTime();
        const timeSinceLastSubmission = Date.now() - lastSubmissionTime;

        if (timeSinceLastSubmission < cooldownPeriod) {
          const remainingTime = Math.ceil(
            (cooldownPeriod - timeSinceLastSubmission) / (24 * 60 * 60 * 1000)
          );

          // Fetch the actual character data from the database
          const character = await db
            .select()
            .from(happinessCharacters)
            .where(eq(happinessCharacters.id, lastSubmission.characterId))
            .limit(1);

          console.log("🔍 Character fetch debug:", {
            characterId: lastSubmission.characterId,
            characterFound: character.length > 0,
            character: character[0] || null,
          });

          // Return canonical decision object for cooldown period
          return NextResponse.json({
            assigned: true,
            requiresAuth: true,
            canAccess: false,
            cooldown: true,
            cooldownRemaining: remainingTime,
            hasPreviousResult: true,
            previousResult: {
              ok: true,
              surveyId: surveyId,
              code: lastSubmission.code,
              character: character[0]
                ? {
                    id: character[0].id,
                    nameEn: character[0].nameEn,
                    nameAr: character[0].nameAr,
                    description: character[0].descriptionEn,
                    avatarUrl: character[0].avatarUrl,
                  }
                : null,
              categoryTotals:
                typeof lastSubmission.categoryTotals === "string"
                  ? JSON.parse(lastSubmission.categoryTotals)
                  : lastSubmission.categoryTotals,
            },
            message: `You must wait ${remainingTime} more day(s) before retaking this survey`,
            survey: {
              ...surveyData,
              accessMode,
            },
            accessMode,
          });
        }
      }
    }

    // If cooldown is 0 or expired, allow retake but show previous result
    if (recentResults.length > 0) {
      const lastSubmission = recentResults[0];

      // Fetch the actual character data from the database
      const character = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.id, lastSubmission.characterId))
        .limit(1);

      console.log("🔍 Character fetch debug (retake):", {
        characterId: lastSubmission.characterId,
        characterFound: character.length > 0,
        character: character[0] || null,
      });

      return NextResponse.json({
        assigned: true,
        requiresAuth: true,
        canAccess: true,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: true,
        previousResult: {
          ok: true,
          surveyId: surveyId,
          code: lastSubmission.code,
          character: character[0]
            ? {
                id: character[0].id,
                nameEn: character[0].nameEn,
                nameAr: character[0].nameAr,
                description: character[0].descriptionEn,
                avatarUrl: character[0].avatarUrl,
              }
            : null,
          categoryTotals:
            typeof lastSubmission.categoryTotals === "string"
              ? JSON.parse(lastSubmission.categoryTotals)
              : lastSubmission.categoryTotals,
        },
        message: "You can retake this survey",
        survey: {
          ...surveyData,
          accessMode,
        },
        accessMode,
      });
    }

    return NextResponse.json({
      assigned: true,
      requiresAuth: true,
      canAccess: true,
      cooldown: false,
      cooldownRemaining: 0,
      hasPreviousResult: false,
      message: "Access granted",
      survey: {
        ...surveyData,
        accessMode,
      },
      accessMode,
    });
  } catch (error) {
    console.error("Error checking survey access:", error);
    return NextResponse.json(
      { error: "Failed to check survey access" },
      { status: 500 }
    );
  }
}
