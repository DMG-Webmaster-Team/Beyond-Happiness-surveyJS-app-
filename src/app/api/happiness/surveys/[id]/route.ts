import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessSurveys, happinessResults } from "@/db/schema/happiness";
import { eq, count } from "drizzle-orm";

// GET - Get single happiness survey
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;

    const survey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (survey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Get result count
    const resultCount = await db
      .select({ count: count() })
      .from(happinessResults)
      .where(eq(happinessResults.surveyId, surveyId));

    return NextResponse.json({
      success: true,
      survey: {
        ...survey[0],
        resultCount: resultCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching happiness survey:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey" },
      { status: 500 }
    );
  }
}

// PUT - Update happiness survey
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;
    const body = await request.json();
    const { title, anonymous, retakeCooldownDays } = body;

    // Validation
    if (
      title !== undefined &&
      (typeof title !== "string" || title.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Title must be a non-empty string" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (anonymous !== undefined) updateData.anonymous = anonymous;
    if (retakeCooldownDays !== undefined)
      updateData.retakeCooldownDays = retakeCooldownDays;

    const updatedSurvey = await db
      .update(happinessSurveys)
      .set(updateData)
      .where(eq(happinessSurveys.id, surveyId))
      .returning();

    if (updatedSurvey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Get result count
    const resultCount = await db
      .select({ count: count() })
      .from(happinessResults)
      .where(eq(happinessResults.surveyId, surveyId));

    return NextResponse.json({
      success: true,
      survey: {
        ...updatedSurvey[0],
        resultCount: resultCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error updating happiness survey:", error);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

// DELETE - Delete happiness survey (only if no results)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;

    // Delete all related results first
    await db
      .delete(happinessResults)
      .where(eq(happinessResults.surveyId, surveyId));

    // Delete the survey
    const deletedSurvey = await db
      .delete(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .returning();

    if (deletedSurvey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Survey deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting happiness survey:", error);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
