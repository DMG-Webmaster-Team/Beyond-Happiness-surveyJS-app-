"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export interface Survey {
  id: string;
  title: string;
  description?: string;
  type: "regular" | "happiness";
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date | string;
}

export interface SurveySelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  name?: string;
  disabledSurveys?: string[];
  multiple?: boolean;
  includeDeleted?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  required?: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SurveySelector({
  value = [],
  onChange,
  label,
  name,
  disabledSurveys = [],
  multiple = true,
  includeDeleted = false,
  placeholder = "Select surveys...",
  className = "",
  error,
  required = false,
}: SurveySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [surveys, setSurveys] = useState<{
    regularSurveys: Survey[];
    happinessSurveys: Survey[];
  }>({ regularSurveys: [], happinessSurveys: [] });
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch surveys
  useEffect(() => {
    const fetchSurveys = async () => {
      setLoading(true);
      setErrorState(null);

      try {
        const searchParam = debouncedSearchTerm
          ? `?search=${encodeURIComponent(debouncedSearchTerm)}`
          : "";
        const deletedParam = includeDeleted
          ? (searchParam ? "&" : "?") + "includeDeleted=true"
          : "";
        const url = `/api/surveys/selector${searchParam}${deletedParam}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setSurveys(data.data);
        } else {
          setErrorState(data.error || "Failed to fetch surveys");
        }
      } catch (error) {
        console.error("Error fetching surveys:", error);
        setErrorState("Failed to fetch surveys");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [debouncedSearchTerm, includeDeleted]);

  // Get selected surveys for display
  const selectedSurveys = useMemo(() => {
    const allSurveys = [...surveys.regularSurveys, ...surveys.happinessSurveys];
    return allSurveys.filter((survey) => value.includes(survey.id));
  }, [surveys, value]);

  // Handle selection
  const handleToggleSurvey = (surveyId: string) => {
    if (disabledSurveys.includes(surveyId)) return;

    if (multiple) {
      const newValue = value.includes(surveyId)
        ? value.filter((id) => id !== surveyId)
        : [...value, surveyId];
      onChange(newValue);
    } else {
      onChange(value.includes(surveyId) ? [] : [surveyId]);
      setIsOpen(false);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    onChange([]);
  };

  // Get display text for selected surveys
  const getDisplayText = () => {
    if (selectedSurveys.length === 0) {
      return placeholder;
    }

    if (selectedSurveys.length === 1) {
      return selectedSurveys[0].title;
    }

    return `${selectedSurveys.length} surveys selected`;
  };

  // Filter surveys based on search
  const filteredRegularSurveys = useMemo(() => {
    if (!debouncedSearchTerm) return surveys.regularSurveys;
    return surveys.regularSurveys.filter((survey) =>
      survey.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [surveys.regularSurveys, debouncedSearchTerm]);

  const filteredHappinessSurveys = useMemo(() => {
    if (!debouncedSearchTerm) return surveys.happinessSurveys;
    return surveys.happinessSurveys.filter((survey) =>
      survey.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [surveys.happinessSurveys, debouncedSearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error || errorState
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300"
          } ${disabledSurveys.length > 0 ? "bg-gray-50" : ""}`}
          disabled={loading}
        >
          <div className="flex items-center justify-between">
            <span
              className={`block truncate ${
                selectedSurveys.length === 0 ? "text-gray-500" : ""
              }`}
            >
              {loading ? "Loading..." : getDisplayText()}
            </span>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
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
                <input
                  type="text"
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Survey List */}
            <div className="max-h-64 overflow-y-auto">
              {errorState ? (
                <div className="p-3 text-sm text-red-600">{errorState}</div>
              ) : (
                <>
                  {/* Regular Surveys */}
                  {filteredRegularSurveys.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b">
                        Regular Surveys ({filteredRegularSurveys.length})
                      </div>
                      {filteredRegularSurveys.map((survey) => (
                        <div
                          key={survey.id}
                          onClick={() => handleToggleSurvey(survey.id)}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                            disabledSurveys.includes(survey.id)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {survey.title}
                            </div>
                            {survey.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {survey.description}
                              </div>
                            )}
                          </div>
                          {value.includes(survey.id) && (
                            <svg
                              className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Happiness Surveys */}
                  {filteredHappinessSurveys.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b">
                        Happiness Surveys ({filteredHappinessSurveys.length})
                      </div>
                      {filteredHappinessSurveys.map((survey) => (
                        <div
                          key={survey.id}
                          onClick={() => handleToggleSurvey(survey.id)}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                            disabledSurveys.includes(survey.id)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {survey.title}
                            </div>
                          </div>
                          {value.includes(survey.id) && (
                            <svg
                              className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Results */}
                  {filteredRegularSurveys.length === 0 &&
                    filteredHappinessSurveys.length === 0 &&
                    !loading && (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {debouncedSearchTerm
                          ? "No surveys found matching your search."
                          : "No surveys available."}
                      </div>
                    )}

                  {/* Loading State */}
                  {loading && (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      Loading surveys...
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with Clear All */}
            {multiple && selectedSurveys.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All ({selectedSurveys.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {(error || errorState) && (
        <p className="mt-1 text-sm text-red-600">{error || errorState}</p>
      )}

      {/* Selected Surveys Display (for multiple selection) */}
      {multiple && selectedSurveys.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-600 mb-1">Selected surveys:</div>
          <div className="flex flex-wrap gap-1">
            {selectedSurveys.map((survey) => (
              <span
                key={survey.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {survey.title}
                <button
                  type="button"
                  onClick={() => handleToggleSurvey(survey.id)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hidden input for form submission */}
      {name && (
        <input type="hidden" name={name} value={JSON.stringify(value)} />
      )}
    </div>
  );
}
