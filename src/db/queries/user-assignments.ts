import { eq, and } from "drizzle-orm";
import { db } from "../client";
import { userAssignments } from "../schema/user-assignments";

export async function updateAssignmentStatus(
  userId: string,
  surveyId: string,
  status: "pending" | "completed" | "overdue"
) {
  try {
    const result = await db
      .update(userAssignments)
      .set({ status })
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(userAssignments.surveyId, surveyId)
        )
      )
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating assignment status:", error);
    return null;
  }
}

export async function getAssignmentByUserAndSurvey(
  userId: string,
  surveyId: string
) {
  try {
    const result = await db
      .select()
      .from(userAssignments)
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(userAssignments.surveyId, surveyId)
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error getting assignment:", error);
    return null;
  }
}

export async function listAssignmentsBySurvey(surveyId: string) {
  try {
    const result = await db
      .select()
      .from(userAssignments)
      .where(eq(userAssignments.surveyId, surveyId));

    return result;
  } catch (error) {
    console.error("Error listing assignments by survey:", error);
    return [];
  }
}

export async function listAssignmentsByUser(userId: string) {
  try {
    const result = await db
      .select()
      .from(userAssignments)
      .where(eq(userAssignments.userId, userId));

    return result;
  } catch (error) {
    console.error("Error listing assignments by user:", error);
    return [];
  }
}
