/**
 * Per-Survey Scoped Session Management
 *
 * This module implements survey-specific sessions to ensure:
 * 1. Each survey has its own isolated login session
 * 2. Sessions don't leak between different surveys
 * 3. Retake functionality preserves sessions appropriately
 * 4. Auto-cleanup of expired sessions
 */

export interface SurveySession {
  surveyId: string;
  userId: string;
  email: string;
  phone?: string;
  loginTime: string;
  expiryTime: string;
  retakeExpiryTime?: string; // For retake window
  surveyType: "regular" | "happiness";
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: SurveySession;
  reason?: string;
}

/**
 * Create a new survey session
 */
export function createSurveySession(
  surveyId: string,
  userData: {
    userId: string;
    email: string;
    phone?: string;
  },
  surveyType: "regular" | "happiness" = "regular",
  options: {
    sessionDurationMinutes?: number;
    retakeWindowMinutes?: number;
  } = {}
): SurveySession {
  const { sessionDurationMinutes = 30, retakeWindowMinutes = 60 } = options;

  const now = new Date();
  const expiryTime = new Date(
    now.getTime() + sessionDurationMinutes * 60 * 1000
  );
  const retakeExpiryTime = new Date(
    now.getTime() + retakeWindowMinutes * 60 * 1000
  );

  const session: SurveySession = {
    surveyId,
    userId: userData.userId,
    email: userData.email,
    phone: userData.phone,
    loginTime: now.toISOString(),
    expiryTime: expiryTime.toISOString(),
    retakeExpiryTime: retakeExpiryTime.toISOString(),
    surveyType,
  };

  // Store in sessionStorage
  const sessionKey = `survey_session_${surveyId}`;
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    // Also store current survey context for logout recovery
    sessionStorage.setItem("currentSurveyId", surveyId);
    sessionStorage.setItem("currentSurveyType", surveyType);

    console.log(`✅ Created survey session for ${surveyId}:`, {
      userId: userData.userId,
      email: userData.email,
      surveyType,
      expiresAt: expiryTime.toISOString(),
      retakeExpiresAt: retakeExpiryTime.toISOString(),
    });

    return session;
  } catch (error) {
    console.error("Error creating survey session:", error);
    throw new Error("Failed to create survey session");
  }
}

/**
 * Get survey session for a specific surveyId
 */
export function getSurveySession(surveyId: string): SurveySession | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionKey = `survey_session_${surveyId}`;
    const sessionData = sessionStorage.getItem(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session: SurveySession = JSON.parse(sessionData);
    return session;
  } catch (error) {
    console.error("Error getting survey session:", error);
    return null;
  }
}

/**
 * Validate survey session
 */
export function validateSurveySession(
  surveyId: string
): SessionValidationResult {
  const session = getSurveySession(surveyId);

  if (!session) {
    return {
      isValid: false,
      reason: "No session found for this survey",
    };
  }

  const now = new Date();
  const expiryTime = new Date(session.expiryTime);

  if (now > expiryTime) {
    // Session expired - clean it up
    clearSurveySession(surveyId);
    return {
      isValid: false,
      reason: "Session expired",
    };
  }

  return {
    isValid: true,
    session,
  };
}

/**
 * Check if user can retake survey (within retake window)
 */
export function canRetakeSurvey(surveyId: string): boolean {
  const session = getSurveySession(surveyId);

  if (!session || !session.retakeExpiryTime) {
    return false;
  }

  const now = new Date();
  const retakeExpiryTime = new Date(session.retakeExpiryTime);

  return now <= retakeExpiryTime;
}

/**
 * Extend session for retake
 */
export function extendSessionForRetake(
  surveyId: string,
  additionalMinutes: number = 30
): boolean {
  const session = getSurveySession(surveyId);

  if (!session) {
    return false;
  }

  const now = new Date();
  const newExpiryTime = new Date(now.getTime() + additionalMinutes * 60 * 1000);

  session.expiryTime = newExpiryTime.toISOString();

  try {
    const sessionKey = `survey_session_${surveyId}`;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log(
      `🔄 Extended session for survey ${surveyId} until:`,
      newExpiryTime.toISOString()
    );
    return true;
  } catch (error) {
    console.error("Error extending session:", error);
    return false;
  }
}

/**
 * Clear session for specific survey
 */
export function clearSurveySession(surveyId: string): void {
  if (typeof window === "undefined") return;

  try {
    const sessionKey = `survey_session_${surveyId}`;
    sessionStorage.removeItem(sessionKey);

    console.log(`🧹 Cleared session for survey: ${surveyId}`);
  } catch (error) {
    console.error("Error clearing survey session:", error);
  }
}

/**
 * Get all active survey sessions
 */
export function getAllActiveSurveySessions(): SurveySession[] {
  if (typeof window === "undefined") return [];

  const sessions: SurveySession[] = [];

  try {
    const keys = Object.keys(sessionStorage);

    keys.forEach((key) => {
      if (key.startsWith("survey_session_")) {
        const sessionData = sessionStorage.getItem(key);
        if (sessionData) {
          try {
            const session: SurveySession = JSON.parse(sessionData);
            const validation = validateSurveySession(session.surveyId);

            if (validation.isValid) {
              sessions.push(session);
            }
          } catch (error) {
            console.warn(`Invalid session data for key ${key}:`, error);
            sessionStorage.removeItem(key);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error getting all survey sessions:", error);
  }

  return sessions;
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(sessionStorage);
    let cleanedCount = 0;

    keys.forEach((key) => {
      if (key.startsWith("survey_session_")) {
        const sessionData = sessionStorage.getItem(key);
        if (sessionData) {
          try {
            const session: SurveySession = JSON.parse(sessionData);
            const now = new Date();
            const expiryTime = new Date(session.expiryTime);

            if (now > expiryTime) {
              sessionStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (error) {
            // Invalid session data - remove it
            sessionStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired survey sessions`);
    }
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
  }
}

/**
 * Check if user has access to specific survey
 */
export function hasAccessToSurvey(surveyId: string): boolean {
  const validation = validateSurveySession(surveyId);
  return validation.isValid;
}

/**
 * Get current survey context from session
 */
export function getCurrentSurveyContext(): {
  surveyId?: string;
  surveyType?: "regular" | "happiness";
} {
  if (typeof window === "undefined") return {};

  try {
    return {
      surveyId: sessionStorage.getItem("currentSurveyId") || undefined,
      surveyType:
        (sessionStorage.getItem("currentSurveyType") as
          | "regular"
          | "happiness") || undefined,
    };
  } catch (error) {
    console.error("Error getting current survey context:", error);
    return {};
  }
}

/**
 * Auto-cleanup setup (call this on app initialization)
 */
export function setupAutoCleanup(): void {
  if (typeof window === "undefined") return;

  // Clean up expired sessions every 5 minutes
  const cleanupInterval = setInterval(() => {
    cleanupExpiredSessions();
  }, 5 * 60 * 1000);

  // Clean up on page visibility change (when user returns to tab)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      cleanupExpiredSessions();
    }
  });

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(cleanupInterval);
  });

  console.log("🔄 Survey session auto-cleanup initialized");
}
