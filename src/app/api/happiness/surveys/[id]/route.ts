import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  happinessSurveys,
  happinessResults,
  happinessAssignments,
} from "@/db/schema/happiness";
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
    const {
      title,
      anonymous,
      retakeCooldownDays,
      companyId,
      companyName,
      isActive,
    } = body;

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
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (anonymous !== undefined) {
      updateData.anonymous = anonymous;
      // Force cooldown to 0 when survey becomes anonymous
      if (anonymous) {
        updateData.retakeCooldownDays = 0;
      }
    }
    // Only allow cooldown changes if the survey is not being set to anonymous
    if (retakeCooldownDays !== undefined && anonymous !== true) {
      updateData.retakeCooldownDays = retakeCooldownDays;
    }

    // Update company fields if provided
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (companyName !== undefined) updateData.companyName = companyName || null;

    // Update isActive field if provided
    if (isActive !== undefined) updateData.isActive = isActive;

    await db
      .update(happinessSurveys)
      .set(updateData)
      .where(eq(happinessSurveys.id, surveyId));

    // Fetch the updated survey
    const updatedSurvey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

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

// DELETE - Soft delete happiness survey (set isPublished = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id;

    console.log(`🗑️ Soft deleting happiness survey: ${surveyId}`);

    // Soft delete by setting isPublished = false
    await db
      .update(happinessSurveys)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(happinessSurveys.id, surveyId));

    // Fetch the updated survey to verify deletion
    const updatedSurvey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (updatedSurvey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    console.log(`✅ Successfully soft deleted happiness survey: ${surveyId}`);
    return NextResponse.json({
      success: true,
      message: "Survey deleted successfully (soft delete - can be restored)",
    });
  } catch (error) {
    console.error("Error deleting happiness survey:", error);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
