"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Survey {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Admin {
  id: string;
  email: string;
  name: string;
}

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedSurveyId, setCopiedSurveyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem("admin");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    const admin = JSON.parse(adminData);
    setAdmin(admin);
    fetchSurveys(admin.id);
  }, [router]);

  const fetchSurveys = async (adminId: string) => {
    try {
      const response = await fetch(`/api/surveys?adminId=${adminId}`);
      if (response.ok) {
        const data = await response.json();
        setSurveys(data);
      } else {
        setError("Failed to fetch surveys");
      }
    } catch (error) {
      setError("An error occurred while fetching surveys");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    router.push("/admin/login");
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSurveys(surveys.filter((survey) => survey.id !== surveyId));
      } else {
        setError("Failed to delete survey");
      }
    } catch (error) {
      setError("An error occurred while deleting the survey");
    }
  };

  const copySurveyLink = async (surveyId: string) => {
    const surveyLink = `${window.location.origin}/user/survey/${surveyId}`;
    try {
      await navigator.clipboard.writeText(surveyLink);
      setCopiedSurveyId(surveyId);
      setTimeout(() => setCopiedSurveyId(null), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = surveyLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedSurveyId(surveyId);
      setTimeout(() => setCopiedSurveyId(null), 2000);
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
                Survey Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {admin?.name}
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/creator"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create New Survey
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Surveys List */}
        <div className="px-4 sm:px-0">
          {surveys.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No surveys yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first survey to get started
              </p>
              <Link
                href="/admin/creator"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Survey
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {surveys.map((survey) => (
                  <li key={survey.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {survey.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {survey.description}
                          </p>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span className="mr-4">
                              Type:{" "}
                              {survey.canTakeMultiple ? "Multiple" : "One-time"}
                            </span>
                            <span>
                              Created:{" "}
                              {new Date(survey.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/creator?surveyId=${survey.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/admin/preview/${survey.id}`}
                            target="_blank"
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Preview
                          </Link>
                          <button
                            onClick={() => copySurveyLink(survey.id)}
                            className="inline-flex items-center px-3 py-1 border border-green-300 text-sm font-medium rounded text-green-700 bg-white hover:bg-green-50"
                          >
                            {copiedSurveyId === survey.id ? "Copied!" : "Share"}
                          </button>
                          <Link
                            href={`/dashboard?surveyId=${survey.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Results
                          </Link>
                          <Link
                            href={`/pdf-export?surveyId=${survey.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            PDF
                          </Link>
                          <button
                            onClick={() => handleDeleteSurvey(survey.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
