import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db/client";
import { users, userAssignments, surveys } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get("user_session");

    if (!userSession) {
      return NextResponse.json({ isAuthenticated: false });
    }

    try {
      // Verify the session data can be parsed
      const sessionData = JSON.parse(userSession.value);
      const loginTime = new Date(sessionData.loginTime).getTime();
      const sessionAge = Date.now() - loginTime;
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (sessionAge > thirtyMinutes) {
        // Session expired
        const response = NextResponse.json({ isAuthenticated: false });
        response.cookies.delete("user_session");
        return response;
      }

      // Load user from database to get current data
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionData.id))
        .limit(1);

      if (!userRows || userRows.length === 0) {
        // User no longer exists
        const response = NextResponse.json({ isAuthenticated: false });
        response.cookies.delete("user_session");
        return response;
      }

      const userData = userRows[0];

      // Load user's survey assignments
      const assignmentRows = await db
        .select({
          surveyId: userAssignments.surveyId,
          surveyTitle: surveys.title,
          status: userAssignments.status,
          dueAt: userAssignments.dueAt,
        })
        .from(userAssignments)
        .innerJoin(surveys, eq(userAssignments.surveyId, surveys.id))
        .where(eq(userAssignments.userId, userData.id));

      const assignments = assignmentRows.map((row) => ({
        surveyId: row.surveyId,
        surveyTitle: row.surveyTitle,
        status: row.status,
        dueAt: row.dueAt,
      }));

      const userWithAssignments = {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        assignments: assignments,
      };

      console.log("✅ Session check successful for user:", {
        id: userData.id,
        email: userData.email,
        assignmentsCount: assignments.length,
      });

      return NextResponse.json({
        isAuthenticated: true,
        user: userWithAssignments,
      });
    } catch (error) {
      console.error("Error parsing session or loading user data:", error);
      // Invalid session data
      const response = NextResponse.json({ isAuthenticated: false });
      response.cookies.delete("user_session");
      return response;
    }
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
