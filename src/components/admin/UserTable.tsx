"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import CompanySelect from "@/components/shared/CompanySelect";
import SurveySelectorSeparate from "@/components/shared/SurveySelectorSeparate";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

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

interface UserTableProps {
  refreshTrigger?: number;
}

export default function UserTable({ refreshTrigger }: UserTableProps = {}) {
  const [users, setUsers] = useState<User[]>([]);
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
  const [selectedHappinessSurveys, setSelectedHappinessSurveys] = useState<
    string[]
  >([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
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
        _t: Date.now().toString(), // Cache busting parameter
      });

      const response = await fetch(`/api/users?${params}`, {
        cache: 'no-store', // Disable caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
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

  // Load users on component mount and when filters change
  useEffect(() => {
    fetchUsers(1, searchQuery, statusFilter);
  }, [searchQuery, statusFilter]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 Refreshing due to trigger change');
      // Clear current data first to show loading state
      setUsers([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
      fetchUsers(1, searchQuery, statusFilter);
    }
  }, [refreshTrigger]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, statusFilter);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, searchQuery, statusFilter);
  };

  // Initialize selected surveys when editing user
  const handleEditUser = async (user: User) => {
    setEditingUser(user);

    // Filter assignments by type to avoid pre-checking wrong surveys
    const regularAssignments =
      user.assignments?.filter((a: any) => a.type === "regular") || [];
    const happinessAssignments =
      user.assignments?.filter((a: any) => a.type === "happiness") || [];

    setSelectedSurveys(regularAssignments.map((a: any) => a.surveyId));
    setSelectedHappinessSurveys(
      happinessAssignments.map((a: any) => a.surveyId)
    );
    setSelectedCompanyId(user.companyId || null);

    setIsEditing(true);
  };

  // Handle user deletion
  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // Refresh users list
      fetchUsers(pagination.page, searchQuery, statusFilter);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  // Handle user update
  const handleUpdateUser = async (
    userData: Partial<User> & {
      surveyAssignments?: string[];
      happinessSurveyAssignments?: string[];
      companyId?: string | null;
    }
  ) => {
    if (!editingUser) return;

    try {
      // Extract survey assignments and company from userData
      const {
        surveyAssignments,
        happinessSurveyAssignments,
        companyId,
        ...userUpdateData
      } = userData;

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

      // Update regular survey assignments if provided
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

      // Update happiness survey assignments if provided
      if (happinessSurveyAssignments !== undefined) {
        // First, deactivate all existing happiness assignments for this user
        const existingAssignments = await fetch(
          `/api/happiness/assignments?userId=${editingUser.id}`
        );
        if (existingAssignments.ok) {
          const existingData = await existingAssignments.json();
          // Delete existing assignments (we'll recreate the ones that should exist)
          for (const assignment of existingData.assignments || []) {
            await fetch(`/api/happiness/assignments/${assignment.id}`, {
              method: "DELETE",
            });
          }
        }

        // Create new happiness survey assignments
        if (happinessSurveyAssignments.length > 0) {
          for (const surveyId of happinessSurveyAssignments) {
            const happinessAssignmentResponse = await fetch(
              `/api/happiness/assignments`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  surveyId: surveyId,
                  userIds: [editingUser.id],
                  assignedBy: "admin",
                  notes: "Updated via admin panel",
                }),
              }
            );

            if (!happinessAssignmentResponse.ok) {
              const data = await happinessAssignmentResponse.json();
              console.error(
                "Failed to create happiness assignment:",
                data.error
              );
            }
          }
        }
      }

      // Refresh users list
      fetchUsers(pagination.page, searchQuery, statusFilter);
      setEditingUser(null);
      setIsEditing(false);
      setSelectedCompanyId(null);
      setSelectedSurveys([]);
      setSelectedHappinessSurveys([]);
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
            className="px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-600"
          >
            Search
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              // Clear current data first to show loading state
              setUsers([]);
              setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              });
              fetchUsers(1, searchQuery, statusFilter);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
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
                        className="text-blue-400 hover:text-blue-600"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
            </div>
            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form
                id="edit-user-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateUser({
                    name: formData.get("name") as string,
                    status: formData.get("status") as string,
                    companyId: selectedCompanyId || undefined,
                    surveyAssignments: selectedSurveys,
                    happinessSurveyAssignments: selectedHappinessSurveys,
                  });
                }}
              >
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingUser.name || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingUser.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <CompanySelect
                    value={selectedCompanyId}
                    onChange={setSelectedCompanyId}
                    allowNone={true}
                    placeholder="Choose a company (optional)"
                    className="w-full"
                    disabled={true}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Select a company for this user. Leave empty if no company
                    assignment is needed.
                  </p>
                </div>

                <div className="mb-4">
                  <SurveySelectorSeparate
                    value={selectedSurveys}
                    onChange={setSelectedSurveys}
                    surveyType="regular"
                    label={
                      selectedCompanyId
                        ? "Additional Regular Surveys (Optional)"
                        : "Regular Surveys (Optional)"
                    }
                    placeholder="Select regular surveys..."
                    multiple={true}
                    includeDeleted={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCompanyId
                      ? "These regular surveys will be assigned in addition to any company surveys."
                      : "Select regular surveys to assign to this user."}
                  </p>
                </div>

                <div className="mb-4">
                  <SurveySelectorSeparate
                    value={selectedHappinessSurveys}
                    onChange={setSelectedHappinessSurveys}
                    surveyType="happiness"
                    label={
                      selectedCompanyId
                        ? "Additional Happiness Surveys (Optional)"
                        : "Happiness Surveys (Optional)"
                    }
                    placeholder="Select happiness surveys..."
                    multiple={true}
                    includeDeleted={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCompanyId
                      ? "These happiness surveys will be assigned in addition to any company surveys."
                      : "Select happiness surveys to assign to this user."}
                  </p>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  form="edit-user-form"
                  className="flex-1 bg-blue-400 text-white py-2 px-4 rounded-md hover:bg-blue-600"
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
                    setSelectedSurveys([]);
                    setSelectedHappinessSurveys([]);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user and all associated data."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteUser}
        onCancel={cancelDeleteUser}
      />
    </div>
  );
}
