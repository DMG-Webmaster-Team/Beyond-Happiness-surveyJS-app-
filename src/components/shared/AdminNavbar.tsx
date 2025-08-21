"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "motion/react";

interface Admin {
  id: string;
  email: string;
  name: string;
}

export default function AdminNavbar() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem("admin");
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    router.push("/admin/login");
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

          {/* Navigation Links */}
          <div className="hidden md:ml-6 md:flex md:space-x-8">
            <div className="relative">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/admin/dashboard"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                  pathname === "/admin/dashboard"
                    ? "text-brand-primary"
                    : "text-gray-700 hover:text-brand-primary"
                }`}
              >
                Dashboard
              </motion.a>
              {pathname === "/admin/dashboard" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"></div>
              )}
            </div>
            <div className="relative">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/admin/users"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                  pathname === "/admin/users"
                    ? "text-brand-primary"
                    : "text-gray-700 hover:text-brand-primary"
                }`}
              >
                Users
              </motion.a>
              {pathname === "/admin/users" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"></div>
              )}
            </div>
            <div className="relative">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/admin/companies"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                  pathname === "/admin/companies"
                    ? "text-brand-primary"
                    : "text-gray-700 hover:text-brand-primary"
                }`}
              >
                Companies
              </motion.a>
              {pathname === "/admin/companies" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"></div>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {admin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90"
              >
                Logout
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
