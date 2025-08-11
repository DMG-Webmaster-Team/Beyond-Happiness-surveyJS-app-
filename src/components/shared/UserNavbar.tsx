"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function UserNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = sessionStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, []);

  // Check session expiration every minute
  useEffect(() => {
    const checkSession = () => {
      const userData = sessionStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);
      const loginTime = user.loginTime || new Date().toISOString(); // Fallback for existing sessions

      const sessionAge = Date.now() - new Date(loginTime).getTime();
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (sessionAge > thirtyMinutes) {
        handleLogout();
      }
    };

    // Check immediately and then every minute
    checkSession();
    const interval = setInterval(checkSession, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setIsLoggedIn(false);
    const surveyId = window.location.pathname.split("/").pop();
    router.push(`/user/survey/${surveyId}`);
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            {/* Logo */}
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
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
