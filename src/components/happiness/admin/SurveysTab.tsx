"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessSurvey {
  id: string;
  title: string;
  anonymous: boolean;
  retakeCooldownDays?: number;
  createdAt: number;
  updatedAt: number;
  resultCount: number;
}

export default function SurveysTab() {
  const [editingSurvey, setEditingSurvey] = useState<HappinessSurvey | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedSurveyId, setCopiedSurveyId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    "/api/happiness/surveys",
    fetcher
  );

  const handleSaveSurvey = async (surveyData: any) => {
    try {
      const method = editingSurvey ? "PUT" : "POST";
      const url = editingSurvey
        ? `/api/happiness/surveys/${editingSurvey.id}`
        : "/api/happiness/surveys";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (response.ok) {
        mutate();
        setEditingSurvey(null);
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to save survey");
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this survey? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(`/api/happiness/surveys/${surveyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to delete survey");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getSurveyUrl = (surveyId: string, anonymous: boolean) => {
    const baseUrl = window.location.origin;
    return anonymous
      ? `${baseUrl}/happiness/${surveyId}`
      : `${baseUrl}/user/survey/${surveyId}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-600">
          Failed to load surveys. Please try again.
        </div>
      </div>
    );
  }

  const surveys = data?.surveys || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Happiness Surveys ({surveys.length})
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-400 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Survey
        </button>
      </div>

      {/* Surveys List */}
      <div className="space-y-4">
        {surveys.map((survey: HappinessSurvey) => (
          <div
            key={survey.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {survey.title}
                  </h3>
                  <div className="flex gap-2">
                    {survey.anonymous && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Anonymous
                      </span>
                    )}

                    {(survey.retakeCooldownDays || 0) > 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {survey.retakeCooldownDays} day cooldown
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <strong>Results:</strong> {survey.resultCount} responses
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDate(survey.createdAt)}
                  </div>
                  <div>
                    <strong>Survey URL:</strong>
                    <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                      {getSurveyUrl(survey.id, survey.anonymous)}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          getSurveyUrl(survey.id, survey.anonymous)
                        );
                        setCopiedSurveyId(survey.id);
                        setTimeout(() => setCopiedSurveyId(null), 3000);
                      }}
                      className="ml-3 text-white  bg-blue-600 hover:bg-blue-800 text-md px-3 py-1 rounded-md"
                    >
                      {copiedSurveyId === survey.id
                        ? "Copied ..."
                        : "Copy Link"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setEditingSurvey(survey)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSurvey(survey.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                  title="Delete survey"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {surveys.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No happiness surveys created yet. Create your first survey to get
          started.
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddForm || editingSurvey) && (
        <SurveyModal
          survey={editingSurvey}
          onSave={handleSaveSurvey}
          onCancel={() => {
            setEditingSurvey(null);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

interface SurveyModalProps {
  survey: HappinessSurvey | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function SurveyModal({ survey, onSave, onCancel }: SurveyModalProps) {
  const [formData, setFormData] = useState({
    title: survey?.title || "",
    anonymous: survey?.anonymous || false,
    retakeCooldownDays: survey?.retakeCooldownDays || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert("Survey title is required");
      return;
    }

    onSave({
      title: formData.title.trim(),
      anonymous: formData.anonymous,
      retakeCooldownDays: formData.retakeCooldownDays,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b bg-blue-400 text-white">
          <h3 className="text-lg font-semibold text-black">
            {survey ? "Edit Survey" : "Create New Happiness Survey"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Survey Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter survey title..."
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.anonymous}
                onChange={(e) =>
                  setFormData({ ...formData, anonymous: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
              />
              <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                <strong>Anonymous Survey</strong>
                <div className="text-xs text-gray-500">
                  When enabled, anyone with the link can take this survey
                  without logging in. Assignment checks and one-time limits are
                  ignored.
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retake Cooldown (Days)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={formData.retakeCooldownDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retakeCooldownDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of days users must wait before retaking the survey (0 = no
              cooldown)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Happiness surveys use a fixed set of 40
              questions across 5 categories. The questions are standardized and
              cannot be customized per survey.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-400 hover:bg-blue-600 text-white rounded-md"
            >
              {survey ? "Update" : "Create"} Survey
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
