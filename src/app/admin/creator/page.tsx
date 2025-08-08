"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import { ICreatorOptions } from "survey-creator-core";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

interface Survey {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  json: any;
}

export default function AdminCreator() {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("surveyId") || searchParams.get("id");

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem("admin");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    // Initialize creator
    const creatorOptions: ICreatorOptions = {
      showLogicTab: true,
      isAutoSave: false,
    };

    const newCreator = new SurveyCreator(creatorOptions);
    newCreator.saveSurveyFunc = (
      no: number,
      callback: (num: number, status: boolean) => void
    ) => {
      callback(no, true);
    };

    setCreator(newCreator);
  }, [router]);

  // Fetch the survey once we have both the id and the creator ready
  useEffect(() => {
    if (!creator) return;
    if (!idParam) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const response = await fetch(`/api/surveys/${idParam}`);
        if (response.ok) {
          const data = await response.json();
          setSurvey(data);
        } else {
          setError("Failed to fetch survey");
        }
      } catch (e) {
        setError("An error occurred while fetching the survey");
      } finally {
        setLoading(false);
      }
    })();
  }, [creator, idParam]);

  // Keep creator JSON synced from loaded survey
  useEffect(() => {
    if (survey && creator) {
      creator.JSON = survey.json;
      if (creator.survey) creator.survey.fromJSON(survey.json);
    }
  }, [survey, creator]);

  const handleSave = async () => {
    if (!creator) return;

    setSaving(true);
    setError("");

    try {
      const adminData = JSON.parse(localStorage.getItem("admin") || "{}");
      const surveyJson = creator.JSON;

      const surveyData = {
        title: surveyJson.title || "Untitled Survey",
        description: survey?.description || "",
        canTakeMultiple: survey?.canTakeMultiple ?? false,
        adminId: adminData.id,
        json: surveyJson,
      };

      let response: Response;
      if (idParam) {
        // Update existing survey
        response = await fetch(`/api/surveys/${idParam}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(surveyData),
        });
      } else {
        // Create new survey
        response = await fetch("/api/surveys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(surveyData),
        });
      }

      if (response.ok) {
        await response.json();
        router.push("/admin/dashboard");
      } else {
        setError("Failed to save survey");
      }
    } catch (error) {
      setError("An error occurred while saving the survey");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {idParam ? "Edit Survey" : "Create New Survey"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Use the SurveyJS Creator to design your survey
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Survey"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Survey Settings */}
        {survey && (
          <div className="mb-6 px-4 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Survey Settings
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={survey.title}
                    onChange={(e) =>
                      setSurvey({ ...survey, title: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    value={survey.description}
                    onChange={(e) =>
                      setSurvey({ ...survey, description: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={survey.canTakeMultiple}
                      onChange={(e) =>
                        setSurvey({
                          ...survey,
                          canTakeMultiple: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Allow multiple submissions per user
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Survey Creator */}
        <div className="px-4 sm:px-0">
          <div
            className="bg-white shadow rounded-lg"
            style={{ height: "70vh" }}
          >
            {creator && (!idParam || (idParam && survey)) && (
              <SurveyCreatorComponent creator={creator} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
