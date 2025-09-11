"use client";

import { useState } from "react";
import AdminNavbar from "@/components/shared/AdminNavbar";
import UserImport from "@/components/admin/UserImport";
import UserTable from "@/components/admin/UserTable";
import ManualUserCreation from "@/components/admin/ManualUserCreation";
import Modal from "@/components/shared/Modal";
import { motion } from "motion/react";

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"import" | "manage">("import");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
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
                <div className="space-y-6">
                  {/* Create User Button */}
                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-400 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Create User
                    </motion.button>
                  </div>
                  <UserTable refreshTrigger={refreshTrigger} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Create User Modal */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Create New User"
            maxWidth="2xl"
          >
            <ManualUserCreation
              onSuccess={() => {
                setShowCreateModal(false);
                // Refresh the user table
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </Modal>
        </div>
      </div>
    </div>
  );
}
