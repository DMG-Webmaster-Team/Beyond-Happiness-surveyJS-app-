import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessResults,
  happinessSurveys,
  happinessCharacters,
} from "@/db/schema/happiness";
import { users } from "@/db/schema/users";
import { eq, and, desc, gte, lte, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  computeHappinessScore,
  HappinessAnswer,
} from "@/lib/services/happiness-scoring";

// GET - List happiness results with filters (admin view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const userId = searchParams.get("userId");
    const userEmail = searchParams.get("userEmail");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build the query with filtering
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (surveyId) {
      whereConditions.push(eq(happinessResults.surveyId, surveyId));
    }
    if (userId) {
      whereConditions.push(eq(happinessResults.userId, userId));
    }
    if (userEmail) {
      whereConditions.push(like(users.email, `%${userEmail}%`));
    }
    if (startDate) {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      whereConditions.push(gte(happinessResults.createdAt, startTimestamp));
    }
    if (endDate) {
      const endTimestamp = Math.floor(
        new Date(endDate + "T23:59:59").getTime() / 1000
      );
      whereConditions.push(lte(happinessResults.createdAt, endTimestamp));
    }

    // Build the query
    const baseQuery = db
      .select({
        id: happinessResults.id,
        surveyId: happinessResults.surveyId,
        userId: happinessResults.userId,
        userEmail: users.email,
        userName: users.name,
        answers: happinessResults.answers,
        categoryTotals: happinessResults.categoryTotals,
        code: happinessResults.code,
        characterId: happinessResults.characterId,
        createdAt: happinessResults.createdAt,
        surveyTitle: happinessSurveys.title,
        characterName: happinessCharacters.name,
      })
      .from(happinessResults)
      .leftJoin(
        happinessSurveys,
        eq(happinessResults.surveyId, happinessSurveys.id)
      )
      .leftJoin(
        happinessCharacters,
        eq(happinessResults.characterId, happinessCharacters.id)
      )
      .leftJoin(users, eq(happinessResults.userId, users.id));

    const results =
      whereConditions.length > 0
        ? await baseQuery
            .where(and(...whereConditions))
            .orderBy(desc(happinessResults.createdAt))
            .limit(limit)
            .offset(offset)
        : await baseQuery
            .orderBy(desc(happinessResults.createdAt))
            .limit(limit)
            .offset(offset);

    // Parse JSON fields
    const parsedResults = results.map((result) => ({
      ...result,
      answers: JSON.parse(result.answers),
      categoryTotals: JSON.parse(result.categoryTotals),
    }));

    return NextResponse.json({
      success: true,
      results: parsedResults,
      page,
      limit,
      hasMore: results.length === limit,
    });
  } catch (error) {
    console.error("Error fetching happiness results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// POST - Submit happiness survey results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId, answers } = body;

    // Validation
    if (!surveyId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Missing required fields: surveyId, answers" },
        { status: 400 }
      );
    }

    // Extract userId from session cookies
    let userId: string | null = null;
    const userSession = request.cookies.get("user_session");
    if (userSession) {
      try {
        const sessionData = JSON.parse(userSession.value);
        userId = sessionData.id;
      } catch (error) {
        console.error("Error parsing user session:", error);
        // Continue without userId for anonymous surveys
      }
    }

    // Validate answers format
    for (const answer of answers) {
      if (
        !answer.questionId ||
        !answer.valueIndex ||
        answer.valueIndex < 1 ||
        answer.valueIndex > 5
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid answer format. Each answer must have questionId and valueIndex (1-5)",
          },
          { status: 400 }
        );
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

    // Check authentication requirements
    if (!surveyData.anonymous && !userId) {
      return NextResponse.json(
        { error: "User authentication required for this survey" },
        { status: 401 }
      );
    }

    // Check for duplicate submissions and cooldown (non-anonymous surveys)
    if (!surveyData.anonymous && userId) {
      const existingResults = await db
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
        .orderBy(desc(happinessResults.createdAt));

      if (existingResults.length > 0) {
        // Check cooldown period (happiness surveys always allow retakes with cooldown)
        const cooldownDays = surveyData.retakeCooldownDays || 0;
        if (cooldownDays > 0) {
          const lastSubmission = existingResults[0];
          if (!lastSubmission.createdAt) {
            return NextResponse.json(
              { error: "Invalid submission data" },
              { status: 400 }
            );
          }
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

            console.log("🔍 Character fetch debug (results):", {
              characterId: lastSubmission.characterId,
              characterFound: character.length > 0,
              character: character[0] || null,
            });

            // Instead of rejecting, return the previous result for cooldown period
            return NextResponse.json({
              ok: true,
              surveyId,
              code: lastSubmission.code,
              character: character[0]
                ? {
                    id: character[0].id,
                    name: character[0].name,
                    description: character[0].description,
                    avatarUrl: character[0].avatarUrl,
                  }
                : {
                    id: lastSubmission.characterId,
                    name: "Your Previous Character",
                    description: "Your character from previous submission",
                    avatarUrl: `/characters/${lastSubmission.code}.png`,
                  },
              categoryTotals: JSON.parse(lastSubmission.categoryTotals),
              cooldown: true,
              cooldownRemaining: remainingTime,
              message: `You must wait ${remainingTime} more day(s) before retaking this survey. Here's your previous result:`,
            });
          }
        }
      }
    }

    // Compute happiness score
    const scoreResult = await computeHappinessScore(
      answers as HappinessAnswer[]
    );

    // Store result
    const newResult = await db
      .insert(happinessResults)
      .values({
        id: nanoid(),
        surveyId,
        userId: surveyData.anonymous ? null : userId,
        answers: JSON.stringify(answers),
        categoryTotals: JSON.stringify(scoreResult.categoryTotals),
        code: scoreResult.code,
        characterId: scoreResult.character.id,
      })
      .returning();

    return NextResponse.json({
      ok: true,
      surveyId,
      code: scoreResult.code,
      character: {
        id: scoreResult.character.id,
        name: scoreResult.character.name,
        description: scoreResult.character.description,
        avatarUrl: scoreResult.character.avatarUrl,
      },
      categoryTotals: scoreResult.categoryTotals,
    });
  } catch (error) {
    console.error("Error submitting happiness results:", error);
    return NextResponse.json(
      { error: "Failed to submit results" },
      { status: 500 }
    );
  }
}
