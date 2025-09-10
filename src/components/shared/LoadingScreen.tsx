import React from "react";

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export default function LoadingScreen({
  message = "Loading...",
  showLogo = true,
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {showLogo && (
          <img
            src="/beyond-happiness-logo.svg"
            alt="logo"
            className="w-80 h-40 mx-auto mb-8"
          />
        )}
        <div className="text-xl text-gray-600 mb-4">{message}</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}
