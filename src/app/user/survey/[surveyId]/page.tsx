"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import useSWR from "swr";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";

interface User {
  id: string;
  email: string;
  phone: string;
  assignedSurvey: string;
  hasSubmitted: boolean;
  loginTime?: string;
}

interface SurveyData {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  adminId: string;
  json: any;
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  });

export default function UserSurvey() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showContactForm, setShowContactForm] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpStep, setOtpStep] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  // Use SWR for live survey data fetching - only when user is authenticated
  const {
    data: survey,
    error: fetchError,
    isLoading,
  } = useSWR<SurveyData>(
    user && surveyId ? `/api/surveys/${surveyId}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Create survey model from the latest data
  const surveyModel = useMemo(() => {
    if (!survey?.json) return null;
    // Ensure canTakeMultiple defaults to false if not present
    const surveyData = {
      ...survey,
      canTakeMultiple: survey.canTakeMultiple ?? false,
    };
    return new Model(surveyData.json);
  }, [survey?.json]);

  useEffect(() => {
    // Check if user is already authenticated
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);

      // Check if user has no assigned survey
      if (!user.assignedSurvey) {
        setError("You are not assigned to any survey at the moment.");
        setLoading(false);
        return;
      }

      // Check if user is trying to access their assigned survey
      if (surveyId !== user.assignedSurvey) {
        setError("You don't have access to this survey");
        setLoading(false);
        return;
      }

      setShowContactForm(false);

      // Check if user has already submitted this survey (for one-time surveys)
      if (user.hasSubmitted && user.assignedSurvey === surveyId) {
        setSurveySubmitted(true);
      }
    } else {
      // User not authenticated, show contact form
      setShowContactForm(true);
      setLoading(false);
    }
  }, [surveyId]);

  // Set loading state based on authentication and data fetching
  useEffect(() => {
    if (user && isLoading) {
      setLoading(true);
    } else if (user && !isLoading) {
      setLoading(false);
    } else if (!user && !loading) {
      setLoading(false);
    }
  }, [user, isLoading, loading]);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || "Failed to load survey");
    }
  }, [fetchError]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      setOtpError("Please enter either email or phone number");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    // Store contact info in sessionStorage for OTP verification
    sessionStorage.setItem("userContact", JSON.stringify({ email, phone }));

    // Simulate OTP sending - in real app, this would send OTP
    setTimeout(() => {
      setOtpStep(true);
      setOtpLoading(false);
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const userContact = JSON.parse(
        sessionStorage.getItem("userContact") || "{}"
      );

      const response = await fetch("/api/users/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userContact.email || undefined,
          phone: userContact.phone || undefined,
          otp: otpString,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in localStorage with login timestamp
        const userWithLoginTime = {
          ...data.user,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem("user", JSON.stringify(userWithLoginTime));
        // Clear sessionStorage
        sessionStorage.removeItem("userContact");
        setUser(userWithLoginTime);
        setShowContactForm(false);
      } else {
        setOtpError(data.error || "Invalid OTP");
      }
    } catch (error) {
      setOtpError("An error occurred during verification");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSurveyComplete = async (sender: any) => {
    if (!user || !survey) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: survey.id,
          userId: user.id,
          adminId: survey.adminId,
          data: sender.data,
        }),
      });

      if (response.ok) {
        // Immediately show completion without refresh
        setSurveySubmitted(true);

        // Update user data in localStorage to reflect submission
        const updatedUser = {
          ...user,
          hasSubmitted: true,
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit survey");
      }
      handleExitSurvey();
    } catch (error) {
      setError("An error occurred while submitting the survey");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeSurvey = () => {
    setSurveySubmitted(false);
    // The survey model will be recreated automatically via useMemo when survey data changes
    // or we can trigger a manual clear if the model exists
    if (surveyModel) {
      surveyModel.clear();
    }
  };

  const handleExitSurvey = () => {
    localStorage.removeItem("user");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading survey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
        </div>
      </div>
    );
  }

  if (surveySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
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
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ✅ Survey submitted successfully.
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {survey?.canTakeMultiple
                ? "You can retake this survey if needed."
                : "Thank you for completing the survey."}
            </p>
          </div>

          {survey?.canTakeMultiple && (
            <div className="text-center">
              <button
                onClick={handleRetakeSurvey}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Retake Survey
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showContactForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {otpStep ? "Verify OTP" : "Access Survey"}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {otpStep
                ? "Enter the 6-digit OTP sent to your contact"
                : "Enter your contact information to access the survey"}
            </p>
          </div>

          {!otpStep ? (
            <form className="mt-8 space-y-6" onSubmit={handleContactSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {otpError && (
                <div className="text-red-600 text-sm text-center">
                  {otpError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {otpLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleOtpSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter 6-digit OTP
                </label>
                <div className="flex justify-center space-x-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  ))}
                </div>
              </div>

              {otpError && (
                <div className="text-red-600 text-sm text-center">
                  {otpError}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(false);
                    setOtp(["", "", "", "", "", ""]);
                    setOtpError("");
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!survey || !surveyModel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Survey not found</div>
        </div>
      </div>
    );
  }

  // Check if user has already submitted (for one-time surveys)
  if (!survey.canTakeMultiple && user?.hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">
            You have already submitted this survey
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center"></div>
        </div>

        {submitting && (
          <div className="mb-4 px-4 py-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            Submitting survey...
          </div>
        )}

        {/* Survey */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <Survey model={surveyModel} onComplete={handleSurveyComplete} />
          </div>
        </div>
      </div>
    </div>
  );
}
