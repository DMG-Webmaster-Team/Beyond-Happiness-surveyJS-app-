"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

function NotAssignedContent() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  return (
    <SurveyStatusPage
      type="not-assigned"
      survey={
        surveyId
          ? { id: surveyId, title: "", canTakeMultiple: false }
          : undefined
      }
      message="You are not assigned to this survey."
    />
  );
}

export default function NotAssignedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    }>
      <NotAssignedContent />
    </Suspense>
  );
}
