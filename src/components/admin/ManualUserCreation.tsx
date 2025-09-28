"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import CompanySelect from "@/components/shared/CompanySelect";
import {
  ErrorCode,
  validateEgyptianPhone,
  validateEmail,
} from "@/utils/errors";
import ErrorNotification from "@/components/shared/ErrorNotification";

interface Survey {
  id: string;
  title: string;
  isAnonymous?: boolean;
}

interface HappinessSurvey {
  id: string;
  title: string;
  anonymous: boolean;
}

interface CreateUserData {
  name?: string;
  email: string;
  phone?: string;
  companyId?: string;
  surveyIds?: string[];
  happinessSurveyIds?: string[];
}

interface ManualUserCreationProps {
  onSuccess?: () => void;
}

export default function ManualUserCreation({
  onSuccess,
}: ManualUserCreationProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    name: "",
    email: "",
    phone: "",
    companyId: "",
    surveyIds: [],
    happinessSurveyIds: [],
  });

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [happinessSurveys, setHappinessSurveys] = useState<HappinessSurvey[]>(
    []
  );
  const [companySurveys, setCompanySurveys] = useState<Survey[]>([]);
  const [companyHappinessSurveys, setCompanyHappinessSurveys] = useState<
    HappinessSurvey[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorCode | string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch surveys and happiness surveys
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const [surveysRes, happinessRes] = await Promise.all([
          fetch("/api/surveys"),
          fetch("/api/happiness/surveys"),
        ]);

        if (surveysRes.ok) {
          const surveysData = await surveysRes.json();
          setSurveys(surveysData.items || []);
        }

        if (happinessRes.ok) {
          const happinessData = await happinessRes.json();
          setHappinessSurveys(happinessData.surveys || []);
        }
      } catch (error) {
        console.error("Error fetching surveys:", error);
      }
    };

    fetchSurveys();
  }, []);

  // Fetch company-specific surveys when company changes
  useEffect(() => {
    if (formData.companyId) {
      const fetchCompanySurveys = async () => {
        try {
          const [surveysRes, happinessRes] = await Promise.all([
            fetch(`/api/companies/${formData.companyId}/surveys`),
            fetch(`/api/companies/${formData.companyId}/happiness-surveys`),
          ]);

          let surveysData = null;
          let happinessData = null;

          if (surveysRes.ok) {
            surveysData = await surveysRes.json();
            setCompanySurveys(surveysData.surveys || []);
          }

          if (happinessRes.ok) {
            happinessData = await happinessRes.json();
            setCompanyHappinessSurveys(happinessData.surveys || []);
          }

          // Auto-assign company surveys
          const companySurveyIds = (surveysData?.surveys || []).map(
            (s: Survey) => s.id
          );
          const companyHappinessIds = (happinessData?.surveys || []).map(
            (s: HappinessSurvey) => s.id
          );

          setFormData((prev) => ({
            ...prev,
            surveyIds: companySurveyIds,
            happinessSurveyIds: companyHappinessIds,
          }));
        } catch (error) {
          console.error("Error fetching company surveys:", error);
        }
      };

      fetchCompanySurveys();
    } else {
      setCompanySurveys([]);
      setCompanyHappinessSurveys([]);
      setFormData((prev) => ({
        ...prev,
        surveyIds: [],
        happinessSurveyIds: [],
      }));
    }
  }, [formData.companyId]);

  const validateForm = (): boolean => {
    setError(null);
    console.log("🔍 Validating form...");

    // Email is required
    if (!formData.email) {
      console.log("❌ Email is required");
      setError("Email address is required");
      return false;
    }

    // Validate email format
    if (!validateEmail(formData.email)) {
      console.log("❌ Invalid email format:", formData.email);
      setError("Please enter a valid email address");
      return false;
    }

    // Validate phone if provided
    if (formData.phone && !validateEgyptianPhone(formData.phone)) {
      console.log("❌ Invalid phone format:", formData.phone);
      setError(
        "Please enter a valid Egyptian phone number (010, 011, 012, or 015 followed by 8 digits)"
      );
      return false;
    }

    // Must have at least one assignment: company OR surveys
    const hasCompany = !!formData.companyId;
    const hasSurveys =
      (formData.surveyIds?.length || 0) > 0 ||
      (formData.happinessSurveyIds?.length || 0) > 0;

    console.log("🏢 Has company:", hasCompany, formData.companyId);
    console.log("📋 Has surveys:", hasSurveys, {
      regular: formData.surveyIds?.length || 0,
      happiness: formData.happinessSurveyIds?.length || 0,
    });

    if (!hasCompany && !hasSurveys) {
      console.log("❌ No assignments selected");
      setError(
        "Please select at least one of the following: Company, Regular Survey, or Happiness Survey."
      );
      return false;
    }

    console.log("✅ Form validation passed");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 Form submission started");
    console.log("📝 Form data:", formData);

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const requestBody = {
        name: formData.name || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        companyId: formData.companyId || undefined,
        surveyAssignments: formData.surveyIds || [],
        happinessSurveyAssignments: formData.happinessSurveyIds || [],
      };

      console.log("📤 Request body:", requestBody);

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);

      const result = await response.json();
      console.log("📥 Response data:", result);

      if (response.ok) {
        setSuccess(`User created successfully! ${result.message || ""}`);
        console.log("✅ User created successfully");

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          companyId: "",
          surveyIds: [],
          happinessSurveyIds: [],
        });

        // Call onSuccess callback if provided
        if (onSuccess) {
          console.log("🔄 Calling onSuccess callback");
          setTimeout(() => {
            onSuccess();
          }, 1500); // Give time to show success message
        }
      } else {
        const errorMessage = result.error || "Failed to create user";
        console.log("❌ API error:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("💥 Network error creating user:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      console.log("🏁 Form submission completed");
    }
  };

  const handleCompanyChange = (companyId: string | null) => {
    setFormData((prev) => ({
      ...prev,
      companyId: companyId || "",
    }));
  };

  const handleSurveyToggle = (
    surveyId: string,
    type: "regular" | "happiness"
  ) => {
    if (type === "regular") {
      setFormData((prev) => ({
        ...prev,
        surveyIds: prev.surveyIds?.includes(surveyId)
          ? prev.surveyIds.filter((id) => id !== surveyId)
          : [...(prev.surveyIds || []), surveyId],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        happinessSurveyIds: prev.happinessSurveyIds?.includes(surveyId)
          ? prev.happinessSurveyIds.filter((id) => id !== surveyId)
          : [...(prev.happinessSurveyIds || []), surveyId],
      }));
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Add a single user manually with survey assignments
        </p>
      </div>

      {error && (
        <ErrorNotification error={error} onClose={() => setError(null)} />
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (Required) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="user@example.com"
            required
          />
        </div>

        {/* Name (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name (Optional)
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="John Doe"
          />
        </div>

        {/* Phone (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="01012345678"
            pattern="^01[0-2,5]{1}[0-9]{8}$"
          />
          <p className="text-xs text-gray-500 mt-1">
            Egyptian phone format: 010, 011, 012, or 015 followed by 8 digits
          </p>
        </div>

        {/* Company Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company (Optional)
          </label>
          <CompanySelect
            value={formData.companyId || null}
            onChange={handleCompanyChange}
            placeholder="Select a company..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Selecting a company will auto-assign all surveys linked to that
            company
          </p>
        </div>

        {/* Company Surveys (Auto-assigned) */}
        {formData.companyId &&
          (companySurveys.length > 0 || companyHappinessSurveys.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Assigned Surveys from Company
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                {companySurveys.length > 0 && (
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Regular Surveys:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {companySurveys.map((survey) => (
                        <li key={survey.id}>• {survey.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {companyHappinessSurveys.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Happiness Surveys:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {companyHappinessSurveys.map((survey) => (
                        <li key={survey.id}>• {survey.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Manual Survey Assignment */}
        {!formData.companyId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manual Survey Assignment
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select individual surveys to assign to this user
            </p>

            {/* Regular Surveys */}
            {surveys.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Regular Surveys:
                </h4>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {surveys.map((survey) => (
                    <label key={survey.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={
                          formData.surveyIds?.includes(survey.id) || false
                        }
                        onChange={() =>
                          handleSurveyToggle(survey.id, "regular")
                        }
                        className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {survey.title}{" "}
                        {survey.isAnonymous ? "(Anonymous)" : "(Authenticated)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Happiness Surveys */}
            {happinessSurveys.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Happiness Surveys:
                </h4>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {happinessSurveys.map((survey) => (
                    <label key={survey.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={
                          formData.happinessSurveyIds?.includes(survey.id) ||
                          false
                        }
                        onChange={() =>
                          handleSurveyToggle(survey.id, "happiness")
                        }
                        className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {survey.title}{" "}
                        {survey.anonymous ? "(Anonymous)" : "(Authenticated)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                phone: "",
                companyId: "",
                surveyIds: [],
                happinessSurveyIds: [],
              });
              setError(null);
              setSuccess(null);
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-blue-400 hover:bg-blue-600 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create User"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
