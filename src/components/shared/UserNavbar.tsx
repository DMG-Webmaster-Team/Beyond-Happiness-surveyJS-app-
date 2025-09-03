"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LogoutConfirmModal from "./LogoutConfirmModal";

export default function UserNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Check if user is logged in via cookie
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check-session", {
          credentials: "include", // Ensure cookies are sent
        });
        const data = await response.json();
        console.log("🔍 CROSS-TAB TEST - Session check:", {
          isAuthenticated: data.isAuthenticated,
          hasUser: !!data.user,
          timestamp: new Date().toISOString(),
          currentPath: window.location.pathname,
        });
        setIsLoggedIn(data.isAuthenticated);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  // Check session expiration every minute (with delay to prevent race conditions)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check-session", {
          credentials: "include", // Ensure cookies are sent
        });
        const data = await response.json();

        // Only logout if we were previously logged in and now we're not
        // This prevents logout on temporary API errors
        if (!data.isAuthenticated && isLoggedIn) {
          console.log("🔍 Session expired, triggering logout");
          handleLogoutConfirm();
        }
      } catch (error) {
        console.error("Session check error:", error);
        // Don't logout on API errors - just log the error
      }
    };

    // Add 2-second delay before first check to prevent race conditions
    const initialDelay = setTimeout(() => {
      checkSession();
    }, 2000);

    // Then check every minute
    const interval = setInterval(checkSession, 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Get current survey ID and type from URL to preserve context
      const currentPath = window.location.pathname;
      const happinessMatch = currentPath.match(/\/happiness\/([^\/]+)/);
      const regularMatch = currentPath.match(/\/user\/survey\/([^\/]+)/);

      let surveyId: string | null = null;
      let surveyType: string | null = null;

      if (happinessMatch) {
        surveyId = happinessMatch[1];
        surveyType = "happiness";
      } else if (regularMatch) {
        surveyId = regularMatch[1];
        surveyType = "regular";
      }

      console.log("🔄 Logout context:", {
        currentPath,
        surveyId,
        surveyType,
        happinessMatch: !!happinessMatch,
        regularMatch: !!regularMatch,
      });

      // Call logout API with survey context
      const logoutBody = surveyId ? { surveyId } : {};
      const logoutResponse = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logoutBody),
      });

      const logoutData = await logoutResponse.json();
      console.log("🔄 Logout response:", logoutData);

      // Clear any remaining session data
      setIsLoggedIn(false);
      setShowLogoutModal(false);

      // Redirect with survey context preserved
      if (surveyId && surveyType === "happiness") {
        const redirectUrl = `/user/login?redirect=${surveyId}&type=happiness`;
        console.log("🔄 Redirecting to:", redirectUrl);
        router.push(redirectUrl);
      } else if (surveyId && surveyType === "regular") {
        const redirectUrl = `/user/login?redirect=${surveyId}`;
        console.log("🔄 Redirecting to:", redirectUrl);
        router.push(redirectUrl);
      } else {
        console.log("🔄 Redirecting to default login");
        router.push("/user/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback redirect on error
      router.push("/user/login");
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/beyond-happiness-logo.svg"
                alt="Beyond Happiness"
                width={200}
                height={80}
                className="h-12 w-auto"
                priority
              />
            </div>
            <div className="flex items-center">
              {isLoggedIn && (
                <button
                  onClick={handleLogoutClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-400 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
}
