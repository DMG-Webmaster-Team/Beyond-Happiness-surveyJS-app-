import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessSurveys,
  happinessResults,
  happinessAssignments,
  happinessCharacters,
} from "@/db/schema/happiness";
import { eq, desc, and } from "drizzle-orm";

// GET - Check if user can access survey (assignment and cooldown check)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // Fallback: infer user from session cookie if userId not provided
    if (!userId) {
      const sessionCookie = request.cookies.get("user_session");
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          if (sessionData && sessionData.id) {
            userId = sessionData.id;
          }
        } catch (e) {
          // ignore parse errors, handled by requiresAuth check below
        }
      }
    }

    // Get survey details
    const survey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (survey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const surveyData = survey[0];

    // For anonymous surveys, always allow access
    if (surveyData.anonymous) {
      return NextResponse.json({
        canAccess: true,
        message: "Access granted",
        survey: surveyData,
      });
    }

    // For non-anonymous surveys, require userId parameter
    if (!userId) {
      return NextResponse.json({
        canAccess: false,
        requiresAuth: true,
        message: "Authentication required for this survey",
        survey: surveyData,
      });
    }

    // Check if user is assigned to this survey
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

    if (assignment.length === 0) {
      return NextResponse.json({
        canAccess: false,
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
        canAccess: true,
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

          // Return previous result data for cooldown period with actual character data
          return NextResponse.json({
            canAccess: false,
            message: `You must wait ${remainingTime} more day(s) before retaking this survey`,
            cooldownRemaining: remainingTime,
            survey: surveyData,
            hasPreviousResult: true,
            previousResult: {
              id: lastSubmission.id,
              code: lastSubmission.code,
              categoryTotals: JSON.parse(lastSubmission.categoryTotals),
              characterId: lastSubmission.characterId,
              character: character[0]
                ? {
                    id: character[0].id,
                    name: character[0].name,
                    description: character[0].description,
                    avatarUrl: character[0].avatarUrl,
                  }
                : null,
            },
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
        canAccess: true,
        message: "You can retake this survey. Here's your previous result:",
        survey: surveyData,
        hasPreviousResult: true,
        canRetake: true,
        previousResult: {
          id: lastSubmission.id,
          code: lastSubmission.code,
          categoryTotals: JSON.parse(lastSubmission.categoryTotals),
          characterId: lastSubmission.characterId,
          character: character[0]
            ? {
                id: character[0].id,
                name: character[0].name,
                description: character[0].description,
                avatarUrl: character[0].avatarUrl,
              }
            : null,
        },
      });
    }

    return NextResponse.json({
      canAccess: true,
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
