import { eq, and, desc, lt } from "drizzle-orm";
import { db } from "../client";
import {
  userSurveySessions,
  type UserSurveySession,
  type NewUserSurveySession,
} from "../schema/user-survey-sessions";
import { surveys } from "../schema/surveys";
import { z } from "zod";

// Validation schemas
export const createSessionSchema = z.object({
  userId: z.string(),
  surveyId: z.string(),
  surveyConfig: z.string(), // JSON string
  surveyTitle: z.string(),
  surveyDescription: z.string().optional(),
  canTakeMultiple: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  expiresAt: z.number().optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["active", "completed", "expired", "abandoned"]).optional(),
  progress: z.string().optional(), // JSON string
  completedAt: z.number().optional(),
});

// Session configuration
const SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours
const SESSION_CLEANUP_DAYS = 7; // Clean up expired sessions after 7 days

/**
 * Create a new survey session with current survey configuration
 */
export async function createSurveySession(
  userId: string,
  surveyId: string
): Promise<UserSurveySession> {
  // First, get the current survey configuration
  const survey = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .limit(1);

  if (survey.length === 0) {
    throw new Error(`Survey with ID ${surveyId} not found`);
  }

  const surveyData = survey[0];
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Check if user already has an active session for this survey
  const existingSession = await getActiveSession(userId, surveyId);
  if (existingSession) {
    // Update the existing session with fresh config and extend expiry
    await db
      .update(userSurveySessions)
      .set({
        surveyConfig:
          typeof surveyData.definition === "string"
            ? surveyData.definition
            : JSON.stringify(surveyData.definition),
        surveyTitle: surveyData.title,
        surveyDescription: surveyData.description,
        canTakeMultiple: Boolean(surveyData.canTakeMultiple),
        isAnonymous: Boolean(surveyData.isAnonymous),
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userSurveySessions.id, existingSession.id));
    const updatedSession = await getActiveSession(userId, surveyId);
    if (!updatedSession) {
      throw new Error("Failed to retrieve updated session");
    }
    return updatedSession;
  }

  // Create new session
  const sessionId = require("nanoid").nanoid();
  await db.insert(userSurveySessions).values({
    id: sessionId,
    userId,
    surveyId,
    surveyConfig:
      typeof surveyData.definition === "string"
        ? surveyData.definition
        : JSON.stringify(surveyData.definition),
    surveyTitle: surveyData.title,
    surveyDescription: surveyData.description,
    canTakeMultiple: Boolean(surveyData.canTakeMultiple),
    isAnonymous: Boolean(surveyData.isAnonymous),
    status: "active",
    expiresAt,
  });

  const newSession = await getActiveSession(userId, surveyId);
  if (!newSession) {
    throw new Error("Failed to retrieve created session");
  }
  return newSession;
}

/**
 * Get active session for a user and survey
 */
export async function getActiveSession(
  userId: string,
  surveyId: string
): Promise<UserSurveySession | null> {
  const sessions = await db
    .select()
    .from(userSurveySessions)
    .where(
      and(
        eq(userSurveySessions.userId, userId),
        eq(userSurveySessions.surveyId, surveyId),
        eq(userSurveySessions.status, "active")
      )
    )
    .orderBy(desc(userSurveySessions.createdAt))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];

  // Check if session has expired
  if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
    // Mark as expired
    await updateSessionStatus(session.id, "expired");
    return null;
  }

  return session;
}

/**
 * Get session by ID
 */
export async function getSessionById(
  sessionId: string
): Promise<UserSurveySession | null> {
  const sessions = await db
    .select()
    .from(userSurveySessions)
    .where(eq(userSurveySessions.id, sessionId))
    .limit(1);

  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Update session progress
 */
export async function updateSessionProgress(
  sessionId: string,
  progress: any
): Promise<UserSurveySession | null> {
  await db
    .update(userSurveySessions)
    .set({
      progress: JSON.stringify(progress),
      updatedAt: new Date(),
    })
    .where(eq(userSurveySessions.id, sessionId));

  // Fetch the updated session
  const updatedSession = await db
    .select()
    .from(userSurveySessions)
    .where(eq(userSurveySessions.id, sessionId))
    .limit(1);
  return updatedSession.length > 0 ? updatedSession[0] : null;
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: "active" | "completed" | "expired" | "abandoned",
  completedAt?: Date
): Promise<UserSurveySession | null> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "completed" && completedAt) {
    updateData.completedAt = completedAt;
  }

  await db
    .update(userSurveySessions)
    .set(updateData)
    .where(eq(userSurveySessions.id, sessionId));

  // Fetch the updated session
  const updatedSession = await db
    .select()
    .from(userSurveySessions)
    .where(eq(userSurveySessions.id, sessionId))
    .limit(1);
  return updatedSession.length > 0 ? updatedSession[0] : null;
}

/**
 * Complete a survey session
 */
export async function completeSession(
  sessionId: string
): Promise<UserSurveySession | null> {
  return updateSessionStatus(sessionId, "completed", new Date());
}

/**
 * Abandon a survey session
 */
export async function abandonSession(
  sessionId: string
): Promise<UserSurveySession | null> {
  return updateSessionStatus(sessionId, "abandoned");
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string
): Promise<UserSurveySession[]> {
  return db
    .select()
    .from(userSurveySessions)
    .where(eq(userSurveySessions.userId, userId))
    .orderBy(desc(userSurveySessions.createdAt));
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const cleanupThreshold = new Date(
    Date.now() - SESSION_CLEANUP_DAYS * 24 * 60 * 60 * 1000
  );

  const deletedSessions = await db
    .delete(userSurveySessions)
    .where(
      and(
        eq(userSurveySessions.status, "expired"),
        lt(userSurveySessions.updatedAt, cleanupThreshold)
      )
    );

  return (deletedSessions as any).affectedRows || 0;
}

/**
 * Get session statistics
 */
export async function getSessionStats(): Promise<{
  active: number;
  completed: number;
  expired: number;
  abandoned: number;
  total: number;
}> {
  const allSessions = await db.select().from(userSurveySessions);

  const stats = {
    active: 0,
    completed: 0,
    expired: 0,
    abandoned: 0,
    total: allSessions.length,
  };

  allSessions.forEach((session) => {
    stats[session.status as keyof typeof stats]++;
  });

  return stats;
}
