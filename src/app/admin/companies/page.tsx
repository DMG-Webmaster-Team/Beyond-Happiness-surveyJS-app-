"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, color } from "motion/react";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import AdminNavbar from "@/components/shared/AdminNavbar";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface CompanyFormData {
  name: string;
  description: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    description: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/companies", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      setCompanies(data.items || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch companies"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCompany
        ? `/api/companies/${editingCompany.id}`
        : "/api/companies";

      const method = editingCompany ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save company");
      }

      // Refresh companies list
      await fetchCompanies();

      // Reset form and close modal
      setFormData({ name: "", description: "" });
      setEditingCompany(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company");
    }
  };

  // Handle delete
  const handleDelete = (companyId: string) => {
    setCompanyToDelete(companyId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      const response = await fetch(`/api/companies/${companyToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      // Refresh companies list
      await fetchCompanies();
      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    }
  };

  const cancelDeleteCompany = () => {
    setShowDeleteConfirm(false);
    setCompanyToDelete(null);
  };

  // Handle edit
  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || "",
    });
    setIsModalOpen(true);
  };

  // Handle create new
  const handleCreate = () => {
    setEditingCompany(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  // Format timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-400 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="inline-flex svc-creator items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm  hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </motion.button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Companies List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {companies.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No companies
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new company.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-400 hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <motion.li
                    key={company.id}
                    whileHover={{ scale: 0.98 }}
                    className="px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {company.name}
                        </h3>
                        {company.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {company.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {formatDate(company.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(company)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(company.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70  z-40"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 1, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-center min-h-full p-4">
                <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingCompany ? "Edit Company" : "Add Company"}
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-black hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Company Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Description
                        </label>
                        <textarea
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-400 border hover:bg-blue-600 border-transparent rounded-md hover:bg-blue-600"
                      >
                        {editingCompany ? "Update" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone and will permanently remove the company and all associated data."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteCompany}
        onCancel={cancelDeleteCompany}
      />
    </div>
  );
}
