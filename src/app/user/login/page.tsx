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
    "contact" | "otp" | "authenticating" | "redirecting"
  >("contact");
  const [testModeOTP, setTestModeOTP] = useState(""); // For displaying OTP in test mode
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("redirect");

  // Clear any existing session when arriving at login
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
  }, []);

  // Function to detect input type and format phone numbers
  const detectInputType = (input: string): "email" | "phone" | "unknown" => {
    if (input.includes("@")) {
      return "email";
    }

    // Remove all non-digit characters and check if it's a phone number
    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return "phone";
    }

    return "unknown";
  };

  // Function to format phone number with Egyptian code
  const formatPhoneNumber = (input: string): string => {
    const digitsOnly = input.replace(/\D/g, "");

    // If it already starts with +20, return as is
    if (input.startsWith("+20")) {
      return input;
    }

    // If it starts with 20, add +
    if (digitsOnly.startsWith("20")) {
      return `+${digitsOnly}`;
    }

    // If it starts with 0, replace with +20
    if (digitsOnly.startsWith("0")) {
      return `+20${digitsOnly.substring(1)}`;
    }

    // Default: add +20 prefix
    return `+20${digitsOnly}`;
  };

  // Handle contact input changes
  const handleContactInputChange = (value: string) => {
    setContactInput(value);
    setInputType(detectInputType(value));
    setError(""); // Clear any previous errors
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
      // Format the identifier based on input type
      let identifier = contactInput;
      if (inputType === "phone") {
        identifier = formatPhoneNumber(contactInput);
      }

      // Store contact info temporarily
      sessionStorage.setItem(
        "userContact",
        JSON.stringify({
          [inputType]: identifier,
          inputType,
        })
      );

      // Send OTP via our service
      const method = inputType === "email" ? "email" : "sms"; // Ensure valid method

      // Debug: Log what we're sending
      const requestData = {
        identifier,
        method,
        surveyId: surveyId || undefined, // Ensure undefined instead of null
        surveyTitle: "Survey Access",
      };

      // Clean the data - remove any null/undefined values
      const cleanRequestData = Object.fromEntries(
        Object.entries(requestData).filter(([_, value]) => value != null)
      );

      console.log("🔍 Sending to /api/auth/send-otp:", cleanRequestData);

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanRequestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpStep(true);
        setAuthStep("otp");
        setError("");

        // Check if we're in test mode (no real email sent)
        if (data.message && data.message.includes("test mode")) {
          // Extract OTP from response if available
          setTestModeOTP(data.otp || "Check server console for OTP");
        }
      } else {
        setError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
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

    // Prevent double submission
    if (loading || submitting) {
      console.log("⚠️ Form already submitting, ignoring duplicate submission");
      return;
    }

    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    // Check if user has completed the contact step
    const userContact = JSON.parse(
      sessionStorage.getItem("userContact") || "{}"
    );

    if (!userContact[userContact.inputType]) {
      setError("Please enter your contact information first");
      return;
    }

    setLoading(true);
    setSubmitting(true);
    setError("");

    try {
      const userContact = JSON.parse(
        sessionStorage.getItem("userContact") || "{}"
      );

      // Debug logging
      console.log("🔍 userContact:", userContact);
      console.log("🔍 inputType:", userContact.inputType);
      console.log("🔍 identifier:", userContact[userContact.inputType]);
      console.log("🔍 otp:", otpString);
      console.log("🔍 surveyId:", surveyId);

      const requestBody = {
        [userContact.inputType]: userContact[userContact.inputType],
        otp: otpString,
        surveyId, // Pass the requested survey ID
      };

      console.log("🔍 Request body:", requestBody);

      // First verify OTP
      const otpResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: userContact[userContact.inputType],
          otp: otpString,
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok || !otpData.verified) {
        setError(otpData.error || "Invalid OTP");
        return;
      }

      // Show authenticating step
      setAuthStep("authenticating");

      // Now authenticate with the verified OTP (skip verification since already done)
      const response = await fetch("/api/users/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestBody,
          skipOtpVerification: true, // Skip OTP verification since already done
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear contact storage
        sessionStorage.removeItem("userContact");

        // Check if user has already submitted a one-time survey
        if (data.user.hasSubmitted && !data.survey?.canTakeMultiple) {
          setError("You have already submitted this survey");
          return;
        }

        // Show redirecting step
        setAuthStep("redirecting");

        // Redirect to the appropriate survey
        const targetSurveyId = surveyId || data.user.assignedSurveys[0];
        if (targetSurveyId) {
          // Add a small delay to show the redirecting state
          setTimeout(() => {
            router.push(`/user/survey/${targetSurveyId}`);
          }, 1000);
        } else {
          setError("No survey assigned to this user");
        }
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (error) {
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
            {authStep === "authenticating" && "Authenticating..."}
            {authStep === "redirecting" && "Redirecting to Survey..."}
          </h2>
          <p className="text-gray-600 text-sm mb-8">
            {authStep === "contact" &&
              "Enter your contact information to access the survey"}
            {authStep === "otp" && "Enter the 6-digit OTP sent to your contact"}
            {authStep === "authenticating" &&
              "Verifying your credentials and checking survey access..."}
            {authStep === "redirecting" &&
              "Preparing to redirect you to the survey..."}
          </p>

          {/* Progress Indicator */}
          {authStep !== "contact" && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "otp" ||
                    authStep === "authenticating" ||
                    authStep === "redirecting"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "authenticating" || authStep === "redirecting"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    authStep === "redirecting" ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                {authStep === "otp" && "Step 1/3: OTP Sent"}
                {authStep === "authenticating" && "Step 2/3: Verifying Access"}
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
                Since email is not configured, here&apos;s your OTP:
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 text-center">
                <span className="text-2xl font-mono font-bold text-yellow-800 tracking-wider">
                  {testModeOTP}
                </span>
              </div>
              <p className="text-yellow-600 text-xs mt-2">
                In production, this would be sent to your email
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
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-150 ease-in-out"
                  placeholder="Enter your email or phone number"
                  value={contactInput}
                  onChange={(e) => handleContactInputChange(e.target.value)}
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

                {/* Phone formatting info */}
                <div className="text-xs text-gray-500 mt-2 text-center">
                  💡 Phone numbers will automatically be formatted with Egyptian
                  country code (+20)
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
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
                    className="w-12 h-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-lg font-semibold"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

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
                className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
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
        ) : authStep === "authenticating" ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-primary mx-auto mb-6"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Verifying Your Access
            </h3>
            <p className="text-gray-600 mb-4">
              Please wait while we check your survey permissions
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-primary h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        ) : authStep === "redirecting" ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-6"></div>
            <h3 className="text-lg font-medium text-green-600 mb-2">
              Authentication Successful!
            </h3>
            <p className="text-gray-600 mb-4">
              Redirecting you to the survey...
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
