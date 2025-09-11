"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

function StatusPageContent() {
  const searchParams = useSearchParams();

  const type = searchParams.get("type") as
    | "not-assigned"
    | "already-submitted"
    | "survey-not-found"
    | "access-denied";

  const surveyId = searchParams.get("surveyId");
  const surveyTitle = searchParams.get("surveyTitle");
  const canTakeMultiple = searchParams.get("canTakeMultiple") === "true";
  const anonymous = searchParams.get("anonymous") === "true";
  const source = searchParams.get("source") as
    | "sessionStorage"
    | "localStorage"
    | "none"
    | null;
  const message = searchParams.get("message");

  const survey = surveyId
    ? {
        id: surveyId,
        title: surveyTitle || "Survey",
        canTakeMultiple: canTakeMultiple,
      }
    : undefined;

  return (
    <SurveyStatusPage
      type={type || "survey-not-found"}
      survey={survey}
      message={message || undefined}
      anonymous={anonymous}
      source={source}
    />
  );
}

export default function UserStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <StatusPageContent />
    </Suspense>
  );
}
