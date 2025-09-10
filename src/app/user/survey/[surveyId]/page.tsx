"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import useSWR from "swr";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";
import SurveySkeletonLoader from "@/components/shared/SurveySkeletonLoader";
import PDFExportButton from "@/components/PDFExportButton";
import {
  canRetakeSurvey,
  validateSurveySession,
} from "../../../../lib/auth/survey-session";
import { useSurveySession } from "../../../../hooks/useSurveySession";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { safeUrl, extractSurveyIdFromUrl } from "@/utils/url-helpers";

// Dynamically import Survey component to avoid SSR issues
const DynamicSurvey = dynamic(
  () => import("survey-react-ui").then((mod) => mod.Survey),
  {
    ssr: false,
    loading: () => <div className="text-center py-8">Loading survey...</div>,
  }
);

// Fallback component for when SurveyJS fails to load
const SurveyFallback = ({
  surveyData,
  onRetry,
}: {
  surveyData: SurveyData;
  onRetry: () => void;
}) => (
  <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Survey: {surveyData.title}
      </h2>
      <p className="text-gray-600 mb-6">{surveyData.description}</p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          ⚠️ SurveyJS component failed to load. This might be due to a network
          issue or chunk loading problem.
        </p>
        <div className="mt-4 space-x-3">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  status: string;
  assignments?: Array<{
    surveyId: string;
    surveyTitle: string;
    status: string;
  }>;
  loginTime?: string;
}

interface SurveyData {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  isAnonymous: boolean;
  adminId: string;
  json: any;
  isCompleted?: boolean; // For handling completed survey responses
  message?: string; // For completion messages
  surveyId?: string; // For completion responses
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    // Check if this is a redirect response (302)
    if (res.status === 302) {
      const data = await res.json();
      if (data.redirect && data.redirectUrl) {
        // Redirect to the correct survey type
        window.location.href = data.redirectUrl;
        return null; // Return null to prevent further processing
      }
    }

    // Check if this is a survey already completed error (403)
    if (res.status === 403) {
      const data = await res.json();
      if (data.code === "SURVEY_ALREADY_SUBMITTED") {
        console.log(
          "🚫 Survey already completed - returning completion response"
        );
        // Return a special object to indicate completion instead of throwing
        // This prevents SWR from treating it as an error and retrying
        return {
          isCompleted: true,
          message: data.message,
          surveyId: extractSurveyIdFromUrl(url) || "unknown",
        };
      }
    }

    // Create an error object with status for SWR error handling
    const error = new Error("Failed to fetch survey");
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};

// ✅ NEW: Utility functions for localStorage survey tracking
const getSubmissionKey = (surveyId: string) => `submitted_${surveyId}`;

const isRecentlySubmitted = (surveyId: string): boolean => {
  if (typeof window === "undefined") return false;

  const submissionData = localStorage.getItem(getSubmissionKey(surveyId));
  if (!submissionData) return false;

  try {
    const { timestamp } = JSON.parse(submissionData);
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000; // 15 minutes
    return timestamp > fifteenMinutesAgo;
  } catch {
    return false;
  }
};

const markSurveySubmitted = (surveyId: string) => {
  if (typeof window === "undefined") return;

  const submissionData = {
    timestamp: Date.now(),
    surveyId,
  };
  localStorage.setItem(
    getSubmissionKey(surveyId),
    JSON.stringify(submissionData)
  );
};

const clearSubmissionFlag = (surveyId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSubmissionKey(surveyId));
};

export default function UserSurvey() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [surveyLoadError, setSurveyLoadError] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [isAnonymousSurvey, setIsAnonymousSurvey] = useState(false);
  const [anonymousSurveyChecked, setAnonymousSurveyChecked] = useState(false);
  const [isLoadingAccessCheck, setIsLoadingAccessCheck] = useState(true);
  const [minLoadingTime, setMinLoadingTime] = useState(true);
  // ✅ NEW: Survey completion check states
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(true);
  const [surveyCanTakeMultiple, setSurveyCanTakeMultiple] = useState(true);
  // ✅ NEW: Early localStorage check to prevent survey loading
  const [earlyCompletionCheck, setEarlyCompletionCheck] = useState(true);
  // ✅ REMOVED: statusPageData - no longer needed with consolidated flow
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  // Survey session management (for non-anonymous surveys)
  const surveySession = useSurveySession({
    userId: user?.id || "",
    surveyId: surveyId || "",
    autoCreate: !isAnonymousSurvey && !!user?.id && !!surveyId,
  });

  // Store surveyId in sessionStorage for logout recovery
  useEffect(() => {
    if (surveyId) {
      sessionStorage.setItem("currentSurveyId", surveyId);
      sessionStorage.setItem("currentSurveyType", "regular");
      console.log("💾 Stored surveyId for logout recovery:", surveyId);
    }
  }, [surveyId]);

  // ✅ NEW: Early localStorage check to prevent survey loading if recently submitted
  useEffect(() => {
    if (!surveyId || !mounted) return;

    const recentlySubmitted = isRecentlySubmitted(surveyId);
    if (recentlySubmitted) {
      console.log(
        "🚫 Early check: Survey recently submitted, redirecting to status page"
      );
      // Immediately redirect to avoid any loading states
      router.replace(
        `/user/status?type=already-submitted&surveyId=${surveyId}&canTakeMultiple=false`
      );
      return;
    }
    setEarlyCompletionCheck(false);
  }, [surveyId, mounted]);

  // This useEffect will be moved after the SWR declaration

  // Conditional navbar based on survey type (memoized to prevent re-renders)
  const navbarComponent = useMemo(() => {
    return isAnonymousSurvey ? <AnonymousNavbar /> : <UserNavbar />;
  }, [isAnonymousSurvey]);

  // Ensure component is mounted before rendering survey
  useEffect(() => {
    setMounted(true);
    // Set minimum loading time to prevent flash
    const timer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 500); // 500ms minimum loading time

    return () => clearTimeout(timer);
  }, []);

  // ✅ NEW: Check if survey is anonymous before any auth checks
  useEffect(() => {
    const checkAnonymousSurvey = async () => {
      try {
        setIsLoadingAccessCheck(true);
        const response = await fetch(`/api/surveys/${surveyId}`);

        // Handle redirect response (302)
        if (response.status === 302) {
          const data = await response.json();
          if (data.redirect && data.redirectUrl) {
            console.log("🔄 Cross-survey redirect detected:", data.redirectUrl);
            window.location.href = data.redirectUrl;
            return;
          }
        }

        if (response.ok) {
          const surveyData = await response.json();
          if (surveyData.isAnonymous) {
            console.log("🌐 Anonymous survey detected - bypassing auth checks");
            setIsAnonymousSurvey(true);
            setIsLoadingAccessCheck(false); // Anonymous surveys can load immediately
            // Note: Don't set loading false here, let other effects handle it
          } else {
            console.log(
              "🔐 Authenticated survey detected - will check session"
            );
            // Keep loading state true for authenticated surveys until session is verified
          }
        }
      } catch (error) {
        console.error("Error checking survey anonymity:", error);
        // On error, assume authenticated and redirect to login
        router.push(`/user/login?redirect=${encodeURIComponent(surveyId)}`);
      } finally {
        setAnonymousSurveyChecked(true);
      }
    };

    if (surveyId && mounted) {
      checkAnonymousSurvey();
    }
  }, [surveyId, mounted, router]);

  // ✅ NEW: Check if survey is already completed on page load
  useEffect(() => {
    const checkSurveyCompletion = async () => {
      // Only check completion after we know if it's anonymous and have checked session for authenticated surveys
      if (!surveyId || !anonymousSurveyChecked) return;

      // For anonymous surveys, check localStorage only
      if (isAnonymousSurvey) {
        const recentlySubmitted = isRecentlySubmitted(surveyId);
        if (recentlySubmitted) {
          console.log(
            "🚫 Anonymous survey recently submitted (localStorage), redirecting to status page"
          );
          // Redirect to status page to avoid loading state
          router.replace(
            `/user/status?type=already-submitted&surveyId=${surveyId}&canTakeMultiple=false&anonymous=true`
          );
          return;
        }
        setIsCheckingCompletion(false);
        return;
      }

      // For authenticated surveys, wait for user session to be loaded
      if (!isAnonymousSurvey && !user) {
        // Still loading user session, don't check yet
        return;
      }

      // Check localStorage first for quick redirect
      const recentlySubmitted = isRecentlySubmitted(surveyId);
      if (recentlySubmitted) {
        console.log(
          "🚫 Survey recently submitted (localStorage), redirecting to status page"
        );
        // Immediately redirect to status page to avoid loading state
        router.replace(
          `/user/status?type=already-submitted&surveyId=${surveyId}&canTakeMultiple=false`
        );
        return;
      }

      try {
        console.log("🔍 Checking survey completion status...");
        setIsCheckingCompletion(true);

        const response = await fetch(
          `/api/survey-status?surveyId=${surveyId}&surveyType=regular`
        );

        if (response.ok) {
          const data = await response.json();

          setSurveyCanTakeMultiple(data.canTakeMultiple);

          if (data.submitted && !data.canTakeMultiple) {
            console.log(
              "🚫 Survey already completed and cannot be retaken, redirecting to status page"
            );
            // Redirect to status page instead of showing inline message
            router.replace(
              `/user/status?type=already-submitted&surveyId=${surveyId}&canTakeMultiple=false&surveyTitle=${encodeURIComponent(
                data.surveyTitle || "Survey"
              )}`
            );
            return;
          } else {
            console.log(
              "✅ Survey not yet completed or can be retaken, allowing access"
            );
          }
        } else {
          console.error("Failed to check survey completion status");
          // On error, allow survey to proceed (fail open)
        }
      } catch (error) {
        console.error("Error checking survey completion:", error);
        // On error, allow survey to proceed (fail open)
      } finally {
        setIsCheckingCompletion(false);
      }
    };

    checkSurveyCompletion();
  }, [surveyId, anonymousSurveyChecked, isAnonymousSurvey, user, router]);

  // ✅ NEW: Handle loading state for anonymous surveys
  useEffect(() => {
    if (isAnonymousSurvey && anonymousSurveyChecked) {
      setLoading(false);
    }
  }, [isAnonymousSurvey, anonymousSurveyChecked]);

  // ✅ REMOVED: Auth response checking - now handled in login flow

  // Handle chunk loading errors
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (
        event.error &&
        event.error.message &&
        event.error.message.includes("ChunkLoadError")
      ) {
        console.error("SurveyJS chunk loading failed:", event.error);
        setSurveyLoadError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        event.reason.message &&
        event.reason.message.includes("ChunkLoadError")
      ) {
        console.error(
          "SurveyJS chunk loading failed (unhandled rejection):",
          event.reason
        );
        setSurveyLoadError(true);
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // Preload SurveyJS component to prevent chunk loading issues
  useEffect(() => {
    if (mounted && !surveyLoadError) {
      // Preload the SurveyJS component
      const preloadSurveyJS = async () => {
        setPreloading(true);
        try {
          await import("survey-react-ui");
          console.log("✅ SurveyJS component preloaded successfully");
        } catch (error) {
          console.error("❌ Failed to preload SurveyJS component:", error);
          setSurveyLoadError(true);
        } finally {
          setPreloading(false);
        }
      };

      preloadSurveyJS();
    }
  }, [mounted, surveyLoadError]);

  // Check user session (skip for anonymous surveys)
  useEffect(() => {
    const checkSession = async () => {
      // Skip session check for anonymous surveys
      if (isAnonymousSurvey) {
        console.log("🌐 Skipping session check for anonymous survey");
        return;
      }
      // prevent setState on unmounted
      let cancelled = false;
      const cancel = () => {
        cancelled = true;
      };
      try {
        // show loading immediately to avoid page flash
        setLoading(true);
        setError("");

        const res = await fetch("/api/auth/check-session", {
          method: "GET",
          credentials: "include", // important if using cookies
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        // Distinguish auth vs server failures
        if (res.status === 401) {
          // not authenticated → redirect with replace to avoid back-button loop
          router.replace(
            `/user/login?redirect=${encodeURIComponent(surveyId)}`
          );
          return cancel();
        }
        if (!res.ok) {
          // server error → show friendly message and stop
          setError("We couldn't verify your session. Please try again.");
          return;
        }

        const data = await res.json();

        console.log("🔍 Session check response for survey page:", {
          isAuthenticated: data.isAuthenticated,
          hasUser: !!data.user,
          surveyId: surveyId,
        });

        // Defensive user shape
        const userData = data?.user ?? null;
        const assignments = Array.isArray(userData?.assignments)
          ? userData.assignments
          : [];

        console.log(
          "🔍 User assignments:",
          assignments.map((a: any) => ({
            surveyId: a.surveyId,
            title: a.surveyTitle,
            status: a.status,
          }))
        );

        if (!userData) {
          console.log("❌ No user data, redirecting to login");
          router.replace(
            `/user/login?redirect=${encodeURIComponent(surveyId)}`
          );
          return cancel();
        }

        // Assignment gate
        const isAssigned = assignments.some(
          (a: any) => a && String(a.surveyId) === String(surveyId)
        );

        console.log("🔍 Assignment check result:", {
          isAssigned,
          targetSurveyId: surveyId,
          userAssignments: assignments.map((a: any) => a.surveyId),
        });

        if (!isAssigned) {
          console.log("❌ User not assigned to this survey");
          setUser(userData);
          setError("You are not assigned to this survey");
          return;
        }

        console.log("✅ User is assigned, proceeding to survey");
        setUser(userData);
      } catch (err) {
        console.error("Session check error:", err);
        // On network errors, go to login but use replace to avoid flicker/history clutter
        router.replace(`/user/login?redirect=${encodeURIComponent(surveyId)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Only run session check after anonymous check is complete and survey is not anonymous
    if (anonymousSurveyChecked && !isAnonymousSurvey) {
      checkSession();
    }
  }, [surveyId, router, isAnonymousSurvey, anonymousSurveyChecked]);

  // Use SWR for live survey data fetching
  const {
    data: survey,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<SurveyData>(
    // ✅ FIXED: Allow fetching for anonymous surveys OR authenticated users with assignments
    // ✅ Fetch survey data when conditions are met
    surveyId &&
      (isAnonymousSurvey ||
        (user &&
          user.assignments &&
          user.assignments.some(
            (a: { surveyId: string }) => a.surveyId === surveyId
          ))) &&
      !surveySubmitted // Stop fetching after survey is submitted
      ? `/api/surveys/${surveyId}${user?.id ? `?userId=${user.id}` : ""}`
      : null,
    fetcher,
    {
      refreshInterval: surveySubmitted ? 0 : 5000, // Stop refresh after submission
      revalidateOnFocus: !surveySubmitted, // Stop revalidation after submission
      revalidateOnReconnect: !surveySubmitted, // Stop revalidation after submission
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry if survey is completed
        if (surveySubmitted) {
          console.log("🚫 Survey completed, stopping SWR retries");
          return;
        }

        // Don't retry on 403 errors (survey already completed)
        if (error?.status === 403) {
          console.log("🚫 403 error detected, stopping SWR retries");
          return;
        }

        // Default retry logic for other errors
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // ✅ Validate survey-scoped session for authenticated surveys (only after survey data is loaded)
  useEffect(() => {
    // Wait for survey data to be loaded before checking session
    if (surveyId && survey && !survey.isAnonymous && !isAnonymousSurvey) {
      const sessionValidation = validateSurveySession(surveyId);
      if (!sessionValidation.isValid) {
        console.log(
          "🚫 Survey session invalid for regular survey:",
          sessionValidation.reason
        );
        // Redirect to login with survey context
        router.push(`/user/login?redirect=${encodeURIComponent(surveyId)}`);
        return;
      }
      console.log("✅ Survey session valid for regular survey:", surveyId);
      // Session is valid, stop loading
      setIsLoadingAccessCheck(false);
    }
  }, [surveyId, survey, isAnonymousSurvey, router]);

  // Handle completed survey from API response
  useEffect(() => {
    if (survey?.isCompleted && !surveySubmitted) {
      console.log(
        "🚫 Survey detected as completed from API, updating state and stopping SWR"
      );
      setSurveySubmitted(true);
      // Immediately stop SWR by mutating with undefined to clear the cache
      mutate(undefined, false);
    }
  }, [survey?.isCompleted, surveySubmitted, mutate]);

  // Create survey model from session data (for authenticated surveys) or live data (for anonymous surveys)
  const surveyModel = useMemo(() => {
    if (!mounted) return null;

    // Handle completed survey response from fetcher
    if (survey?.isCompleted) {
      console.log("🚫 Survey is completed, not creating model");
      return null;
    }

    let surveyData = null;

    // For anonymous surveys, use live data from SWR
    if (isAnonymousSurvey && survey?.json) {
      surveyData = {
        ...survey,
        canTakeMultiple: survey.canTakeMultiple ?? false,
      };
    }
    // For authenticated surveys, use frozen session data
    else if (
      !isAnonymousSurvey &&
      surveySession.session &&
      !surveySession.isLoading
    ) {
      const sessionConfig = surveySession.getSurveyConfig();
      if (sessionConfig) {
        surveyData = {
          json: sessionConfig.definition,
          title: sessionConfig.title,
          description: sessionConfig.description,
          canTakeMultiple: sessionConfig.canTakeMultiple ?? false,
          isAnonymous: sessionConfig.isAnonymous ?? false,
        };
        console.log("🔒 Using frozen survey configuration from session");
      }
    }

    if (!surveyData?.json) return null;

    try {
      const model = new Model(surveyData.json);

      // Disable SurveyJS built-in completion page to prevent duplicate thank you messages
      model.showCompletedPage = false;

      // Add error handling for survey rendering
      model.onAfterRenderSurvey.add(() => {
        console.log("Survey rendered successfully");
      });

      return model;
    } catch (error) {
      console.error("Error creating survey model:", error);
      return null;
    }
  }, [
    survey?.json,
    mounted,
    isAnonymousSurvey,
    surveySession.session,
    surveySession.isLoading,
    surveySession.getSurveyConfig,
  ]);

  // Handle fetch errors and check submission status
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || "Failed to load survey");
    }
  }, [fetchError]);

  // ✅ REMOVED: Redundant submission check
  // The hasSubmitted status should be determined during the OTP login flow
  // and enforced by the login page. The UserSurvey component should only
  // handle the survey display and submission, not check submission status.
  // This eliminates the race condition and inconsistency issues.

  const handleSurveyComplete = async (sender: any) => {
    // ✅ UPDATED: Allow anonymous survey submissions
    if (!survey) return;
    if (!isAnonymousSurvey && !user) return;

    setSubmitting(true);
    setError("");

    try {
      // ✅ UPDATED: Conditional userId for anonymous surveys
      const submissionData = {
        surveyId: survey.id,
        adminId: survey.adminId,
        data: sender.data,
        ...(isAnonymousSurvey ? {} : { userId: user!.id }), // Only include userId for non-anonymous
      };

      console.log(
        isAnonymousSurvey
          ? "🌐 Submitting anonymous survey"
          : "👤 Submitting authenticated survey"
      );

      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        // Immediately show completion without refresh
        setSurveySubmitted(true);

        // ✅ NEW: Handle localStorage tracking and redirect for one-time surveys
        if (!survey.canTakeMultiple) {
          console.log(
            "🔒 One-time survey completed - marking as submitted and scheduling redirect"
          );
          markSurveySubmitted(survey.id);

          // Show success message with redirect notice
          setTimeout(() => {
            console.log(
              "🔄 Redirecting to survey login page after one-time survey completion"
            );
            router.push(`/user/survey/${survey.id}`);
          }, 10000); // 10 seconds delay
        }

        // ✅ UPDATED: Handle post-submission differently for anonymous vs authenticated
        if (isAnonymousSurvey) {
          console.log("🌐 Anonymous survey completed - staying on page");
          // For anonymous surveys, just show completion state
          // User stays on the same page and can retake if desired
        } else {
          // Complete the survey session for authenticated surveys
          try {
            if (surveySession.session) {
              await surveySession.completeSession();
              console.log("🔒 Survey session completed successfully");
            }
          } catch (sessionError) {
            console.error("Error completing survey session:", sessionError);
            // Don't fail the entire submission if session completion fails
          }

          // Update user data to reflect submission (authenticated surveys only)
          const updatedUser = {
            ...user!,
            hasSubmitted: true,
            submittedAt: new Date().toISOString(),
          };
          setUser(updatedUser);

          // Removed auto-logout to allow survey retakes - user can manually logout or retake
        }
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit survey");
      }
    } catch (error) {
      setError("An error occurred while submitting the survey");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeSurvey = () => {
    setSurveySubmitted(false);
    // The survey model will be recreated automatically via useMemo when survey data changes
    // or we can trigger a manual clear if the model exists
    if (surveyModel) {
      surveyModel.clear();
    }
  };

  // ✅ REMOVED: Status page handling - now handled by dedicated routes

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-xl">Loading survey...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton loader while checking access for non-anonymous surveys
  if (isLoadingAccessCheck && !isAnonymousSurvey) {
    return <SurveySkeletonLoader />;
  }

  if (surveySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Survey completed successfully!
              </h2>
              {survey?.canTakeMultiple || isAnonymousSurvey ? (
                <p className="mt-2 text-center text-sm text-gray-600">
                  &quot;You can retake this survey if needed.&quot;
                </p>
              ) : (
                " "
              )}
            </div>

            {survey?.canTakeMultiple || isAnonymousSurvey ? (
              <div className="text-center">
                <button
                  onClick={handleRetakeSurvey}
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-400 hover:bg-blue-600"
                >
                  {isAnonymousSurvey ? "Take Again" : "Retake Survey"}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-4">
                  This survey can only be completed once.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 text-sm">
                    🔄 You will be redirected to the survey login page in 10
                    seconds...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading while data is being fetched or session is being initialized
  const isLoadingData =
    isLoading ||
    (!isAnonymousSurvey && surveySession.isLoading) ||
    !mounted ||
    loading ||
    isLoadingAccessCheck ||
    !anonymousSurveyChecked ||
    preloading ||
    minLoadingTime ||
    isCheckingCompletion ||
    earlyCompletionCheck; // ✅ NEW: Include early completion check in loading state

  if (isLoadingData) {
    return (
      <>
        {navbarComponent}
        <LoadingScreen message="Loading survey..." />
      </>
    );
  }

  // Show access denied only after loading is complete and we truly don't have access
  if ((!survey || !surveyModel) && !survey?.isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex flex-col gap-10 items-center justify-center h-[calc(100vh-64px)]">
          <img
            src="/beyond-happiness-logo.svg"
            alt="logo"
            className="w-40 h-40"
          />
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              You dont have access for this survey
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY CHECK: Ensure user is authenticated and assigned to this survey (skip for anonymous)
  if (!isAnonymousSurvey && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              Access Denied: Authentication required
            </div>
            <p className="text-gray-600">
              Please authenticate to access this survey.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY CHECK: Ensure user is assigned to this specific survey (skip for anonymous)
  if (
    !isAnonymousSurvey &&
    user &&
    (!user.assignments ||
      !user.assignments.some(
        (a: { surveyId: string }) => a.surveyId === surveyId
      ))
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        {navbarComponent}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              Access Denied: Survey not assigned
            </div>
            <p className="text-gray-600">
              You are not authorized to access this survey.
              {user.assignments && user.assignments.length > 0
                ? ` You are assigned to surveys: ${user.assignments
                    .map((a) => a.surveyTitle)
                    .join(", ")}`
                : " You have no survey assignments."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ REMOVED: Incorrect submission check logic
  // The previous logic was checking if user has an assignment and incorrectly
  // assuming that means they've submitted. Assignment != Submission!
  // Submission status should be checked during the OTP login flow and
  // users should be blocked at the login page, not here.

  return (
    <div className="min-h-screen bg-gray-50">
      {navbarComponent}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center"></div>
        </div>

        {submitting && (
          <div className="mb-4 px-4 py-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            Submitting survey...
          </div>
        )}

        {/* Survey */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {mounted && surveyModel && !surveyLoadError ? (
              <DynamicSurvey
                model={surveyModel}
                onComplete={handleSurveyComplete}
                onError={(error: any) => {
                  console.error("SurveyJS error:", error);
                  setSurveyLoadError(true);
                }}
              />
            ) : surveyLoadError && survey ? (
              <SurveyFallback
                surveyData={survey}
                onRetry={() => {
                  setSurveyLoadError(false);
                  setPreloading(false);
                }}
              />
            ) : preloading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Preloading SurveyJS component...</p>
              </div>
            ) : (
              <div className="text-center py-8">Loading survey...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
