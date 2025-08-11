"use client";

import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import useSWR, { mutate } from "swr";
import AdminNavbar from "@/components/shared/AdminNavbar";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

// Dynamically import SurveyJS Creator to avoid SSR issues
const SurveyCreatorComponent = dynamic(
  () =>
    import("survey-creator-react").then((mod) => mod.SurveyCreatorComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-lg">Loading survey creator...</div>
      </div>
    ),
  }
);

interface Survey {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  json: any;
}

// Error Boundary for SurveyJS Creator
class SurveyCreatorErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SurveyCreator Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">
              Survey Creator Error
            </div>
            <div className="text-gray-600 text-sm mb-4">
              There was an issue loading the survey creator. Please try
              refreshing the page.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  });

export default function AdminCreator() {
  const [creator, setCreator] = useState<any>(null);
  const [localSurvey, setLocalSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreatorReady, setIsCreatorReady] = useState(false);
  const [newSurveySettings, setNewSurveySettings] = useState({
    canTakeMultiple: false,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("surveyId") || searchParams.get("id");

  // Use SWR to fetch survey data with live updates
  const {
    data: survey,
    error: fetchError,
    isLoading,
  } = useSWR<Survey>(idParam ? `/api/surveys/${idParam}` : null, fetcher, {
    refreshInterval: 3000, // Refresh every 3 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem("admin");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    // Initialize creator only on client side
    const initCreator = async () => {
      try {
        // Check if we're in the browser
        if (typeof window === "undefined") return;

        const { SurveyCreator } = await import("survey-creator-react");

        const creatorOptions = {
          showLogicTab: true,
          isAutoSave: false,
          showJSONEditorTab: true,
          showTestSurveyTab: false,
        };

        const newCreator = new SurveyCreator(creatorOptions);

        // Configure save function
        newCreator.saveSurveyFunc = (
          no: number,
          callback: (num: number, status: boolean) => void
        ) => {
          callback(no, true);
        };

        // Initialize with empty survey to prevent undefined errors
        if (!newCreator.JSON || Object.keys(newCreator.JSON).length === 0) {
          newCreator.JSON = {
            title: "Untitled Survey",
            pages: [
              {
                name: "page1",
                elements: [],
              },
            ],
          };
        }

        // Wait a bit to ensure the creator is fully initialized
        setTimeout(() => {
          // Ensure creator has a valid survey object
          if (newCreator.survey) {
            setCreator(newCreator);
            setIsCreatorReady(true);
            console.log("SurveyCreator initialized successfully");
          } else {
            console.error("Creator survey object not properly initialized");
            setError("Failed to initialize survey creator properly");
          }
        }, 150);
      } catch (error) {
        console.error("Failed to initialize SurveyCreator:", error);
        setError("Failed to initialize survey creator");
      }
    };

    initCreator();
  }, [router]);

  // Initialize local survey state from SWR data (only once per survey)
  useEffect(() => {
    if (survey && (!localSurvey || localSurvey.id !== survey.id)) {
      console.log("Setting local survey:", survey.title, survey.id);
      setLocalSurvey(survey);
    }
  }, [survey, localSurvey]);

  // Keep creator JSON synced from loaded survey (only when both creator and survey are ready)
  useEffect(() => {
    if (survey && creator && isCreatorReady) {
      try {
        console.log(
          "Loading survey data into creator:",
          survey.title,
          survey.json
        );

        // Use a small delay to ensure creator is ready for JSON updates
        setTimeout(() => {
          try {
            // Ensure the survey JSON has required structure
            const validSurveyJson = {
              title: survey.json.title || "Untitled Survey",
              pages: survey.json.pages || [
                {
                  name: "page1",
                  elements: survey.json.elements || [],
                },
              ],
              ...survey.json,
            };

            creator.JSON = validSurveyJson;

            // Also update the creator's text if it exists
            if (creator.text) {
              creator.text = JSON.stringify(validSurveyJson, null, 2);
            }

            console.log("Survey data loaded successfully");
          } catch (error) {
            console.error("Error setting creator JSON:", error);
            setError("Failed to load survey data into creator");
          }
        }, 50);

        setLocalSurvey(survey);
      } catch (error) {
        console.error("Error loading survey into creator:", error);
        setError("Failed to load survey data");
      }
    }
  }, [survey, creator, isCreatorReady]);

  // Note: Title and description are now managed entirely by the SurveyJS Creator
  // No need to sync these fields since they're removed from Survey Settings

  // Note: No reverse sync needed since title and description are managed entirely by SurveyJS Creator

  const handleSave = async () => {
    if (!creator) return;

    setSaving(true);
    setError("");

    try {
      const adminData = JSON.parse(localStorage.getItem("admin") || "{}");
      const surveyJson = creator.JSON;

      const surveyData = {
        title: surveyJson.title || localSurvey?.title || "Untitled Survey",
        description: surveyJson.description || localSurvey?.description || "",
        canTakeMultiple:
          localSurvey?.canTakeMultiple ?? newSurveySettings.canTakeMultiple,
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
        const result = await response.json();
        // Trigger revalidation of all survey data
        await mutate(`/api/surveys/${idParam || result.id}`);
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

  if ((isLoading && idParam) || !isCreatorReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading survey creator...</div>
      </div>
    );
  }

  if (fetchError) {
    setError(fetchError.message);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
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
        <div className="mb-6 px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Survey Settings
            </h3>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    localSurvey
                      ? localSurvey.canTakeMultiple
                      : newSurveySettings.canTakeMultiple
                  }
                  onChange={(e) => {
                    if (localSurvey) {
                      setLocalSurvey({
                        ...localSurvey,
                        canTakeMultiple: e.target.checked,
                      });
                    } else {
                      setNewSurveySettings({
                        ...newSurveySettings,
                        canTakeMultiple: e.target.checked,
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Allow multiple submissions per user
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Survey Creator */}
        <div className="px-4 sm:px-0">
          <div
            className="bg-white shadow rounded-lg"
            style={{ height: "70vh" }}
          >
            {creator &&
            isCreatorReady &&
            (!idParam || (idParam && localSurvey)) ? (
              <SurveyCreatorErrorBoundary>
                <SurveyCreatorComponent
                  creator={creator}
                  key={`creator-${localSurvey?.id || "new"}-${isCreatorReady}`}
                />
              </SurveyCreatorErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-500 text-lg">
                    {!creator || !isCreatorReady
                      ? "Initializing survey creator..."
                      : idParam && !localSurvey
                      ? "Loading survey data..."
                      : "Survey creator ready"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
