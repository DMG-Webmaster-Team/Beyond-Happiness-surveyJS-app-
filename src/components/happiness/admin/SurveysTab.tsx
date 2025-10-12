"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import ConfirmDialog from "../../shared/ConfirmDialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessSurvey {
  id: string;
  title: string;
  anonymous: boolean;
  accessMode?: "login" | "anonymous" | "collect_info";
  retakeCooldownDays?: number;
  companyId?: string;
  companyName?: string;
  isActive?: boolean;
  isPublished?: boolean;
  createdAt: number;
  updatedAt: number;
  resultCount: number;
}

interface Company {
  id: string;
  name: string;
  description?: string;
}

export default function SurveysTab() {
  const [editingSurvey, setEditingSurvey] = useState<HappinessSurvey | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedSurveyId, setCopiedSurveyId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);

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

  const handleDeleteSurvey = (surveyId: string) => {
    setSurveyToDelete(surveyId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete) return;

    try {
      const response = await fetch(`/api/happiness/surveys/${surveyToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
        setShowDeleteConfirm(false);
        setSurveyToDelete(null);
      } else {
        const error = await response.json();
        console.error("Error deleting happiness survey:", error);
        // Keep dialog open to show error - could enhance with error state
        alert(`Error: ${error.error || "Failed to delete survey"}`);
      }
    } catch (error) {
      console.error("Failed to delete happiness survey:", error);
      alert("Failed to delete survey. Please try again.");
    }
  };

  const cancelDeleteSurvey = () => {
    setShowDeleteConfirm(false);
    setSurveyToDelete(null);
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
                    {/* Access Mode Badge */}
                    {survey.accessMode === "login" && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        🔒 Login Required
                      </span>
                    )}
                    {survey.accessMode === "anonymous" && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        🌐 Anonymous
                      </span>
                    )}
                    {survey.accessMode === "collect_info" && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        📋 Collect Info
                      </span>
                    )}
                    {/* Fallback for surveys without accessMode field */}
                    {!survey.accessMode && survey.anonymous && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        🌐 Anonymous
                      </span>
                    )}
                    {!survey.accessMode && !survey.anonymous && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        🔒 Login Required
                      </span>
                    )}

                    {(survey.retakeCooldownDays || 0) > 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {survey.retakeCooldownDays} day cooldown
                      </span>
                    )}

                    {survey.isActive === false && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Inactive
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
                  {survey.companyName && (
                    <div>
                      <strong>Company:</strong> {survey.companyName}
                    </div>
                  )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Happiness Survey"
        message="Are you sure you want to permanently delete this happiness survey? This action cannot be undone and will remove all associated results."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSurvey}
        onCancel={cancelDeleteSurvey}
      />
    </div>
  );
}

interface SurveyModalProps {
  survey: HappinessSurvey | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function SurveyModal({ survey, onSave, onCancel }: SurveyModalProps) {
  // Determine initial accessMode from survey data
  const getInitialAccessMode = () => {
    if (survey?.accessMode) return survey.accessMode;
    if (survey?.anonymous) return "anonymous";
    return "login";
  };
  
  const [formData, setFormData] = useState({
    title: survey?.title || "",
    accessMode: getInitialAccessMode(),
    anonymous: survey?.anonymous || false,
    retakeCooldownDays: survey?.retakeCooldownDays || 0,
    companyId: survey?.companyId || "",
    isActive: survey?.isActive !== undefined ? survey.isActive : true,
  });

  // Fetch companies for dropdown
  const { data: companiesData, error: companiesError } = useSWR(
    "/api/companies",
    fetcher
  );
  const companies = companiesData?.items || [];

  // Fetch surveys for the selected company (for scrollable list)
  const { data: surveysData } = useSWR(
    formData.companyId ? `/api/surveys?companyId=${formData.companyId}` : null,
    fetcher
  );
  const companySurveys = surveysData?.items || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert("Survey title is required");
      return;
    }

    // Find selected company name
    const selectedCompany = companies.find(
      (c: Company) => c.id === formData.companyId
    );

    onSave({
      title: formData.title.trim(),
      accessMode: formData.accessMode,
      anonymous: formData.accessMode === "anonymous" || formData.accessMode === "collect_info",
      retakeCooldownDays: formData.retakeCooldownDays,
      companyId: formData.companyId || null,
      companyName: selectedCompany?.name || null,
      isActive: formData.isActive,
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Company (Optional)
            </label>
            <select
              value={formData.companyId}
              onChange={(e) =>
                setFormData({ ...formData, companyId: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">No company assigned</option>
              {companies.map((company: Company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {companiesError && (
              <p className="text-sm text-red-600 mt-1">
                Failed to load companies
              </p>
            )}
          </div>

          {/* Show assigned surveys for selected company */}
          {formData.companyId && companySurveys.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Surveys Assigned to This Company
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
                {companySurveys.map((survey: any) => (
                  <div key={survey.id} className="text-sm text-gray-600 py-1">
                    • {survey.title}{" "}
                    {survey.isAnonymous ? "(Anonymous)" : "(Authenticated)"}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Mode *
            </label>
            
            {/* Login Mode */}
            <div className="flex items-start">
              <input
                type="radio"
                id="mode-login"
                name="accessMode"
                value="login"
                checked={formData.accessMode === "login"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessMode: "login",
                  })
                }
                className="mt-1 border-gray-300 text-blue-400 focus:ring-blue-400"
              />
              <label htmlFor="mode-login" className="ml-2 text-sm text-gray-700 flex-1">
                <strong>Login Required</strong>
                <div className="text-xs text-gray-500 mt-1">
                  Users must log in and be assigned to this survey. Standard authentication and assignment checks apply.
                </div>
              </label>
            </div>
            
            {/* Anonymous Mode */}
            <div className="flex items-start">
              <input
                type="radio"
                id="mode-anonymous"
                name="accessMode"
                value="anonymous"
                checked={formData.accessMode === "anonymous"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessMode: "anonymous",
                    retakeCooldownDays: 0, // Reset cooldown for anonymous
                  })
                }
                className="mt-1 border-gray-300 text-blue-400 focus:ring-blue-400"
              />
              <label htmlFor="mode-anonymous" className="ml-2 text-sm text-gray-700 flex-1">
                <strong>Anonymous (No Data Collection)</strong>
                <div className="text-xs text-gray-500 mt-1">
                  Anyone with the link can take this survey without logging in. No user data is collected. Assignment checks and cooldowns are ignored.
                </div>
              </label>
            </div>
            
            {/* Collect Info Mode */}
            <div className="flex items-start">
              <input
                type="radio"
                id="mode-collect-info"
                name="accessMode"
                value="collect_info"
                checked={formData.accessMode === "collect_info"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessMode: "collect_info",
                    retakeCooldownDays: 0, // Reset cooldown for collect_info
                  })
                }
                className="mt-1 border-gray-300 text-blue-400 focus:ring-blue-400"
              />
              <label htmlFor="mode-collect-info" className="ml-2 text-sm text-gray-700 flex-1">
                <strong>Collect User Information</strong>
                <div className="text-xs text-gray-500 mt-1">
                  Anyone with the link can take this survey without logging in. Users can optionally share their contact details (name, email, phone, gender, age). Assignment checks and cooldowns are ignored.
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
              value={formData.accessMode === "login" ? formData.retakeCooldownDays : 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retakeCooldownDays: parseInt(e.target.value) || 0,
                })
              }
              disabled={formData.accessMode !== "login"}
              className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                formData.accessMode !== "login"
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : ""
              }`}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.accessMode !== "login"
                ? "Cooldown is only available for login-required surveys"
                : "Number of days users must wait before retaking the survey (0 = no cooldown)"}
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              <strong>Active (available for assignment)</strong>
              <div className="text-xs text-gray-500">
                When unchecked, this survey will be hidden from assignment forms
                but remain accessible to users who already have it assigned.
              </div>
            </label>
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
