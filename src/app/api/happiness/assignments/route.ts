import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { happinessAssignments, happinessSurveys, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - List happiness survey assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const userId = searchParams.get("userId");

    // Build the query with all operations in one chain to avoid type issues
    // TODO: Add filtering for surveyId and userId when Drizzle ORM type issues are resolved
    const assignments = await db
      .select({
        id: happinessAssignments.id,
        surveyId: happinessAssignments.surveyId,
        userId: happinessAssignments.userId,
        assignedBy: happinessAssignments.assignedBy,
        assignedAt: happinessAssignments.assignedAt,
        completedAt: happinessAssignments.completedAt,
        isActive: happinessAssignments.isActive,
        notes: happinessAssignments.notes,
        surveyTitle: happinessSurveys.title,
        userEmail: users.email,
        userName: users.name,
      })
      .from(happinessAssignments)
      .leftJoin(
        happinessSurveys,
        eq(happinessAssignments.surveyId, happinessSurveys.id)
      )
      .leftJoin(users, eq(happinessAssignments.userId, users.id))
      .orderBy(desc(happinessAssignments.assignedAt));

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error) {
    console.error("Error fetching happiness assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST - Create new happiness survey assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId, userIds, assignedBy, notes } = body;

    if (
      !surveyId ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Survey ID and user IDs are required" },
        { status: 400 }
      );
    }

    // Check if survey exists
    const survey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (survey.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Create assignments for all users
    const newAssignments = [];
    for (const userId of userIds) {
      // Check if assignment already exists
      const existingAssignment = await db
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

      if (existingAssignment.length === 0) {
        const assignment = await db
          .insert(happinessAssignments)
          .values({
            id: nanoid(),
            surveyId,
            userId,
            assignedBy: assignedBy || "admin",
            notes,
          })
          .returning();

        newAssignments.push(assignment[0]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${newAssignments.length} new assignments`,
      assignments: newAssignments,
    });
  } catch (error) {
    console.error("Error creating happiness assignments:", error);
    return NextResponse.json(
      { error: "Failed to create assignments" },
      { status: 500 }
    );
  }
}
