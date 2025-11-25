"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  createSurveySession,
  setupAutoCleanup,
  getAllActiveSurveySessions,
  clearSurveySession,
} from "../../../lib/auth/survey-session";
import {
  initializeUserSession,
  clearAllSurveySubmissionStates,
} from "@/lib/session-storage";

interface User {
  id: string;
  email: string;
  phone: string;
  assignedSurveys: string[];
  submittedSurveys: {
    surveyId: string;
    submittedAt: string;
  }[];
  loginTime?: string;
}

export default function UserLogin() {
  const [contactInput, setContactInput] = useState("");
  const [inputType, setInputType] = useState<"email" | "phone" | "unknown">(
    "unknown"
  );
  const [inputValidation, setInputValidation] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: false });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState<
    "contact" | "otp" | "verifying-access" | "redirecting"
  >("contact");
  const [testModeOTP, setTestModeOTP] = useState(""); // For displaying OTP in test mode
  const [stableSurveyId, setStableSurveyId] = useState<string | null>(null);
  const [surveyType, setSurveyType] = useState<"regular" | "happiness" | null>(
    null
  );
  const [contactData, setContactData] = useState<{
    identifier: string;
    inputType: string;
  } | null>(null);
  const [isMultiTabRedirect, setIsMultiTabRedirect] = useState(false);

  // OTP input refs for modern UX
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Function to check if a survey is a happiness survey
  const checkSurveyType = async (surveyId: string) => {
    try {
      const response = await fetch(
        `/api/happiness/surveys/${surveyId}/access`,
        {
          credentials: "include", // Ensure cookies are sent
        }
      );
      if (response.ok) {
        setSurveyType("happiness");

      } else {
        setSurveyType("regular");

      }
    } catch (error) {

      setSurveyType("regular");
    }
  };

  // Check for multi-tab redirect
  useEffect(() => {
    const multiTab = searchParams.get("multiTab");
    if (multiTab === "true") {
      setIsMultiTabRedirect(true);

      // Clear all active sessions to force fresh login
      const activeSessions = getAllActiveSurveySessions();
      activeSessions.forEach((session) => {
        clearSurveySession(session.surveyId);
      });

      // Also clear all sessionStorage submission states
      clearAllSurveySubmissionStates();

    }
  }, [searchParams]);

  // Session management is now handled by the backend - no automatic logout

  // Capture/normalize surveyId from URL or restore from sessionStorage
  useEffect(() => {
    // Setup auto-cleanup for survey sessions
    setupAutoCleanup();

    // Get surveyId from URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    let sid =
      searchParams.get("surveyId") ??
      searchParams.get("redirect") ??
      urlParams.get("surveyId") ??
      urlParams.get("redirect");

    // Check if this is a happiness survey
    let type = searchParams.get("type") ?? urlParams.get("type");

    // If no surveyId in URL, try to restore from sessionStorage (logout recovery)
    if (!sid) {
      const storedSurveyId = sessionStorage.getItem("currentSurveyId");
      const storedSurveyType = sessionStorage.getItem("currentSurveyType");

      if (storedSurveyId) {

        // Redirect to include surveyId in URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("redirect", storedSurveyId);
        if (storedSurveyType === "happiness") {
          newUrl.searchParams.set("type", "happiness");
        }

        window.location.href = newUrl.toString();
        return; // Exit early, page will reload with correct URL
      }
    }

    if (type === "happiness") {
      setSurveyType("happiness");

    } else {
      // Fallback: check if this surveyId exists in happiness surveys
      if (sid) {
        checkSurveyType(sid);
      } else {
        setSurveyType("regular");
      }
    }

    if (sid) {
      setStableSurveyId(sid);

    } else {
      console.warn("⚠️ No surveyId found in URL parameters or sessionStorage");
    }

    // Debug logging

  }, [searchParams]);

  // Validation regex patterns
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^\+?\d{8,15}$/;

  // Validate input based on type
  const validateInput = (
    input: string,
    type: "email" | "phone" | "unknown"
  ): { isValid: boolean; message?: string } => {
    if (!input.trim()) {
      return {
        isValid: false,
        message: "Please enter your email or phone number",
      };
    }

    if (type === "email") {
      const isValid = EMAIL_REGEX.test(input.trim());
      return {
        isValid,
        message: isValid ? undefined : "Please enter a valid email address",
      };
    }

    if (type === "phone") {
      // Clean the input for validation (remove spaces, dashes, etc.)
      const cleanedInput = input.replace(/[\s\-\(\)]/g, "");
      const isValid = PHONE_REGEX.test(cleanedInput);
      return {
        isValid,
        message: isValid
          ? undefined
          : "Please enter a valid phone number (8-15 digits)",
      };
    }

    return {
      isValid: false,
      message: "Please enter a valid email address or phone number",
    };
  };

  // Detect input type (improved)
  const detectInputType = (input: string): "email" | "phone" | "unknown" => {
    const trimmed = input.trim();
    if (!trimmed) return "unknown";

    // Check if it looks like an email
    if (trimmed.includes("@")) return "email";

    // Check if it looks like a phone number (digits, +, spaces, dashes, parentheses)
    const phonePattern = /^[\+\d\s\-\(\)]+$/;
    if (phonePattern.test(trimmed)) {
      const digitsOnly = trimmed.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) return "phone";
    }

    return "unknown";
  };

  // Format phone to +20...
  const formatPhoneNumber = (input: string): string => {
    const digitsOnly = input.replace(/\D/g, "");
    if (input.startsWith("+20")) return input;
    if (digitsOnly.startsWith("20")) return `+${digitsOnly}`;
    if (digitsOnly.startsWith("0")) return `+20${digitsOnly.substring(1)}`;
    return `+20${digitsOnly}`;
  };

  const handleContactInputChange = (value: string) => {
    setContactInput(value);
    const detectedType = detectInputType(value);
    setInputType(detectedType);

    // Validate input in real-time
    const validation = validateInput(value, detectedType);
    setInputValidation(validation);

    // Clear any previous errors when user starts typing
    setError("");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use the validation function instead of manual checks
    const validation = validateInput(contactInput, inputType);
    if (!validation.isValid) {
      setError(
        validation.message || "Please enter a valid email or phone number"
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Format identifier
      let identifier = contactInput;
      if (inputType === "phone") identifier = formatPhoneNumber(contactInput);

      // Store contact context in component state (no sessionStorage)
      const newContactData = {
        identifier,
        inputType,
      };
      setContactData(newContactData);

      const method = inputType === "email" ? "email" : "sms";
      const requestData = {
        identifier,
        method,
        surveyId: stableSurveyId || undefined, // include if present
        surveyTitle: "Survey Access",
      };
      const cleanRequestData = Object.fromEntries(
        Object.entries(requestData).filter(([, v]) => v != null)
      );

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanRequestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpStep(true);
        setAuthStep("otp");
        setError("");
        if (data.message && data.message.toLowerCase().includes("test mode")) {
          setTestModeOTP(data.otp || "Check server console for OTP");
        }
      } else {
        setError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Modern OTP input handling with banking-style UX
  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of full OTP
    if (value.length > 1) {
      handleOtpPaste(value, index);
      return;
    }

    // Update single character
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next field if value entered
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste of full OTP string
  const handleOtpPaste = (pastedValue: string, startIndex: number = 0) => {
    // Extract only digits from pasted content
    const digits = pastedValue.replace(/\D/g, "");

    if (digits.length === 6) {
      // Full OTP pasted - distribute across all fields
      const newOtp = digits.split("").slice(0, 6);
      setOtp(newOtp);

      // Focus on the last field
      setTimeout(() => {
        otpRefs.current[5]?.focus();
      }, 0);
    } else if (digits.length > 0) {
      // Partial OTP - fill from current position
      const newOtp = [...otp];
      const digitsArray = digits.split("");

      for (let i = 0; i < digitsArray.length && startIndex + i < 6; i++) {
        newOtp[startIndex + i] = digitsArray[i];
      }

      setOtp(newOtp);

      // Focus on next empty field or last filled field
      const nextIndex = Math.min(startIndex + digitsArray.length, 5);
      setTimeout(() => {
        otpRefs.current[nextIndex]?.focus();
      }, 0);
    }
  };

  // Handle backspace behavior
  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const currentValue = otp[index];

      if (currentValue === "" && index > 0) {
        // Empty field - move to previous field and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);

        setTimeout(() => {
          otpRefs.current[index - 1]?.focus();
        }, 0);
      } else if (currentValue !== "") {
        // Field has value - clear it but stay on same field
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && !loading && !submitting) {
      handleOtpSubmit(e);
    }
  };

  // Handle input focus
  const handleOtpFocus = (index: number) => {
    // Select all text when focusing (mobile-friendly)
    setTimeout(() => {
      otpRefs.current[index]?.select();
    }, 0);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || submitting) return;

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    if (!contactData || !contactData.identifier) {
      setError("Please enter your contact information first");
      return;
    }

    if (!stableSurveyId) {
      setError("Survey ID is missing. Please refresh the page and try again.");
      setLoading(false);
      setSubmitting(false);
      return;
    }

    setLoading(true);
    setSubmitting(true);
    setError("");

    try {

      const requestBody = {
        [contactData.inputType]: contactData.identifier,
        otp: otpString,
        surveyId: stableSurveyId, // guaranteed by earlier guard
      };

      // 1) Verify OTP
      const otpResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent/received
        body: JSON.stringify({
          identifier: contactData.identifier,
          otp: otpString,
        }),
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok || !otpData.verified) {
        setError(otpData.error || "Invalid OTP");
        return;
      }

      // 2) Comprehensive access verification
      setAuthStep("verifying-access");
      const response = await fetch("/api/users/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent/received
        body: JSON.stringify({
          ...requestBody,
          skipOtpVerification: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      // Clear contact data from state
      setContactData(null);

      // Clear any previous errors
      setError("");

      // Initialize new user session in sessionStorage
      const sessionId = initializeUserSession(data.user.id);

      // ✅ ENHANCED: Handle access status and redirect appropriately
      setAuthStep("redirecting");

      const targetSurveyId = data.surveyId || stableSurveyId;
      if (!targetSurveyId) {
        setError("No survey ID found for redirection");
        return;
      }

      // ✅ Create survey-scoped session
      try {
        const sessionData = createSurveySession(
          targetSurveyId,
          {
            userId: data.user.id,
            email: data.user.email,
            phone: data.user.phone,
          },
          surveyType === "happiness" ? "happiness" : "regular",
          {
            sessionDurationMinutes: 30, // 30 minutes for active session
            retakeWindowMinutes: 60, // 1 hour for retake window
          }
        );

      } catch (sessionError) {
        console.error("⚠️ Failed to create survey session:", sessionError);
        // Continue with login flow even if session creation fails
      }

      // Clear any stale caches (no sessionStorage usage)

      // Clear any stale access denial caches for this survey
      if (targetSurveyId && surveyType === "happiness") {
        // Remove any cached access denials that might be stale after login
        const cacheKeys = Object.keys(localStorage).filter(
          (key) =>
            key.includes(`happiness:access:${targetSurveyId}`) ||
            key.includes(`access:denied:${targetSurveyId}`)
        );
        cacheKeys.forEach((key) => localStorage.removeItem(key));

      }

      // Redirect based on access status and survey type
      setTimeout(async () => {
        try {
          if (surveyType === "happiness") {
            // Call happiness access API to get canonical decision

            try {
              const accessResponse = await fetch(
                `/api/happiness/surveys/${targetSurveyId}/access`,
                { credentials: "include" } // Ensure cookies are sent
              );
              const accessData = await accessResponse.json();

              if (accessData.cooldown === true) {
                // Store previousResult and redirect to results
                localStorage.setItem(
                  `happiness:lastResult:${targetSurveyId}`,
                  JSON.stringify(accessData.previousResult)
                );
                router.push(
                  `/happiness/${targetSurveyId}/results?cooldown=true`
                );
              } else if (accessData.canAccess === true) {
                router.push(`/happiness/${targetSurveyId}`);
              } else if (accessData.assigned === false) {
                // Show the exact backend message for assignment issues
                setError(
                  accessData.message || "You are not assigned to this survey"
                );
                setAuthStep("contact"); // Return to contact step to show error
                return;
              } else {
                // Other access denied reasons
                setError(accessData.message || "Access denied to this survey");
                setAuthStep("contact"); // Return to contact step to show error
                return;
              }
            } catch (error) {
              console.error("❌ Error calling happiness access API:", error);
              // Fallback to regular survey flow
              router.push(`/happiness/${targetSurveyId}`);
            }
          } else if (data.access.canAccess) {
            // Direct access to regular survey

            router.push(`/user/survey/${targetSurveyId}`);
          } else {
            // Redirect to appropriate status page for regular surveys
            if (data.access.reason === "not-assigned") {
              router.push(
                `/user/status/not-assigned?surveyId=${encodeURIComponent(
                  targetSurveyId
                )}`
              );
            } else if (data.access.reason === "already-submitted") {
              router.push(
                `/user/status/already-submitted?surveyId=${encodeURIComponent(
                  targetSurveyId
                )}`
              );
            } else {
              router.push(
                `/user/status/access-denied?surveyId=${encodeURIComponent(
                  targetSurveyId
                )}`
              );
            }
          }
        } catch (err) {
          console.error("❌ router.push failed:", err);
          // Fallback to window.location
          if (surveyType === "happiness") {
            window.location.href = `/happiness/${targetSurveyId}`;
          } else if (data.access.canAccess) {
            window.location.href = `/user/survey/${targetSurveyId}`;
          } else {
            window.location.href = `/user/status/access-denied?surveyId=${targetSurveyId}`;
          }
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("An error occurred during verification");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/beyond-happiness-logo.svg"
            alt="Beyond Happiness"
            width={200}
            height={80}
            className="h-12 w-auto"
            priority
          />
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {authStep === "contact" && "Access Survey"}
            {authStep === "otp" && "Verify OTP"}
            {authStep === "verifying-access" && "Verifying Access..."}
            {authStep === "redirecting" && "Redirecting..."}
          </h2>
          <p className="text-gray-600 text-sm mb-8">
            {authStep === "contact" && " "}
            {authStep === "otp" && "Enter the 6-digit OTP sent to your contact"}
            {authStep === "verifying-access" &&
              "Checking your credentials and survey access permissions..."}
            {authStep === "redirecting" &&
              "Taking you to the appropriate page..."}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center mb-4">
              {error}
            </div>
          )}

          {isMultiTabRedirect && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg text-center mb-4">
              <div className="flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 mr-2 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <strong>Multiple Survey Sessions Detected</strong>
              </div>
              <p>
                You were logged out because you tried to access a survey while
                already having an active session in another tab. Please log in
                again to access the requested survey.
              </p>
            </div>
          )}

          {/* Optional notice if no surveyId yet */}

          {/* Progress Indicator */}
          {authStep !== "contact" && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "otp" ||
                    authStep === "verifying-access" ||
                    authStep === "redirecting"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "verifying-access" ||
                    authStep === "redirecting"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "redirecting" ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="text-xs text-gray-500">
                {authStep === "otp" && "Step 1/3: OTP Sent"}
                {authStep === "verifying-access" &&
                  "Step 2/3: Verifying Access"}
                {authStep === "redirecting" && "Step 3/3: Redirecting"}
              </div>
            </div>
          )}

          {/* Test Mode OTP Display */}
          {testModeOTP && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-yellow-800 text-sm font-medium">
                  🧪 Test Mode Active
                </span>
              </div>
              <p className="text-yellow-700 text-sm mb-2">
                Since email/SMS may not be configured, here&apos;s your OTP:
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 text-center">
                <span className="text-2xl font-mono font-bold text-yellow-800 tracking-wider">
                  {testModeOTP}
                </span>
              </div>
              <p className="text-yellow-600 text-xs mt-2">
                In production, this would be sent to your email or phone.
              </p>
            </div>
          )}
        </div>

        {!otpStep ? (
          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="contact"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email or Phone Number
                </label>
                <input
                  id="contact"
                  name="contact"
                  type="text"
                  autoComplete="off"
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-150 ease-in-out"
                  placeholder="Enter your email or phone number"
                  value={contactInput}
                  onChange={(e) => handleContactInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleContactSubmit(e);
                    }
                  }}
                />

                {/* Input validation feedback */}
                {contactInput && (
                  <div className="mt-2 text-sm">
                    {inputValidation.isValid ? (
                      <>
                        {inputType === "email" && (
                          <span className="text-green-600">
                            ✓ Valid email address
                          </span>
                        )}
                        {inputType === "phone" && (
                          <span className="text-green-600">
                            ✓ Valid phone number (will format as +20...)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-600">
                        {inputValidation.message ||
                          "Please enter a valid email or phone number"}
                      </span>
                    )}
                  </div>
                )}

                {/* Service availability */}
                <div className="text-center text-sm text-gray-500 mt-4">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">
                    <span className="text-green-600">✓ Email Available</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-green-600">✓ SMS Available</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !inputValidation.isValid}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-400 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        ) : authStep === "otp" ? (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Enter 6-digit OTP
              </label>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="w-12 h-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg font-semibold transition-all duration-200 hover:border-gray-400"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onFocus={() => handleOtpFocus(index)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData("text");
                      handleOtpPaste(pastedData, index);
                    }}
                    autoComplete="one-time-code"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setAuthStep("contact");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                  // Focus back to contact input
                  setTimeout(() => {
                    document.getElementById("contact")?.focus();
                  }, 100);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || submitting}
                className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-400 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {loading || submitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>
            </div>
          </form>
        ) : authStep === "verifying-access" ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-6"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Verifying Your Access
            </h3>
            <p className="text-gray-600 mb-4">
              Checking your credentials and survey access permissions
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        ) : authStep === "redirecting" ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-6"></div>
            <h3 className="text-lg font-medium text-green-600 mb-2">
              Access Verified!
            </h3>
            <p className="text-gray-600 mb-4">
              Taking you to the appropriate page...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full animate-pulse"
                style={{ width: "90%" }}
              ></div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
