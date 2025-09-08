import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface LogoutOptions {
  surveyId?: string;
  surveyType?: "regular" | "happiness";
  clearAllSessions?: boolean;
  redirectTo?: string;
}

/**
 * Central logout utility that preserves surveyId and handles cleanup
 */
export async function handleLogoutWithSurveyPreservation(
  router: AppRouterInstance,
  options: LogoutOptions = {}
) {
  const {
    surveyId,
    surveyType,
    clearAllSessions = false,
    redirectTo,
  } = options;

  console.log("🔄 Starting logout process with options:", options);

  // 1. Determine surveyId from multiple sources
  let finalSurveyId = surveyId;
  let finalSurveyType = surveyType;

  try {

    if (!finalSurveyId) {
      // Try to get surveyId from current URL
      finalSurveyId = getSurveyIdFromCurrentURL();
      finalSurveyType = getSurveyTypeFromCurrentURL();
    }

    if (!finalSurveyId) {
      // Try to get surveyId from sessionStorage (stored during survey access)
      finalSurveyId = sessionStorage.getItem("currentSurveyId") || undefined;
      finalSurveyType =
        (sessionStorage.getItem("currentSurveyType") as
          | "regular"
          | "happiness") || undefined;
    }

    // 2. Call logout API with survey context
    const logoutResponse = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        surveyId: finalSurveyId,
        surveyType: finalSurveyType,
      }),
    });

    if (!logoutResponse.ok) {
      console.warn(
        "Logout API call failed, proceeding with client-side cleanup"
      );
    }

    // 3. Clear session storage
    if (clearAllSessions) {
      // Clear all survey sessions
      clearAllSurveySessions();
    } else if (finalSurveyId) {
      // Clear only current survey session
      clearSurveySession(finalSurveyId);
    }

    // 4. Clear any cached access data
    if (finalSurveyId) {
      clearSurveyCaches(finalSurveyId);
    }

    // 5. Determine redirect URL
    let redirectUrl = redirectTo;

    if (!redirectUrl) {
      if (finalSurveyId) {
        if (finalSurveyType === "happiness") {
          redirectUrl = `/user/login?redirect=${encodeURIComponent(
            finalSurveyId
          )}&type=happiness`;
        } else {
          redirectUrl = `/user/login?redirect=${encodeURIComponent(
            finalSurveyId
          )}`;
        }
      } else {
        // Fallback: redirect to survey selection or error page
        console.warn(
          "⚠️ No surveyId found during logout - redirecting to error page"
        );
        redirectUrl = "/error?message=Survey+ID+missing";
      }
    }

    console.log("🔄 Logout successful, redirecting to:", redirectUrl);

    // 6. Redirect
    router.push(redirectUrl);
  } catch (error) {
    console.error("❌ Error during logout:", error);

    // Fallback redirect on error
    const fallbackUrl = finalSurveyId
      ? `/user/login?redirect=${encodeURIComponent(finalSurveyId)}`
      : "/error?message=Logout+failed";

    router.push(fallbackUrl);
  }
}

/**
 * Extract surveyId from current URL path
 */
function getSurveyIdFromCurrentURL(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const path = window.location.pathname;

  // Match happiness survey pattern: /happiness/[surveyId]
  const happinessMatch = path.match(/\/happiness\/([^\/]+)/);
  if (happinessMatch) {
    return happinessMatch[1];
  }

  // Match regular survey pattern: /user/survey/[surveyId]
  const regularMatch = path.match(/\/user\/survey\/([^\/]+)/);
  if (regularMatch) {
    return regularMatch[1];
  }

  // Check URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("surveyId") || urlParams.get("redirect") || undefined;
}

/**
 * Extract survey type from current URL path
 */
function getSurveyTypeFromCurrentURL(): "regular" | "happiness" | undefined {
  if (typeof window === "undefined") return undefined;

  const path = window.location.pathname;

  if (path.includes("/happiness/")) {
    return "happiness";
  }

  if (path.includes("/user/survey/")) {
    return "regular";
  }

  // Check URL params as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("type");
  if (typeParam === "happiness") {
    return "happiness";
  }

  return "regular"; // Default to regular
}

/**
 * Clear session for a specific survey
 */
function clearSurveySession(surveyId: string) {
  if (typeof window === "undefined") return;

  try {
    // Clear survey-specific session
    sessionStorage.removeItem(`survey_session_${surveyId}`);

    // Clear retake expiry if exists
    sessionStorage.removeItem(`retake_expiry_${surveyId}`);

    console.log(`🧹 Cleared session for survey: ${surveyId}`);
  } catch (error) {
    console.warn("Error clearing survey session:", error);
  }
}

/**
 * Clear all survey sessions
 */
function clearAllSurveySessions() {
  if (typeof window === "undefined") return;

  try {
    // Get all sessionStorage keys
    const keys = Object.keys(sessionStorage);

    // Clear all survey-related sessions
    keys.forEach((key) => {
      if (
        key.startsWith("survey_session_") ||
        key.startsWith("retake_expiry_") ||
        key === "currentSurveyId" ||
        key === "currentSurveyType"
      ) {
        sessionStorage.removeItem(key);
      }
    });

    console.log("🧹 Cleared all survey sessions");
  } catch (error) {
    console.warn("Error clearing all survey sessions:", error);
  }
}

/**
 * Clear cached access data for a survey
 */
function clearSurveyCaches(surveyId: string) {
  if (typeof window === "undefined") return;

  try {
    // Clear localStorage caches
    const cacheKeys = Object.keys(localStorage).filter(
      (key) =>
        key.includes(`happiness:access:${surveyId}`) ||
        key.includes(`access:denied:${surveyId}`) ||
        key.includes(`happiness:lastResult:${surveyId}`)
    );

    cacheKeys.forEach((key) => localStorage.removeItem(key));

    console.log(
      `🧹 Cleared ${cacheKeys.length} cache entries for survey: ${surveyId}`
    );
  } catch (error) {
    console.warn("Error clearing survey caches:", error);
  }
}

/**
 * Quick logout function for emergency cases
 */
export function emergencyLogout(
  router: AppRouterInstance,
  reason: string = "Unknown"
) {
  console.warn(`🚨 Emergency logout triggered: ${reason}`);

  // Clear everything
  clearAllSurveySessions();

  // Try to get surveyId for redirect
  const surveyId =
    getSurveyIdFromCurrentURL() || sessionStorage.getItem("currentSurveyId");

  if (surveyId) {
    router.push(
      `/user/login?redirect=${encodeURIComponent(surveyId)}&emergency=true`
    );
  } else {
    router.push("/error?message=Emergency+logout");
  }
}
