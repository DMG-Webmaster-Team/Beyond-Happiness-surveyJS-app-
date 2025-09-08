import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessSurveys,
  happinessAssignments,
  happinessResults,
  happinessCharacters,
} from "@/db/schema/happiness";
import { eq, and, desc } from "drizzle-orm";

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

    // For anonymous surveys, always allow access (subject to cooldown if configured)
    if (surveyData.anonymous) {
      // For anonymous surveys, we could still enforce cooldown based on IP or other identifier
      // But for now, we'll allow unlimited access to anonymous surveys
      return NextResponse.json({
        assigned: true,
        requiresAuth: false,
        canAccess: true,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message: "Access granted to anonymous survey",
        survey: surveyData,
      });
    }

    // For non-anonymous surveys, get userId from session cookie
    const userSession = request.cookies.get("user_session");
    let userId: string | null = null;

    if (userSession) {
      try {
        const sessionData = JSON.parse(userSession.value);

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
        survey: surveyData,
      });
    }

    // Check if user is assigned to this survey
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

    if (assignment.length === 0) {
      console.log("❌ User not assigned to happiness survey:", {
        surveyId,
        userId,
        message: "No active assignment found in happiness_assignments table",
      });

      return NextResponse.json({
        assigned: false,
        requiresAuth: false, // User is authenticated, but not assigned
        canAccess: false,
        cooldown: false,
        cooldownRemaining: 0,
        hasPreviousResult: false,
        message: "You are not assigned to this survey",
        survey: surveyData,
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
        survey: surveyData,
      });
    }

    // Check cooldown
    const cooldownDays = surveyData.retakeCooldownDays || 0;
    if (cooldownDays > 0) {
      const lastSubmission = recentResults[0];
      if (lastSubmission.createdAt) {
        const cooldownPeriod = cooldownDays * 24 * 60 * 60; // Convert days to seconds
        const timeSinceLastSubmission =
          Date.now() / 1000 - lastSubmission.createdAt;

        if (timeSinceLastSubmission < cooldownPeriod) {
          const remainingTime = Math.ceil(
            (cooldownPeriod - timeSinceLastSubmission) / (24 * 60 * 60)
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
                    name: character[0].name,
                    description: character[0].description,
                    avatarUrl: character[0].avatarUrl,
                  }
                : null,
              categoryTotals: JSON.parse(lastSubmission.categoryTotals),
            },
            message: `You must wait ${remainingTime} more day(s) before retaking this survey`,
            survey: surveyData,
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
                name: character[0].name,
                description: character[0].description,
                avatarUrl: character[0].avatarUrl,
              }
            : null,
          categoryTotals: JSON.parse(lastSubmission.categoryTotals),
        },
        message: "You can retake this survey",
        survey: surveyData,
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
      survey: surveyData,
    });
  } catch (error) {
    console.error("Error checking survey access:", error);
    return NextResponse.json(
      { error: "Failed to check survey access" },
      { status: 500 }
    );
  }
}
