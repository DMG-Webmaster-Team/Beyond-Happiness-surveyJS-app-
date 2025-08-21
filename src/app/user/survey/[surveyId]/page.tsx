"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import useSWR from "swr";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";
import PDFExportButton from "@/components/PDFExportButton";

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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
  adminId: string;
  json: any;
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  });

export default function UserSurvey() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [surveyLoadError, setSurveyLoadError] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  // Ensure component is mounted before rendering survey
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Check user session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check-session");
        const data = await response.json();

        if (!data.isAuthenticated) {
          router.push(`/user/login?redirect=${surveyId}`);
          return;
        }

        setUser(data.user);

        // Check if user is assigned to this survey
        if (
          !data.user.assignments ||
          !data.user.assignments.some(
            (a: { surveyId: string }) => a.surveyId === surveyId
          )
        ) {
          setError("You are not assigned to this survey");
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Session check error:", error);
        router.push(`/user/login?redirect=${surveyId}`);
      }
    };

    checkSession();
  }, [surveyId, router]);

  // Use SWR for live survey data fetching - only when user is authenticated AND assigned to this survey
  const {
    data: survey,
    error: fetchError,
    isLoading,
  } = useSWR<SurveyData>(
    user &&
      surveyId &&
      user.assignments &&
      user.assignments.some(
        (a: { surveyId: string }) => a.surveyId === surveyId
      )
      ? `/api/surveys/${surveyId}`
      : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Create survey model from the latest data
  const surveyModel = useMemo(() => {
    if (!survey?.json || !mounted) return null;

    try {
      // Ensure canTakeMultiple defaults to false if not present
      const surveyData = {
        ...survey,
        canTakeMultiple: survey.canTakeMultiple ?? false,
      };
      const model = new Model(surveyData.json);

      // Add error handling for survey rendering
      model.onAfterRenderSurvey.add(() => {
        console.log("Survey rendered successfully");
      });

      return model;
    } catch (error) {
      console.error("Error creating survey model:", error);
      return null;
    }
  }, [survey?.json, mounted]);

  // Handle fetch errors and check submission status
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || "Failed to load survey");
    }
  }, [fetchError]);

  // Check if user has already submitted this survey after survey data is loaded
  useEffect(() => {
    if (
      user &&
      survey &&
      user.assignments &&
      user.assignments.some(
        (a: { surveyId: string }) => a.surveyId === surveyId
      )
    ) {
      // Check if user has already submitted this survey by querying the results table
      const checkSubmission = async () => {
        try {
          const response = await fetch(
            `/api/results?surveyId=${surveyId}&userId=${user.id}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              setSurveySubmitted(true);
            }
          }
        } catch (error) {
          console.error("Error checking submission status:", error);
        }
      };
      checkSubmission();
    }
  }, [user, survey, surveyId]);

  const handleSurveyComplete = async (sender: any) => {
    if (!user || !survey) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: survey.id,
          userId: user.id,
          adminId: survey.adminId,
          data: sender.data,
        }),
      });

      if (response.ok) {
        // Immediately show completion without refresh
        setSurveySubmitted(true);

        // Update user data to reflect submission
        const updatedUser = {
          ...user,
          hasSubmitted: true,
          submittedAt: new Date().toISOString(),
        };
        setUser(updatedUser);

        // Auto-logout after 5 seconds for completed surveys
        setTimeout(() => {
          fetch("/api/auth/logout", { method: "POST" })
            .then(() => router.push("/user/login"))
            .catch(console.error);
        }, 5000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-xl">Loading survey...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (surveySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                ✅ Survey completed successfully!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {survey?.canTakeMultiple
                  ? "You can retake this survey if needed."
                  : "Thank you for completing the survey."}
              </p>
            </div>

            {/* PDF Export Option */}
            {survey && (
              <div className="text-center">
                <PDFExportButton
                  surveyJson={survey.json}
                  surveyData={surveyModel?.data}
                  className="w-full py-2 px-4 text-sm font-medium rounded-md"
                >
                  📄 Export Survey to PDF
                </PDFExportButton>
              </div>
            )}

            {survey?.canTakeMultiple ? (
              <div className="text-center">
                <button
                  onClick={handleRetakeSurvey}
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90"
                >
                  Retake Survey
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  This survey can only be completed once.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!survey || !surveyModel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex flex-col gap-10 items-center justify-center h-[calc(100vh-64px)]">
          <img
            src="/beyond-happiness-logo.svg"
            alt="logo"
            className="w-100 h-100"
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

  // SECURITY CHECK: Ensure user is authenticated and assigned to this survey
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
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

  // SECURITY CHECK: Ensure user is assigned to this specific survey
  if (
    !user.assignments ||
    !user.assignments.some((a: { surveyId: string }) => a.surveyId === surveyId)
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
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

  // Check if user has already submitted (for one-time surveys)
  if (survey && !survey.canTakeMultiple && user) {
    const hasSubmittedThisSurvey = user.assignments.some(
      (assignment) => assignment.surveyId === surveyId
    );
    if (hasSubmittedThisSurvey) {
      return (
        <div className="min-h-screen bg-gray-50">
          <UserNavbar />
          <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">
                You have already submitted this survey
              </div>
              <p className="text-gray-600">
                This survey can only be completed once and you have already
                submitted it.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
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
