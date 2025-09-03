"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

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
        console.log("🎯 Happiness survey detected via API check");
      } else {
        setSurveyType("regular");
        console.log("🎯 Regular survey detected via API check");
      }
    } catch (error) {
      console.log("🎯 Defaulting to regular survey due to API error");
      setSurveyType("regular");
    }
  };

  // Session management is now handled by the backend - no automatic logout

  // Capture/normalize surveyId from URL only (no sessionStorage)
  useEffect(() => {
    // Get surveyId from URL parameters only
    const urlParams = new URLSearchParams(window.location.search);
    const sid =
      searchParams.get("surveyId") ??
      searchParams.get("redirect") ??
      urlParams.get("surveyId") ??
      urlParams.get("redirect");

    // Check if this is a happiness survey
    const type = searchParams.get("type") ?? urlParams.get("type");

    console.log("🔍 searchParams.get('type'):", searchParams.get("type"));
    console.log("🔍 urlParams.get('type'):", urlParams.get("type"));
    console.log("🔍 resolved type:", type);

    if (type === "happiness") {
      setSurveyType("happiness");
      console.log("🎯 Happiness survey detected via URL parameter");
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
      console.log("✅ Stable surveyId from URL:", sid);
    } else {
      console.warn("⚠️ No surveyId found in URL parameters");
    }

    // Debug logging
    console.log(
      "🔍 URL search params (searchParams):",
      Object.fromEntries(searchParams.entries())
    );
    console.log(
      "🔍 URL search params (urlParams):",
      Object.fromEntries(urlParams.entries())
    );
    console.log("🔍 stableSurveyId resolved:", sid);
    console.log("🔍 surveyType:", type || "regular");
    console.log("🔍 Raw type param (searchParams):", searchParams.get("type"));
    console.log("🔍 Raw type param (urlParams):", urlParams.get("type"));
    console.log("🔍 All search params:", Array.from(searchParams.entries()));
    console.log(
      "🔍 Full URL:",
      typeof window !== "undefined" ? window.location.href : ""
    );
  }, [searchParams]);

  // Detect input type
  const detectInputType = (input: string): "email" | "phone" | "unknown" => {
    if (input.includes("@")) return "email";
    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) return "phone";
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
    setInputType(detectInputType(value));
    setError("");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactInput.trim()) {
      setError("Please enter your email or phone number");
      return;
    }
    if (inputType === "unknown") {
      setError("Please enter a valid email address or phone number");
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

      console.log("🔍 Sending to /api/auth/send-otp:", cleanRequestData);

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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement | null;
      nextInput?.focus();
    }
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
      console.log("🔍 contactData:", contactData);
      console.log("🔍 inputType:", contactData.inputType);
      console.log("🔍 identifier:", contactData.identifier);
      console.log("🔍 otp:", otpString);
      console.log("🔍 stableSurveyId:", stableSurveyId);

      const requestBody = {
        [contactData.inputType]: contactData.identifier,
        otp: otpString,
        surveyId: stableSurveyId, // guaranteed by earlier guard
      };
      console.log("🔍 Request body:", requestBody);

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

      console.log("🔍 API Response:", data);
      console.log("🔍 Access verification complete:", data.access);

      // ✅ ENHANCED: Handle access status and redirect appropriately
      setAuthStep("redirecting");

      const targetSurveyId = data.surveyId || stableSurveyId;
      if (!targetSurveyId) {
        setError("No survey ID found for redirection");
        return;
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
        console.log("🧹 Cleared stale access caches:", cacheKeys);
      }

      // Redirect based on access status and survey type
      setTimeout(async () => {
        try {
          if (surveyType === "happiness") {
            // Call happiness access API to get canonical decision
            console.log("📊 Calling happiness access API after OTP success");
            try {
              const accessResponse = await fetch(
                `/api/happiness/surveys/${targetSurveyId}/access`,
                { credentials: "include" } // Ensure cookies are sent
              );
              const accessData = await accessResponse.json();

              console.log("📊 CROSS-TAB TEST - AccessCheck After OTP →", {
                canAccess: accessData.canAccess,
                cooldown: accessData.cooldown,
                cooldownRemaining: accessData.cooldownRemaining,
                assigned: accessData.assigned,
                requiresAuth: accessData.requiresAuth,
                surveyId: targetSurveyId,
                userId: data.user.id,
                timestamp: new Date().toISOString(),
              });

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
            console.log("✅ Access granted - redirecting to survey");
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
            {authStep === "contact" &&
              "Enter your contact information to access the survey"}
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

                {/* Input type indicator */}
                {contactInput && (
                  <div className="mt-2 text-sm">
                    {inputType === "email" && (
                      <span className="text-blue-600">
                        📧 Detected: Email address
                      </span>
                    )}
                    {inputType === "phone" && (
                      <span className="text-green-600">
                        📱 Detected: Phone number (will format as +20...)
                      </span>
                    )}
                    {inputType === "unknown" && (
                      <span className="text-yellow-600">
                        ⚠️ Please enter a valid email or phone number
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
              disabled={loading}
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
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    className="w-12 h-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg font-semibold"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading && !submitting) {
                        handleOtpSubmit(e);
                      }
                    }}
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
