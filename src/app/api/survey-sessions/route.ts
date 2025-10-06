import { NextRequest, NextResponse } from "next/server";
import {
  createSurveySession,
  getActiveSession,
  updateSessionProgress,
  completeSession,
  abandonSession,
  getUserSessions,
} from "@/db/queries/user-survey-sessions";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

// GET - Get active session or user sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const surveyId = searchParams.get("surveyId");
    const action = searchParams.get("action"); // "active" or "all"

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (action === "all") {
      // Get all sessions for user
      const sessions = await getUserSessions(userId);
      return NextResponse.json({
        success: true,
        sessions,
      });
    }

    if (!surveyId) {
      return NextResponse.json(
        { error: "surveyId is required for active session lookup" },
        { status: 400 }
      );
    }

    // Get active session for user and survey
    const session = await getActiveSession(userId, surveyId);

    return NextResponse.json({
      success: true,
      session,
      hasActiveSession: !!session,
    });
  } catch (error) {
    console.error("Error getting survey session:", error);
    return NextResponse.json(
      { error: "Failed to get survey session" },
      { status: 500 }
    );
  }
}

// POST - Create new session or update existing session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, surveyId, sessionId, progress } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "create":
        if (!surveyId) {
          return NextResponse.json(
            { error: "surveyId is required for session creation" },
            { status: 400 }
          );
        }

        const session = await createSurveySession(userId, surveyId);
        return NextResponse.json({
          success: true,
          session,
          message: "Survey session created successfully",
        });

      case "update-progress":
        if (!sessionId || !progress) {
          return NextResponse.json(
            { error: "sessionId and progress are required" },
            { status: 400 }
          );
        }

        const updatedSession = await updateSessionProgress(sessionId, progress);
        return NextResponse.json({
          success: true,
          session: updatedSession,
          message: "Session progress updated",
        });

      case "complete":
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId is required" },
            { status: 400 }
          );
        }

        const completedSession = await completeSession(sessionId);
        return NextResponse.json({
          success: true,
          session: completedSession,
          message: "Session completed successfully",
        });

      case "abandon":
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId is required" },
            { status: 400 }
          );
        }

        const abandonedSession = await abandonSession(sessionId);
        return NextResponse.json({
          success: true,
          session: abandonedSession,
          message: "Session abandoned",
        });

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Must be: create, update-progress, complete, or abandon",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing survey session:", error);
    return NextResponse.json(
      { error: "Failed to manage survey session" },
      { status: 500 }
    );
  }
}
