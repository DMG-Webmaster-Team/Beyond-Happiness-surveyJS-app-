"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ResultsModal from "@/components/ResultsModal";
import AdminNavbar from "@/components/shared/AdminNavbar";
import { motion, AnimatePresence } from "motion/react";
import useSWR, { mutate } from "swr";
import { useDebounce } from "@/hooks/useDebounce";

// Dynamic imports for heavy components (client-only)
const AnalyticsModal = dynamic(() => import("@/components/AnalyticsModal"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
});

const TableViewModal = dynamic(
  () => import("@/components/analytics/TableViewModal"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
    ),
  }
);

interface Survey {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  companyId?: string;
  companyName?: string;
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
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isTableViewModalOpen, setIsTableViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  // Filter surveys based on search term
  const filteredSurveys = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return surveys;
    return surveys.filter(
      (survey) =>
        survey.title
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        survey.description
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())
    );
  }, [surveys, debouncedSearchTerm]);

  // Memoize the fetch function to prevent recreation
  const fetchSurveys = useCallback(async (adminId: string) => {
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
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        // Check if admin is logged in
        const adminData = localStorage.getItem("admin");
        if (!adminData) {
          if (mounted) {
            router.push("/admin/login");
          }
          return;
        }

        const admin = JSON.parse(adminData);
        if (mounted) {
          setAdmin(admin);
          await fetchSurveys(admin.id);
        }
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        if (mounted) {
          router.push("/admin/login");
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, [fetchSurveys, router]);

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

  // Don't render anything if still loading or no admin
  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render if there's an error
  if (error && surveys.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
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
                Survey Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {admin?.name}
              </p>
            </div>
            <div className="flex  space-x-4">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/admin/creator"
                className="inline-flex  items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90"
              >
                Create New Survey
              </motion.a>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search surveys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Surveys List */}
        <div className="px-4 sm:px-0">
          <AnimatePresence mode="wait">
            {surveys.length === 0 ? (
              <motion.div className="text-center py-12">
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
              </motion.div>
            ) : (
              <motion.div
                key="surveys-list"
                className="bg-white shadow overflow-hidden sm:rounded-md"
              >
                <ul className="divide-y divide-gray-200">
                  {filteredSurveys.map((survey, index) => (
                    <motion.li
                      key={survey.id}
                      whileHover={{ scale: 0.98 }}
                      whileTap={{ scale: 0.95 }}
                    >
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
                                {survey.canTakeMultiple
                                  ? "Multiple"
                                  : "One-time"}
                              </span>
                              {survey.companyName && (
                                <span className="mr-4">
                                  Company:{" "}
                                  <span className="font-medium text-brand-primary">
                                    {survey.companyName}
                                  </span>
                                </span>
                              )}
                              <span>
                                Created:{" "}
                                {new Date(
                                  survey.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link
                                href={`/admin/creator?surveyId=${survey.id}`}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link
                                href={`/admin/preview/${survey.id}`}
                                target="_blank"
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Preview
                              </Link>
                            </motion.div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => copySurveyLink(survey.id)}
                              className="inline-flex items-center px-3 py-1 border border-green-300 text-sm font-medium rounded text-green-700 bg-white hover:bg-green-50"
                            >
                              {copiedSurveyId === survey.id
                                ? "Copied!"
                                : "Share"}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedSurveyId(survey.id);
                                setIsResultsModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Results
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedSurveyId(survey.id);
                                setIsAnalyticsModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded text-blue-700 bg-white hover:bg-blue-50"
                            >
                              Analytics
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedSurveyId(survey.id);
                                setIsTableViewModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-indigo-300 text-sm font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50"
                            >
                              Dashboard Table
                            </motion.button>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link
                                href={`/pdf-export?surveyId=${survey.id}`}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                PDF
                              </Link>
                            </motion.div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteSurvey(survey.id)}
                              className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Modal */}
      {selectedSurveyId && (
        <ResultsModal
          surveyId={selectedSurveyId}
          isOpen={isResultsModalOpen}
          onClose={() => {
            setIsResultsModalOpen(false);
            setSelectedSurveyId(null);
          }}
        />
      )}

      {/* Analytics Modal */}
      {selectedSurveyId && (
        <AnalyticsModal
          surveyId={selectedSurveyId}
          isOpen={isAnalyticsModalOpen}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedSurveyId(null);
          }}
        />
      )}

      {/* Table View Modal */}
      {selectedSurveyId && (
        <TableViewModal
          surveyId={selectedSurveyId}
          surveyTitle={surveys.find((s) => s.id === selectedSurveyId)?.title}
          isOpen={isTableViewModalOpen}
          onClose={() => {
            setIsTableViewModalOpen(false);
            setSelectedSurveyId(null);
          }}
        />
      )}
    </div>
  );
}
