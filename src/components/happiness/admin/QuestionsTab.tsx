"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessQuestion {
  id: number;
  text: string;
  category: string;
  values: number[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function QuestionsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingQuestion, setEditingQuestion] =
    useState<HappinessQuestion | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/happiness/questions?search=${searchTerm}&category=${categoryFilter}&isActive=${activeFilter}`,
    fetcher
  );

  const categories = [
    "Meaning",
    "Delight",
    "Freedom",
    "Engagement",
    "Vitality",
  ];

  const handleSaveQuestion = async (questionData: any) => {
    try {
      const method = editingQuestion ? "PUT" : "POST";
      const url = editingQuestion
        ? `/api/happiness/questions/${editingQuestion.id}`
        : "/api/happiness/questions";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
      });

      if (response.ok) {
        mutate();
        setEditingQuestion(null);
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to save question");
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Are you sure you want to deactivate this question?")) return;

    try {
      const response = await fetch(`/api/happiness/questions/${questionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to delete question");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-600">
          Failed to load questions. Please try again.
        </div>
      </div>
    );
  }

  const questions = data?.questions || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Happiness Questions ({questions.length})
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-400 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Questions</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((question: HappinessQuestion) => (
          <div
            key={question.id}
            className={`border rounded-lg p-4 ${
              question.isActive ? "bg-white" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    #{question.id}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.category === "Meaning"
                        ? "bg-purple-100 text-purple-800"
                        : question.category === "Delight"
                        ? "bg-yellow-100 text-yellow-800"
                        : question.category === "Freedom"
                        ? "bg-green-100 text-green-800"
                        : question.category === "Engagement"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {question.category}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {question.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-900 mb-2">{question.text}</p>
                <div className="text-sm text-gray-600">
                  Values: [{question.values.join(", ")}]
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setEditingQuestion(question)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                {question.isActive && (
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No questions found matching your filters.
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddForm || editingQuestion) && (
        <QuestionModal
          question={editingQuestion}
          categories={categories}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setEditingQuestion(null);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

interface QuestionModalProps {
  question: HappinessQuestion | null;
  categories: string[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

function QuestionModal({
  question,
  categories,
  onSave,
  onCancel,
}: QuestionModalProps) {
  const [formData, setFormData] = useState({
    text: question?.text || "",
    category: question?.category || "Meaning",
    values: question?.values || [200, 400, 600, 800, 1000],
    isActive: question?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.text.trim()) {
      alert("Question text is required");
      return;
    }

    if (formData.values.some((v) => isNaN(v) || v < 0)) {
      alert("All values must be positive numbers");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b bg-blue-400 text-white">
          <h3 className="text-lg font-semibold text-black">
            {question ? "Edit Question" : "Add New Question"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text *
            </label>
            <textarea
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Values (5 numbers for scoring) *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {formData.values.map((value, index) => (
                <input
                  key={index}
                  type="number"
                  value={value}
                  onChange={(e) => {
                    const newValues = [...formData.values];
                    newValues[index] = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, values: newValues });
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                  min="0"
                  required
                />
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active (available for surveys)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-400 hover:bg-blue-600 text-white rounded-md"
            >
              {question ? "Update" : "Create"} Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
