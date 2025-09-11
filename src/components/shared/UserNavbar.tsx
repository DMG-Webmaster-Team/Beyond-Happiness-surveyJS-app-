"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LogoutConfirmModal from "./LogoutConfirmModal";
import { handleLogoutWithSurveyPreservation } from "../../lib/auth/logout-utils";

export default function UserNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Single session check on mount
    const checkSession = async () => {
      try {
        setIsCheckingSession(true);
        const response = await fetch("/api/auth/check-session", {
          credentials: "include",
        });
        const data = await response.json();
        console.log("🔍 Initial session check:", {
          isAuthenticated: data.isAuthenticated,
          hasUser: !!data.user,
          timestamp: new Date().toISOString(),
          currentPath: window.location.pathname,
        });
        setIsLoggedIn(data.isAuthenticated);
      } catch (error) {
        console.error("Session check error:", error);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Clear UI state immediately
      setIsLoggedIn(false);
      setShowLogoutModal(false);

      // Use the centralized logout utility
      await handleLogoutWithSurveyPreservation(router);
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Fallback to basic logout
      setIsLoggedIn(false);
      setShowLogoutModal(false);
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
              {isCheckingSession ? (
                <div className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                  Loading...
                </div>
              ) : isLoggedIn ? (
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
              ) : null}
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
