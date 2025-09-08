"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

function AlreadySubmittedContent() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  return (
    <SurveyStatusPage
      type="already-submitted"
      survey={
        surveyId
          ? { id: surveyId, title: "", canTakeMultiple: false }
          : undefined
      }
      message="You have already submitted this survey and it can only be completed once."
    />
  );
}

export default function AlreadySubmittedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    }>
      <AlreadySubmittedContent />
    </Suspense>
  );
}
