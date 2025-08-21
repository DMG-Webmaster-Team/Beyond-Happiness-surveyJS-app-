"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import CompanySelect from "@/components/shared/CompanySelect";

interface User {
  id: string;
  email: string;
  name?: string;
  status: string;
  companyId?: string;
  companyName?: string;
  createdAt: number;
  updatedAt: number;
  assignments?: Array<{
    surveyId: string;
    surveyTitle: string;
    status: string;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<{ id: string; title: string }[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );

  // Fetch users
  const fetchUsers = async (
    page = 1,
    query = searchQuery,
    status = statusFilter
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(query && { query }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch surveys
  const fetchSurveys = async () => {
    try {
      const response = await fetch("/api/surveys");
      if (response.ok) {
        const data = await response.json();
        // The API returns an array directly, not wrapped in a surveys property
        setSurveys(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
    }
  };

  // Load users and surveys on component mount and when filters change
  useEffect(() => {
    fetchUsers(1, searchQuery, statusFilter);
    fetchSurveys();
  }, [searchQuery, statusFilter]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, statusFilter);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, searchQuery, statusFilter);
  };

  // Handle survey selection change
  const handleSurveySelectionChange = (surveyId: string, checked: boolean) => {
    if (checked) {
      setSelectedSurveys((prev) => [...prev, surveyId]);
    } else {
      setSelectedSurveys((prev) => prev.filter((id) => id !== surveyId));
    }
  };

  // Initialize selected surveys when editing user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setSelectedSurveys(user.assignments?.map((a) => a.surveyId) || []);
    setSelectedCompanyId(user.companyId || null);
    setIsEditing(true);
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // Refresh users list
      fetchUsers(pagination.page, searchQuery, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Handle user update
  const handleUpdateUser = async (
    userData: Partial<User> & {
      surveyAssignments?: string[];
      companyId?: string | null;
    }
  ) => {
    if (!editingUser) return;

    try {
      // Extract survey assignments and company from userData
      const { surveyAssignments, companyId, ...userUpdateData } = userData;

      // Update user data including company
      const updateData = {
        ...userUpdateData,
        ...(companyId !== undefined && { companyId }),
      };

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      // Update survey assignments if provided
      if (surveyAssignments) {
        const assignmentResponse = await fetch(
          `/api/users/${editingUser.id}/assignments`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ surveyIds: surveyAssignments }),
          }
        );

        if (!assignmentResponse.ok) {
          const data = await assignmentResponse.json();
          throw new Error(data.error || "Failed to update survey assignments");
        }
      }

      // Refresh users list
      fetchUsers(pagination.page, searchQuery, statusFilter);
      setEditingUser(null);
      setIsEditing(false);
      setSelectedCompanyId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90"
          >
            Search
          </motion.button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No users found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Surveys
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                      </div>
                      {user.name && (
                        <div className="text-sm text-gray-500">{user.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.companyName ? (
                      <div className="text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {user.companyName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No company</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.assignments && user.assignments.length > 0 ? (
                      <div className="space-y-1">
                        {user.assignments.map((assignment, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {assignment.surveyTitle}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                assignment.status
                              )}`}
                            >
                              {assignment.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        No surveys assigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditUser(user)}
                        className="text-brand-primary hover:text-brand-primary/80"
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </motion.button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditing && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit User
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateUser({
                  name: formData.get("name") as string,
                  status: formData.get("status") as string,
                  companyId: selectedCompanyId || undefined,
                  surveyAssignments: selectedSurveys,
                });
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser.name || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingUser.status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <CompanySelect
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  allowNone={true}
                  placeholder="Choose a company (optional)"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Select a company for this user. Leave empty if no company
                  assignment is needed.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Assignments
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {surveys.map((survey) => (
                    <label
                      key={survey.id}
                      className="flex items-center space-x-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSurveys.includes(survey.id)}
                        onChange={(e) =>
                          handleSurveySelectionChange(
                            survey.id,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm text-gray-700">
                        {survey.title}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Select surveys to assign to this user. Currently assigned
                  surveys are pre-selected.
                </p>
              </div>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 bg-brand-primary text-white py-2 px-4 rounded-md hover:bg-brand-primary/90"
                >
                  Save Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingUser(null);
                    setSelectedCompanyId(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
