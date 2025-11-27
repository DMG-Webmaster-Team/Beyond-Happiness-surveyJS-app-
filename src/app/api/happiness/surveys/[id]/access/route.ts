import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessSurveys,
  happinessAssignments,
  happinessResults,
  happinessCharacters,
} from "@/db/schema/happiness";
import { surveys } from "@/db/schema/surveys";
import { eq, and, desc } from "drizzle-orm";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;

    console.log(
      `[happiness-access] 🔍 Starting access check for surveyId: ${surveyId}`
    );

    // Validate survey ID
    if (!surveyId || typeof surveyId !== "string" || surveyId.trim() === "") {
      console.log(`[happiness-access] ❌ Invalid survey ID`);
      return NextResponse.json({ error: "Invalid survey ID" }, { status: 400 });
    }

    // Get survey details first - check happiness_surveys table
    console.log(
      `[happiness-access] 📊 Looking up survey in happiness_surveys table...`
    );
    let survey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    let surveyData: any;
    let foundInTable = "happiness_surveys";

    // If not found in happiness_surveys, check surveys table as fallback
    if (survey.length === 0) {
      console.log(
        `[happiness-access] ⚠️ Survey ${surveyId} not found in happiness_surveys, checking surveys table...`
      );
      const regularSurvey = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, surveyId))
        .limit(1);

      if (regularSurvey.length === 0) {
        console.log(
          `[happiness-access] ❌ Survey ${surveyId} not found in either happiness_surveys or surveys table`
        );
        return NextResponse.json(
          { error: "Survey not found", accessMode: null },
          { status: 404 }
        );
      }

      // Found in surveys table - validate it's anonymous
      const regularSurveyData = regularSurvey[0];
      console.log(
        `[happiness-access] ✅ Survey found in surveys table: ${regularSurveyData.id} - "${regularSurveyData.title}"`
      );
      console.log(
        `[happiness-access] 📋 Raw isAnonymous value from DB:`,
        regularSurveyData.isAnonymous,
        `(type: ${typeof regularSurveyData.isAnonymous})`
      );

      // Handle MySQL boolean values (1/0) vs JavaScript boolean (true/false)
      const isAnonymous =
        regularSurveyData.isAnonymous === true ||
        (regularSurveyData.isAnonymous as any) === 1;

      console.log(
        `[happiness-access] 🔐 isAnonymous check result: ${isAnonymous} (${
          regularSurveyData.isAnonymous === true ? "true match" : ""
        } ${(regularSurveyData.isAnonymous as any) === 1 ? "1 match" : ""})`
      );

      if (!isAnonymous) {
        console.log(
          `[happiness-access] ❌ Survey ${surveyId} found in surveys table but is not anonymous - returning 404`
        );
        return NextResponse.json(
          { error: "Survey not found", accessMode: null },
          { status: 404 }
        );
      }

      // Map regular survey to happiness survey format
      surveyData = {
        id: regularSurveyData.id,
        title: regularSurveyData.title,
        anonymous: isAnonymous,
        accessMode: isAnonymous ? "anonymous" : "login",
        retakeCooldownDays: 0,
        companyId: regularSurveyData.companyId || null,
        companyName: regularSurveyData.companyName || null,
        isActive: regularSurveyData.isActive,
        isPublished: regularSurveyData.isPublished,
        createdAt: regularSurveyData.createdAt,
        updatedAt: regularSurveyData.updatedAt,
      };
      foundInTable = "surveys";
      console.log(
        `[happiness-access] ✅ Survey ${surveyId} found in surveys table (anonymous survey)`
      );
    } else {
      surveyData = survey[0];
      console.log(
        `[happiness-access] ✅ Survey ${surveyId} found in happiness_surveys table`
      );
    }

    // Fallback for missing accessMode column (before migration)
    const accessMode =
      surveyData.accessMode || (surveyData.anonymous ? "anonymous" : "login");

    console.log(
      `[happiness-access] 🔐 Access mode determined: ${accessMode} (from ${
        surveyData.accessMode ? "accessMode field" : "anonymous field"
      })`
    );

    // For anonymous and collect_info modes, always allow access (subject to cooldown if configured)
    if (accessMode === "anonymous" || accessMode === "collect_info") {
      console.log(
        `[happiness-access] 🎭 Anonymous/collect_info mode detected - allowing access`
      );
      // For anonymous and collect_info surveys, we could still enforce cooldown based on IP or other identifier
      // But for now, we'll allow unlimited access
      console.log(
        `[happiness-access] ✅ Returning success response for anonymous/collect_info survey`
      );
      const response = {
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
      };
      console.log(
        `[happiness-access] 📦 Response:`,
        JSON.stringify(response, null, 2)
      );
      return NextResponse.json(response);
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
          }
        } else {
        }
      } catch (error) {
        console.error("Error parsing session cookie:", error);
      }
    }

    // Log session debugging info

    if (!userId) {
      return NextResponse.json(
        {
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
        },
        { status: 401 }
      );
    }

    // Check if user is assigned to this survey (either directly or via company)

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

    // If no direct assignment, check if user's company matches survey's company
    if (assignment.length === 0 && surveyData.companyId) {
      // Import users schema
      const { users } = await import("@/db/schema/users");

      // Get user's company
      const user = await db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length > 0 && user[0].companyId === surveyData.companyId) {
        // Grant access via company membership
        // Continue to cooldown check below
      } else {
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

    console.log(
      `[happiness-access] ✅ Returning success response for authenticated survey`
    );
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
    console.error("[happiness-access] ❌ Error checking survey access:", error);
    console.error(
      "[happiness-access] ❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Failed to check survey access", accessMode: null },
      { status: 500 }
    );
  }
}
