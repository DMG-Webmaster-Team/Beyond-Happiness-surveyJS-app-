"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import UserNavbar from "@/components/shared/UserNavbar";
import { ErrorCode, getErrorMessage } from "@/utils/errors";

interface SurveyStatusPageProps {
  type:
    | "not-assigned"
    | "already-submitted"
    | "survey-not-found"
    | "access-denied";
  survey?: {
    id: string;
    title: string;
    canTakeMultiple: boolean;
  };
  user?: {
    id: string;
    email: string;
    phone?: string;
  };
  message?: string;
  anonymous?: boolean;
  source?: "sessionStorage" | "localStorage" | "none" | null;
}

export default function SurveyStatusPage({
  type,
  survey,
  user,
  message,
  anonymous = false,
  source = null,
}: SurveyStatusPageProps) {
  const router = useRouter();

  const getStatusConfig = () => {
    switch (type) {
      case "not-assigned":
        return {
          icon: (
            <div className="w-16 h-16 mx-auto mb-6">
              <svg
                className="w-full h-full text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 715.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ),
          title: "Survey Not Assigned",
          message: message || "You are not assigned to this survey.",
          color: "text-red-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
        };
      case "already-submitted":
        const errorMessage = getErrorMessage(
          ErrorCode.SURVEY_ALREADY_SUBMITTED
        );
        return {
          icon: "✅",
          title: errorMessage.title,
          message:
            message ||
            (anonymous
              ? "You have completed this survey. You can take it again if needed."
              : errorMessage.message),
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "survey-not-found":
        return {
          icon: "❓",
          title: "Survey Not Found",
          message: message || "The requested survey could not be found.",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        };
      case "access-denied":
      default:
        return {
          icon: (
            <div className="w-16 h-16 mx-auto mb-6">
              <svg
                className="w-full h-full text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 715.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ),
          title: "Survey Not Assigned",
          message: message || "You are not assigned to this survey.",
          color: "text-red-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
        };
    }
  };

  const config = getStatusConfig();

  const handleBackToLogin = () => {
    // Clear any stored auth data
    sessionStorage.removeItem("authResponse");
    sessionStorage.removeItem("userContact");

    // Redirect back to login with survey ID preserved
    if (survey?.id) {
      router.push(`/user/login?redirect=${encodeURIComponent(survey.id)}`);
    } else {
      router.push("/user/login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: survey?.id }),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear session storage
    sessionStorage.removeItem("authResponse");
    sessionStorage.removeItem("userContact");

    // Redirect to login
    if (survey?.id) {
      router.push(`/user/login?redirect=${encodeURIComponent(survey.id)}`);
    } else {
      router.push("/user/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <div className="flex items-center justify-center h-[calc(100vh-64px)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              {/* Icon */}
              {typeof config.icon === "string" ? (
                <div className="text-6xl mb-4">{config.icon}</div>
              ) : (
                config.icon
              )}

              {/* Title */}
              <h2 className={`text-2xl font-bold ${config.color} mb-4`}>
                {config.title}
              </h2>

              {/* Message */}
              <p className="text-gray-600 mb-6">{config.message}</p>

              {/* Debug Info (only show in development) */}
              {process.env.NODE_ENV === "development" && source && (
                <div className="text-xs text-gray-400 mb-4 p-2 bg-gray-50 rounded">
                  🔍 Source: {source}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {type === "already-submitted" &&
                  survey?.canTakeMultiple === true && (
                    <button
                      onClick={() => router.push(`/user/survey/${survey.id}`)}
                      className="w-full bg-blue-400 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Take Survey Again
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
