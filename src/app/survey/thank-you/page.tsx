"use client";

export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const surveyId = searchParams?.get("surveyId");
  const [surveyTitle, setSurveyTitle] = useState<string>("");

  useEffect(() => {
    // Optionally fetch survey title for display
    if (surveyId) {
      fetch(`/api/surveys/${surveyId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.title) {
            setSurveyTitle(data.title);
          }
        })
        .catch(() => {
          // Ignore errors, just show generic message
        });
    }
  }, [surveyId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnonymousNavbar />

      <div className="max-w-2xl mx-auto p-6 pt-40">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="text-green-500 text-6xl mb-6">✅</div>

          {/* Thank You Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>

          <p className="text-lg text-gray-600 mb-6">
            Your survey response has been submitted successfully.
          </p>
        </div>
      </div>
    </div>
  );
}
