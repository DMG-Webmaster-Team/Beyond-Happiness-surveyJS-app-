import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessQuestions } from "@/db/schema/happiness";
import { eq } from "drizzle-orm";

// PUT - Update happiness question

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = parseInt(id);
    if (isNaN(questionId)) {
      return NextResponse.json(
        { error: "Invalid question ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      text,
      category,
      categoryValues,
      essentialId,
      essentialValues,
      isActive,
    } = body;

    // Validation
    if (
      categoryValues &&
      (!Array.isArray(categoryValues) || categoryValues.length !== 5)
    ) {
      return NextResponse.json(
        { error: "Category values must be an array of exactly 5 integers" },
        { status: 400 }
      );
    }

    if (
      essentialValues &&
      (!Array.isArray(essentialValues) || essentialValues.length !== 5)
    ) {
      return NextResponse.json(
        { error: "Essential values must be an array of exactly 5 integers" },
        { status: 400 }
      );
    }

    if (category) {
      const validCategories = [
        "Meaning",
        "Delight",
        "Freedom",
        "Engagement",
        "Vitality",
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: any = {};

    // Note: updatedAt is handled automatically by the database schema with onUpdateNow()

    if (text !== undefined) updateData.text = text;
    if (category !== undefined) updateData.category = category;
    if (categoryValues !== undefined)
      updateData.categoryValues = categoryValues; // MySQL JSON column handles this
    if (essentialId !== undefined) updateData.essentialId = essentialId || null;
    if (essentialValues !== undefined)
      updateData.essentialValues = essentialValues || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the question (MySQL doesn't support .returning())
    await db
      .update(happinessQuestions)
      .set(updateData)
      .where(eq(happinessQuestions.id, questionId));

    // Fetch the updated question
    const updatedQuestion = await db
      .select()
      .from(happinessQuestions)
      .where(eq(happinessQuestions.id, questionId))
      .limit(1);

    if (updatedQuestion.length === 0) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      question: {
        ...updatedQuestion[0],
        categoryValues: Array.isArray(updatedQuestion[0].categoryValues)
          ? updatedQuestion[0].categoryValues
          : (JSON.parse(
              updatedQuestion[0].categoryValues as string
            ) as number[]),
        essentialValues: updatedQuestion[0].essentialValues
          ? Array.isArray(updatedQuestion[0].essentialValues)
            ? updatedQuestion[0].essentialValues
            : (JSON.parse(
                updatedQuestion[0].essentialValues as string
              ) as number[])
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating happiness question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE - Delete happiness question (hard delete for inactive questions only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = parseInt(id);
    if (isNaN(questionId)) {
      return NextResponse.json(
        { error: "Invalid question ID" },
        { status: 400 }
      );
    }

    // Check if question exists
    const existing = await db
      .select()
      .from(happinessQuestions)
      .where(eq(happinessQuestions.id, questionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const question = existing[0];

    // Only allow hard delete for inactive questions
    if (question.isActive) {
      return NextResponse.json(
        {
          error:
            "Cannot delete active questions. Please deactivate the question first.",
        },
        { status: 400 }
      );
    }

    // Hard delete the inactive question
    await db
      .delete(happinessQuestions)
      .where(eq(happinessQuestions.id, questionId));

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting happiness question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
