import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessSurveys, happinessResults } from "@/db/schema/happiness";
import { desc, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - List happiness surveys with result counts
export async function GET() {
  try {
    const surveys = await db
      .select({
        id: happinessSurveys.id,
        title: happinessSurveys.title,
        anonymous: happinessSurveys.anonymous,
        retakeCooldownDays: happinessSurveys.retakeCooldownDays,
        companyId: happinessSurveys.companyId,
        companyName: happinessSurveys.companyName,
        isActive: happinessSurveys.isActive,
        isPublished: happinessSurveys.isPublished,
        createdAt: happinessSurveys.createdAt,
        updatedAt: happinessSurveys.updatedAt,
      })
      .from(happinessSurveys)
      .where(eq(happinessSurveys.isPublished, true)) // Only show published surveys
      .orderBy(desc(happinessSurveys.createdAt));

    // Get result counts for each survey
    const surveysWithCounts = await Promise.all(
      surveys.map(async (survey) => {
        const resultCount = await db
          .select({ count: count() })
          .from(happinessResults)
          .where(eq(happinessResults.surveyId, survey.id));

        return {
          ...survey,
          resultCount: resultCount[0]?.count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      surveys: surveysWithCounts,
    });
  } catch (error) {
    console.error("Error fetching happiness surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}

// POST - Create new happiness survey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, anonymous, retakeCooldownDays, companyId, companyName } =
      body;

    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const newSurvey = await db
      .insert(happinessSurveys)
      .values({
        id: nanoid(),
        title: title.trim(),
        anonymous: anonymous || false,
        // Force cooldown to 0 for anonymous surveys
        retakeCooldownDays: anonymous ? 0 : retakeCooldownDays || 0,
        companyId: companyId || null,
        companyName: companyName || null,
        isActive: true, // Default to active
        isPublished: true, // Default to published
      })
      .returning();

    return NextResponse.json({
      success: true,
      survey: {
        ...newSurvey[0],
        resultCount: 0,
      },
    });
  } catch (error) {
    console.error("Error creating happiness survey:", error);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}
