"use client";

import { useEffect, useState } from "react";
import { useSurveySession } from "@/hooks/useSurveySession";

interface SurveyWithSessionProps {
  userId: string;
  surveyId: string;
  onComplete?: (results: any) => void;
  onAbandon?: () => void;
}

/**
 * Example component showing how to integrate survey session management
 * This ensures users always see the same survey configuration even if
 * the admin updates the survey while they're taking it.
 */
export default function SurveyWithSession({
  userId,
  surveyId,
  onComplete,
  onAbandon,
}: SurveyWithSessionProps) {
  const {
    session,
    isLoading,
    error,
    hasActiveSession,
    updateProgress,
    completeSession,
    abandonSession,
    getSurveyConfig,
    sessionProgress,
  } = useSurveySession({ userId, surveyId, autoCreate: true });

  const [currentAnswers, setCurrentAnswers] = useState<any>({});

  // Load previous progress when session is available
  useEffect(() => {
    if (session && sessionProgress) {
      setCurrentAnswers(sessionProgress);
    }
  }, [session, sessionProgress]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!hasActiveSession || Object.keys(currentAnswers).length === 0) {
      return;
    }

    const interval = setInterval(() => {
      updateProgress(currentAnswers).catch(console.error);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasActiveSession, currentAnswers, updateProgress]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...currentAnswers, [questionId]: answer };
    setCurrentAnswers(newAnswers);

    // Debounced progress update (you might want to add debouncing)
    updateProgress(newAnswers).catch(console.error);
  };

  const handleSurveyComplete = async (results: any) => {
    try {
      // Complete the session
      await completeSession();

      // Call the completion callback
      onComplete?.(results);
    } catch (error) {
      console.error("Error completing survey session:", error);
    }
  };

  const handleSurveyAbandon = async () => {
    try {
      // Abandon the session
      await abandonSession();

      // Call the abandon callback
      onAbandon?.();
    } catch (error) {
      console.error("Error abandoning survey session:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-600">Loading survey session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Survey Session Error
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasActiveSession) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              No Active Session
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Unable to create or find an active survey session.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const surveyConfig = getSurveyConfig();
  if (!surveyConfig) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">
          Failed to load survey configuration from session.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Session Info (for debugging - remove in production) */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
        <p>
          <strong>Session ID:</strong> {session?.id}
        </p>
        <p>
          <strong>Status:</strong> {session?.status}
        </p>
        <p>
          <strong>Survey Title:</strong> {surveyConfig.title}
        </p>
        <p>
          <strong>Created:</strong>{" "}
          {session?.createdAt
            ? new Date(session.createdAt).toLocaleString()
            : "N/A"}
        </p>
        <p>
          <strong>Progress Saved:</strong> {Object.keys(currentAnswers).length}{" "}
          answers
        </p>
      </div>

      {/* Survey Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {surveyConfig.title}
        </h1>
        {surveyConfig.description && (
          <p className="text-gray-600">{surveyConfig.description}</p>
        )}
      </div>

      {/* Survey Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* This is where you would integrate your actual survey component */}
        {/* For example, SurveyJS, custom form, etc. */}

        <div className="space-y-4">
          <p className="text-gray-700">
            <strong>Survey Configuration (Frozen at Session Creation):</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>
              Can Take Multiple: {surveyConfig.canTakeMultiple ? "Yes" : "No"}
            </li>
            <li>Anonymous: {surveyConfig.isAnonymous ? "Yes" : "No"}</li>
            <li>
              Questions: {surveyConfig.definition?.pages?.length || 0} pages
            </li>
          </ul>

          {/* Example question */}
          <div className="mt-6 p-4 border border-gray-200 rounded">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Example Question: How satisfied are you with this survey session
              system?
            </label>
            <select
              value={currentAnswers.satisfaction || ""}
              onChange={(e) =>
                handleAnswerChange("satisfaction", e.target.value)
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="">Select an option...</option>
              <option value="very-satisfied">Very Satisfied</option>
              <option value="satisfied">Satisfied</option>
              <option value="neutral">Neutral</option>
              <option value="dissatisfied">Dissatisfied</option>
              <option value="very-dissatisfied">Very Dissatisfied</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handleSurveyAbandon}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Abandon Survey
          </button>

          <button
            onClick={() => handleSurveyComplete(currentAnswers)}
            disabled={Object.keys(currentAnswers).length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-400 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Survey
          </button>
        </div>
      </div>
    </div>
  );
}

