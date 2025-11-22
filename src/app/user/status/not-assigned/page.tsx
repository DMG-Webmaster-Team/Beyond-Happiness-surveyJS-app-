"use client";

export const dynamic = 'force-dynamic';

import { useSearchParams } from "next/navigation";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";

export default function NotAssignedPage() {
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
