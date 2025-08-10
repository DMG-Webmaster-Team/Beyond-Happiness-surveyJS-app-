"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function UserNavbar() {
  const router = useRouter();

  // Check session expiration every minute
  useEffect(() => {
    const checkSession = () => {
      const userData = localStorage.getItem("user");
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
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            {/* Logo */}
            <Image
              src="/next.svg"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center"></div>
        </div>
      </div>
    </nav>
  );
}
