"use client";

import { useState } from "react";
import AdminNavbar from "@/components/shared/AdminNavbar";
import UserImport from "@/components/admin/UserImport";
import UserTable from "@/components/admin/UserTable";
import { motion } from "motion/react";

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"import" | "manage">("import");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Import users from Excel/CSV files and manage user accounts
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab("import")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "import"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Import Users
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab("manage")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "manage"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Manage Users
              </motion.button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === "import" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <UserImport />
              </motion.div>
            )}

            {activeTab === "manage" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <UserTable />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
