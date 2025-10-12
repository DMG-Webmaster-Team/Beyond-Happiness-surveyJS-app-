import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessSurveys, happinessResults } from "@/db/schema/happiness";
import { desc, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - List happiness surveys with result counts

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";
export async function GET() {
  try {
    const surveys = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.isPublished, true)) // Only show published surveys
      .orderBy(desc(happinessSurveys.createdAt));

    // Get result counts for each survey
    const surveysWithCounts = await Promise.all(
      surveys.map(async (survey: any) => {
        const resultCount = await db
          .select({ count: count() })
          .from(happinessResults)
          .where(eq(happinessResults.surveyId, survey.id));

        return {
          ...survey,
          accessMode:
            survey.accessMode || (survey.anonymous ? "anonymous" : "login"), // Fallback for missing column
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
    const {
      title,
      anonymous,
      accessMode,
      retakeCooldownDays,
      companyId,
      companyName,
    } = body;

    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate accessMode
    const validAccessModes = ["login", "anonymous", "collect_info"];
    const finalAccessMode = validAccessModes.includes(accessMode)
      ? accessMode
      : "login";

    const surveyId = nanoid();

    // Build insert values - handle missing accessMode column gracefully
    const insertValues: any = {
      id: surveyId,
      title: title.trim(),
      anonymous:
        anonymous ||
        finalAccessMode === "anonymous" ||
        finalAccessMode === "collect_info",
      // Force cooldown to 0 for anonymous and collect_info surveys
      retakeCooldownDays:
        finalAccessMode === "anonymous" || finalAccessMode === "collect_info"
          ? 0
          : retakeCooldownDays || 0,
      companyId: companyId || null,
      companyName: companyName || null,
      isActive: true, // Default to active
      isPublished: true, // Default to published
    };

    // Try to add accessMode if column exists (after migration)
    try {
      insertValues.accessMode = finalAccessMode;
    } catch (e) {
      console.log("accessMode column not yet available, using anonymous field");
    }

    await db.insert(happinessSurveys).values(insertValues);

    return NextResponse.json({
      success: true,
      survey: {
        id: surveyId,
        title: title.trim(),
        anonymous:
          finalAccessMode === "anonymous" || finalAccessMode === "collect_info",
        accessMode: finalAccessMode,
        retakeCooldownDays:
          finalAccessMode === "anonymous" || finalAccessMode === "collect_info"
            ? 0
            : retakeCooldownDays || 0,
        companyId: companyId || null,
        companyName: companyName || null,
        isActive: true,
        isPublished: true,
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
