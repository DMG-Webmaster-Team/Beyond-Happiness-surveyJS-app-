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

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

// GET - List happiness results with filters (admin view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const userId = searchParams.get("userId");
    const userEmail = searchParams.get("userEmail");
    const companyId = searchParams.get("companyId");
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
    if (companyId) {
      whereConditions.push(eq(happinessSurveys.companyId, companyId));
    }
    if (startDate) {
      const startDateObj = new Date(startDate);
      whereConditions.push(gte(happinessResults.createdAt, startDateObj));
    }
    if (endDate) {
      const endDateObj = new Date(endDate + "T23:59:59");
      whereConditions.push(lte(happinessResults.createdAt, endDateObj));
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
        characterNameEn: happinessCharacters.nameEn,
        characterNameAr: happinessCharacters.nameAr,
        companyId: happinessSurveys.companyId,
        companyName: happinessSurveys.companyName,
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

    // Get total count for pagination
    const countQuery = db
      .select({ count: happinessResults.id })
      .from(happinessResults)
      .leftJoin(users, eq(happinessResults.userId, users.id))
      .leftJoin(
        happinessSurveys,
        eq(happinessResults.surveyId, happinessSurveys.id)
      );

    const totalResults =
      whereConditions.length > 0
        ? await countQuery.where(and(...whereConditions))
        : await countQuery;

    const total = totalResults.length;
    const totalPages = Math.ceil(total / limit);

    // JSON fields are already parsed in MySQL, handle both cases
    const parsedResults = results.map((result) => ({
      ...result,
      answers:
        typeof result.answers === "string"
          ? JSON.parse(result.answers)
          : result.answers,
      categoryTotals:
        typeof result.categoryTotals === "string"
          ? JSON.parse(result.categoryTotals)
          : result.categoryTotals,
    }));

    return NextResponse.json({
      success: true,
      results: parsedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: results.length === limit,
      },
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
    const { surveyId, answers, language, collectedUserData } = body;

    // Validation
    if (!surveyId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Missing required fields: surveyId, answers" },
        { status: 400 }
      );
    }

    // Validate language
    const selectedLanguage =
      language && ["en", "ar"].includes(language) ? language : "en";

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
    // Fallback for missing accessMode column (before migration)
    const accessMode =
      surveyData.accessMode || (surveyData.anonymous ? "anonymous" : "login");

    // Check authentication requirements based on access mode
    if (accessMode === "login" && !userId) {
      return NextResponse.json(
        { error: "User authentication required for this survey" },
        { status: 401 }
      );
    }

    // Check for duplicate submissions and cooldown (login mode only)
    if (accessMode === "login" && userId) {
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
          const cooldownPeriod = cooldownDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
          const lastSubmissionTime = new Date(
            lastSubmission.createdAt
          ).getTime();
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

            // Instead of rejecting, return the previous result for cooldown period
            // Use getMultilingualCharacter to get proper multilingual data
            const { getMultilingualCharacter } = await import(
              "@/lib/services/happiness-scoring"
            );
            const multilingualCharacter = await getMultilingualCharacter(
              lastSubmission.code,
              selectedLanguage as "en" | "ar"
            );

            return NextResponse.json({
              id: lastSubmission.id, // Include the database ID for PDF generation
              ok: true,
              surveyId,
              code: lastSubmission.code,
              character: multilingualCharacter,
              categoryTotals:
                typeof lastSubmission.categoryTotals === "string"
                  ? JSON.parse(lastSubmission.categoryTotals)
                  : lastSubmission.categoryTotals,
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
      answers as HappinessAnswer[],
      selectedLanguage as "en" | "ar"
    );

    // Store result
    const resultId = nanoid();

    // Prepare collected user data for collect_info mode
    let finalCollectedUserData = null;
    if (accessMode === "collect_info" && collectedUserData) {
      finalCollectedUserData = collectedUserData;
    }

    // Build insert values with explicit null for collectedUserData
    const insertValues: any = {
      id: resultId,
      surveyId,
      userId:
        accessMode === "anonymous" || accessMode === "collect_info"
          ? null
          : userId,
      answers: answers, // MySQL JSON column handles this automatically
      categoryTotals: scoreResult.categoryTotals, // MySQL JSON column handles this automatically
      essentialTotals: scoreResult.essentialTotals, // MySQL JSON column handles this automatically
      code: scoreResult.code,
      characterId: String(scoreResult.character.id), // Convert to string to match DB schema
      collectedUserData: finalCollectedUserData, // Explicitly set to null or data
      language: selectedLanguage,
    };

    await db.insert(happinessResults).values(insertValues);

    return NextResponse.json({
      id: resultId, // Include the database ID for PDF generation
      ok: true,
      surveyId,
      code: scoreResult.code,
      character: {
        id: scoreResult.character.id,
        nameEn: scoreResult.character.nameEn,
        nameAr: scoreResult.character.nameAr,
        description: scoreResult.character.description,
        detailedDescription: scoreResult.character.detailedDescription,
        avatarUrl: scoreResult.character.avatarUrl,
      },
      categoryTotals: scoreResult.categoryTotals,
      essentialTotals: scoreResult.essentialTotals,
    });
  } catch (error) {
    console.error("❌ Error submitting happiness results:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      fullError: error,
    });
    return NextResponse.json(
      {
        error: "Failed to submit results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
