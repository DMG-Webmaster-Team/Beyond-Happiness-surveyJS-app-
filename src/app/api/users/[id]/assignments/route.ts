import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../db/client";
import { userAssignments } from "../../../../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { surveyIds } = await request.json();

    if (!Array.isArray(surveyIds)) {
      return NextResponse.json(
        { error: "surveyIds must be an array" },
        { status: 400 }
      );
    }

    // Get current assignments for this user
    const currentAssignments = await db
      .select()
      .from(userAssignments)
      .where(eq(userAssignments.userId, id));

    const currentSurveyIds = currentAssignments.map((a) => a.surveyId);

    // Find surveys to add (new assignments)
    const surveysToAdd = surveyIds.filter(
      (surveyId) => !currentSurveyIds.includes(surveyId)
    );

    // Find surveys to remove (existing assignments to delete)
    const surveysToRemove = currentSurveyIds.filter(
      (surveyId) => !surveyIds.includes(surveyId)
    );

    // Remove assignments for surveys that are no longer selected
    if (surveysToRemove.length > 0) {
      await db
        .delete(userAssignments)
        .where(
          and(
            eq(userAssignments.userId, id),
            inArray(userAssignments.surveyId, surveysToRemove)
          )
        );
    }

    // Add new assignments
    if (surveysToAdd.length > 0) {
      const newAssignments = surveysToAdd.map((surveyId) => ({
        userId: id,
        surveyId,
        assignedAt: Date.now(),
        status: "pending",
      }));

      await db.insert(userAssignments).values(newAssignments);
    }

    return NextResponse.json({
      success: true,
      message: "Survey assignments updated successfully",
      added: surveysToAdd.length,
      removed: surveysToRemove.length,
    });
  } catch (error) {
    console.error("Error updating user assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const assignments = await db
      .select()
      .from(userAssignments)
      .where(eq(userAssignments.userId, id));

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
