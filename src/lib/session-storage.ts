/**
 * Session Storage Utilities for Survey State Management
 *
 * This module provides sessionStorage-based state management for surveys
 * to ensure proper isolation between user sessions and prevent state
 * carryover between different users on the same browser/device.
 */

export interface SurveySessionState {
  hasSubmitted: boolean;
  submissionTime?: number;
  canRetake?: boolean;
  canTakeMultiple?: boolean;
  retakeExpiryTime?: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Generate a scoped key for sessionStorage
 */
function getScopedKey(surveyId: string, key: string): string {
  return `survey:${surveyId}:${key}`;
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return false;
    }
    // Test if we can actually use it
    const testKey = "__sessionStorageTest__";
    window.sessionStorage.setItem(testKey, "test");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set survey submission state in sessionStorage
 */
export function setSurveySubmitted(
  surveyId: string,
  submitted: boolean = true,
  options: {
    userId?: string;
    sessionId?: string;
    canRetake?: boolean;
    canTakeMultiple?: boolean;
    retakeExpiryMinutes?: number;
  } = {}
): void {
  if (!isSessionStorageAvailable()) {
    console.warn("sessionStorage not available, falling back to memory");
    return;
  }

  try {
    const key = getScopedKey(surveyId, "hasSubmitted");
    const now = Date.now();
    const retakeExpiryTime = options.retakeExpiryMinutes
      ? now + options.retakeExpiryMinutes * 60 * 1000
      : undefined;

    const state: SurveySessionState = {
      hasSubmitted: submitted,
      submissionTime: submitted ? now : undefined,
      canRetake: options.canRetake,
      canTakeMultiple: options.canTakeMultiple,
      retakeExpiryTime,
      userId: options.userId,
      sessionId: options.sessionId,
    };

    sessionStorage.setItem(key, JSON.stringify(state));
    console.log(`📝 Set survey submission state for ${surveyId}:`, state);

    // Also store in localStorage for cross-tab/refresh persistence
    if (submitted) {
      const localStorageKey = `submitted_${surveyId}`;
      const localStorageData = {
        timestamp: now,
        surveyId,
        canTakeMultiple: options.canTakeMultiple,
        retakeExpiryTime,
      };
      localStorage.setItem(localStorageKey, JSON.stringify(localStorageData));
      console.log(`💾 Also stored submission in localStorage for ${surveyId}`);
    }
  } catch (error) {
    console.error("Error setting survey submission state:", error);
  }
}

/**
 * Get survey submission state from sessionStorage
 */
export function getSurveySubmissionState(
  surveyId: string
): SurveySessionState | null {
  if (!isSessionStorageAvailable()) {
    return null;
  }

  try {
    const key = getScopedKey(surveyId, "hasSubmitted");
    const data = sessionStorage.getItem(key);

    if (!data) {
      return null;
    }

    const state: SurveySessionState = JSON.parse(data);
    console.log(`📖 Retrieved survey submission state for ${surveyId}:`, state);
    return state;
  } catch (error) {
    console.error("Error getting survey submission state:", error);
    return null;
  }
}

/**
 * Check if survey has been submitted in current session
 */
export function hasSurveyBeenSubmitted(surveyId: string): boolean {
  const state = getSurveySubmissionState(surveyId);
  return state?.hasSubmitted ?? false;
}

/**
 * Comprehensive submission check with fallback logic
 * Returns detailed information about submission status and source
 */
export function checkSurveySubmissionStatus(
  surveyId: string,
  isAnonymous: boolean = false,
  surveyCanTakeMultiple: boolean = true
): {
  isSubmitted: boolean;
  canRetake: boolean;
  source: "sessionStorage" | "localStorage" | "none";
  reason?: string;
} {
  console.log(`🔍 Checking submission status for survey ${surveyId}:`, {
    isAnonymous,
    surveyCanTakeMultiple,
  });

  // First check sessionStorage (current session)
  const sessionState = getSurveySubmissionState(surveyId);
  if (sessionState?.hasSubmitted) {
    const canRetake = canRetakeSurveyInSession(surveyId, surveyCanTakeMultiple);
    console.log(`📱 Found sessionStorage submission for ${surveyId}:`, {
      canRetake,
      canTakeMultiple: sessionState.canTakeMultiple,
      retakeExpiryTime: sessionState.retakeExpiryTime,
    });

    return {
      isSubmitted: true,
      canRetake,
      source: "sessionStorage",
      reason: canRetake
        ? "Can retake within session"
        : "Single submission completed in session",
    };
  }

  // Fallback to localStorage (cross-tab/refresh persistence)
  try {
    const localStorageKey = `submitted_${surveyId}`;
    const localData = localStorage.getItem(localStorageKey);

    if (localData) {
      const parsed = JSON.parse(localData);
      const now = Date.now();

      // For anonymous surveys, use shorter window (30 seconds)
      // For authenticated surveys, use longer window (15 minutes)
      const timeWindow = isAnonymous ? 30 * 1000 : 15 * 60 * 1000;
      const isWithinWindow = now - parsed.timestamp <= timeWindow;

      if (isWithinWindow) {
        const storedCanTakeMultiple =
          parsed.canTakeMultiple ?? surveyCanTakeMultiple;
        const canRetake =
          storedCanTakeMultiple ||
          (parsed.retakeExpiryTime && now <= parsed.retakeExpiryTime);

        console.log(`💾 Found localStorage submission for ${surveyId}:`, {
          timestamp: parsed.timestamp,
          timeWindow,
          isWithinWindow,
          canRetake,
          storedCanTakeMultiple,
        });

        return {
          isSubmitted: true,
          canRetake,
          source: "localStorage",
          reason: canRetake
            ? "Can retake from localStorage"
            : "Single submission found in localStorage",
        };
      } else {
        console.log(
          `⏰ localStorage submission for ${surveyId} expired (${
            now - parsed.timestamp
          }ms ago)`
        );
        // Clean up expired entry
        localStorage.removeItem(localStorageKey);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error reading localStorage for ${surveyId}:`, error);
  }

  console.log(`✅ No submission found for ${surveyId} - survey can be taken`);
  return {
    isSubmitted: false,
    canRetake: true,
    source: "none",
    reason: "No previous submission found",
  };
}

/**
 * Check if survey can be retaken based on session state
 */
export function canRetakeSurveyInSession(
  surveyId: string,
  surveyCanTakeMultiple: boolean
): boolean {
  const state = getSurveySubmissionState(surveyId);

  if (!state?.hasSubmitted) {
    return true; // Not submitted yet
  }

  // If survey allows multiple submissions, always allow retake
  if (surveyCanTakeMultiple || state.canTakeMultiple) {
    return true;
  }

  // For single-submission surveys, check retake expiry
  if (state.retakeExpiryTime) {
    const now = Date.now();
    if (now <= state.retakeExpiryTime) {
      return state.canRetake ?? false;
    }
  }

  return false;
}

/**
 * Clear survey submission state for a specific survey
 */
export function clearSurveySubmissionState(surveyId: string): void {
  // Clear sessionStorage
  if (isSessionStorageAvailable()) {
    try {
      const key = getScopedKey(surveyId, "hasSubmitted");
      sessionStorage.removeItem(key);
      console.log(`🧹 Cleared sessionStorage submission state for ${surveyId}`);
    } catch (error) {
      console.error("Error clearing sessionStorage submission state:", error);
    }
  }

  // Also clear localStorage
  try {
    const localStorageKey = `submitted_${surveyId}`;
    localStorage.removeItem(localStorageKey);
    console.log(`🧹 Cleared localStorage submission state for ${surveyId}`);
  } catch (error) {
    console.error("Error clearing localStorage submission state:", error);
  }
}

/**
 * Clear all survey submission states (useful for logout)
 */
export function clearAllSurveySubmissionStates(): void {
  let clearedCount = 0;

  // Clear sessionStorage
  if (isSessionStorageAvailable()) {
    try {
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (key.startsWith("survey:") && key.includes(":hasSubmitted")) {
          sessionStorage.removeItem(key);
          clearedCount++;
        }
      });
    } catch (error) {
      console.error("Error clearing sessionStorage submission states:", error);
    }
  }

  // Clear localStorage
  try {
    const localKeys = Object.keys(localStorage);
    localKeys.forEach((key) => {
      if (key.startsWith("submitted_")) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
  } catch (error) {
    console.error("Error clearing localStorage submission states:", error);
  }

  console.log(`🧹 Cleared ${clearedCount} total survey submission states`);
}

/**
 * Set user session ID for tracking
 */
export function setUserSessionId(sessionId: string): void {
  if (!isSessionStorageAvailable()) {
    return;
  }

  try {
    sessionStorage.setItem("userSessionId", sessionId);
    console.log(`👤 Set user session ID: ${sessionId}`);
  } catch (error) {
    console.error("Error setting user session ID:", error);
  }
}

/**
 * Get current user session ID
 */
export function getUserSessionId(): string | null {
  if (!isSessionStorageAvailable()) {
    return null;
  }

  try {
    return sessionStorage.getItem("userSessionId");
  } catch (error) {
    console.error("Error getting user session ID:", error);
    return null;
  }
}

/**
 * Initialize session storage for a new user session
 */
export function initializeUserSession(userId: string): string {
  const sessionId = `session_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  setUserSessionId(sessionId);

  console.log(`🚀 Initialized new user session for ${userId}: ${sessionId}`);
  return sessionId;
}

/**
 * Create a fresh session for anonymous surveys
 * Clears any existing submission state to prevent data leakage
 */
export function createFreshAnonymousSession(surveyId: string): string {
  const sessionId = `anonymous_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Clear any existing submission state for this survey
  clearSurveySubmissionState(surveyId);

  // Clear any related session storage keys that might cause conflicts
  try {
    const keysToCheck = Object.keys(sessionStorage);
    keysToCheck.forEach((key) => {
      if (
        key.includes(surveyId) &&
        (key.startsWith("survey_session_") ||
          key.startsWith("survey:") ||
          key.startsWith("retake_expiry_"))
      ) {
        sessionStorage.removeItem(key);
        console.log(`🧹 Cleared potentially conflicting key: ${key}`);
      }
    });
  } catch (error) {
    console.warn(`⚠️ Error clearing conflicting sessionStorage keys:`, error);
  }

  // Also clear localStorage for this survey to ensure fresh start
  try {
    const localStorageKey = `submitted_${surveyId}`;
    localStorage.removeItem(localStorageKey);
    console.log(`🧹 Cleared localStorage for anonymous survey ${surveyId}`);
  } catch (error) {
    console.warn(`⚠️ Error clearing localStorage for ${surveyId}:`, error);
  }

  console.log(
    `🌐 Created fresh anonymous session for ${surveyId}: ${sessionId}`
  );
  return sessionId;
}

/**
 * Validate that no stale data exists for a survey
 * Returns information about any found stale data
 */
export function validateNoStaleData(surveyId: string): {
  hasStaleData: boolean;
  staleKeys: string[];
  recommendations: string[];
} {
  const staleKeys: string[] = [];
  const recommendations: string[] = [];

  // Check sessionStorage for any survey-related keys
  try {
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.includes(surveyId)) {
        staleKeys.push(`sessionStorage: ${key}`);
      }
    });
  } catch (error) {
    console.warn("Error checking sessionStorage for stale data:", error);
  }

  // Check localStorage for any survey-related keys
  try {
    const localKeys = Object.keys(localStorage);
    localKeys.forEach((key) => {
      if (key.includes(surveyId)) {
        staleKeys.push(`localStorage: ${key}`);
      }
    });
  } catch (error) {
    console.warn("Error checking localStorage for stale data:", error);
  }

  // Generate recommendations
  if (staleKeys.length > 0) {
    recommendations.push(
      "Call createFreshAnonymousSession() for anonymous surveys"
    );
    recommendations.push(
      "Call clearSurveySubmissionState() before starting new sessions"
    );
    recommendations.push("Verify survey type detection is working correctly");
  }

  return {
    hasStaleData: staleKeys.length > 0,
    staleKeys,
    recommendations,
  };
}
