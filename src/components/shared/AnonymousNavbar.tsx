"use client";

import Image from "next/image";

export default function AnonymousNavbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="items-start">
            <Image
              src="/beyond-happiness-logo.svg"
              alt="Beyond Happiness"
              width={200}
              height={80}
              className="h-12 w-auto"
              priority
            />
          </div>
          {/* Logo only - no user controls for anonymous surveys */}
        </div>
      </div>
    </nav>
  );
}
