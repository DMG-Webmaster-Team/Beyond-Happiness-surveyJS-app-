"use client";

export const dynamic = 'force-dynamic';

import { useSearchParams } from "next/navigation";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

export default function AlreadySubmittedPage() {
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
