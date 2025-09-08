"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  return (
    <SurveyStatusPage
      type="access-denied"
      survey={
        surveyId
          ? { id: surveyId, title: "", canTakeMultiple: false }
          : undefined
      }
      message="You do not have permission to access this survey."
    />
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  );
}
