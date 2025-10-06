import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../db/client";
import { results } from "../../../db/schema/results";
import { surveys } from "../../../db/schema/surveys";
import { happinessResults } from "../../../db/schema/happiness";
import { happinessSurveys } from "../../../db/schema/happiness";
import { users } from "../../../db/schema/users";
import { eq, and } from "drizzle-orm";
import { createApiError, ErrorCode } from "../../../utils/errors";


// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const surveyType = searchParams.get("surveyType") || "regular"; // "regular" or "happiness"

    if (!surveyId) {
      return NextResponse.json(
        createApiError(ErrorCode.VALIDATION_ERROR, "Survey ID is required"),
        { status: 400 }
      );
    }

    // Get user session from cookies
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json(
        createApiError(ErrorCode.UNAUTHORIZED, "No active session found"),
        { status: 401 }
      );
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch (error) {
      return NextResponse.json(
        createApiError(ErrorCode.INVALID_SESSION, "Invalid session data"),
        { status: 401 }
      );
    }

    const userId = sessionData.userId;
    if (!userId) {
      return NextResponse.json(
        createApiError(ErrorCode.UNAUTHORIZED, "User ID not found in session"),
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        createApiError(ErrorCode.USER_NOT_FOUND, "User not found"),
        { status: 404 }
      );
    }

    let hasSubmitted = false;
    let surveyTitle = "";
    let canTakeMultiple = false;

    if (surveyType === "happiness") {
      // Check happiness survey submission
      const happinessSubmission = await db
        .select({
          id: happinessResults.id,
          surveyTitle: happinessSurveys.title,
          retakeCooldownDays: happinessSurveys.retakeCooldownDays,
        })
        .from(happinessResults)
        .innerJoin(
          happinessSurveys,
          eq(happinessResults.surveyId, happinessSurveys.id)
        )
        .where(
          and(
            eq(happinessResults.surveyId, surveyId),
            eq(happinessResults.userId, userId)
          )
        )
        .limit(1);

      if (happinessSubmission.length > 0) {
        hasSubmitted = true;
        surveyTitle = happinessSubmission[0].surveyTitle;
        // Happiness surveys can be retaken based on cooldown period
        canTakeMultiple = (happinessSubmission[0].retakeCooldownDays || 0) > 0;
      } else {
        // Get survey info even if not submitted
        const surveyInfo = await db
          .select({
            title: happinessSurveys.title,
            retakeCooldownDays: happinessSurveys.retakeCooldownDays,
          })
          .from(happinessSurveys)
          .where(eq(happinessSurveys.id, surveyId))
          .limit(1);

        if (surveyInfo.length > 0) {
          surveyTitle = surveyInfo[0].title;
          // Happiness surveys can be retaken based on cooldown period
          canTakeMultiple = (surveyInfo[0].retakeCooldownDays || 0) > 0;
        }
      }
    } else {
      // Check regular survey submission
      const regularSubmission = await db
        .select({
          id: results.id,
          surveyTitle: surveys.title,
          canTakeMultiple: surveys.canTakeMultiple,
        })
        .from(results)
        .innerJoin(surveys, eq(results.surveyId, surveys.id))
        .where(and(eq(results.surveyId, surveyId), eq(results.userId, userId)))
        .limit(1);

      if (regularSubmission.length > 0) {
        hasSubmitted = true;
        surveyTitle = regularSubmission[0].surveyTitle;
        canTakeMultiple = Boolean(regularSubmission[0].canTakeMultiple);
      } else {
        // Get survey info even if not submitted
        const surveyInfo = await db
          .select({
            title: surveys.title,
            canTakeMultiple: surveys.canTakeMultiple,
          })
          .from(surveys)
          .where(eq(surveys.id, surveyId))
          .limit(1);

        if (surveyInfo.length > 0) {
          surveyTitle = surveyInfo[0].title;
          canTakeMultiple = Boolean(surveyInfo[0].canTakeMultiple);
        }
      }
    }

    return NextResponse.json({
      submitted: hasSubmitted,
      canTakeMultiple,
      surveyTitle,
      message: hasSubmitted
        ? canTakeMultiple
          ? "You have already submitted this survey, but you can take it again."
          : "This survey can only be completed once."
        : "Survey not yet submitted.",
    });
  } catch (error) {
    console.error("Survey status check error:", error);
    return NextResponse.json(
      createApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to check survey status"
      ),
      { status: 500 }
    );
  }
}
