import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { happinessAssignments } from "@/db/schema/happiness";
import { eq } from "drizzle-orm";

// DELETE - Remove happiness survey assignment

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id;

    // Delete the assignment
    // Check if assignment exists first
    const existingAssignment = await db
      .select()
      .from(happinessAssignments)
      .where(eq(happinessAssignments.id, assignmentId))
      .limit(1);

    if (existingAssignment.length === 0) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Delete the assignment
    await db
      .delete(happinessAssignments)
      .where(eq(happinessAssignments.id, assignmentId));

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting happiness assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
