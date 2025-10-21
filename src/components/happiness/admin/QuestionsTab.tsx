"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useDebounce } from "@/hooks/useDebounce";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  getAutoEssentialValues,
  getAutoCategoryValues,
  valuesMatchAuto,
  validateValues,
  getDefaultQuestionValues,
  CATEGORY_MAX_SCORES,
  MAX_ESSENTIAL_SCORE,
} from "@/lib/value-calculations";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessQuestion {
  id: number;
  text: string;
  category: string;
  categoryValues: number[];
  essentialId?: number;
  essentialValues?: number[];
  essentialName?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Essential {
  id: number;
  name: string;
  truth: string;
}

export default function QuestionsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingQuestion, setEditingQuestion] =
    useState<HappinessQuestion | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [dragOrder, setDragOrder] = useState<number[]>([]);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data, error, isLoading, mutate } = useSWR(
    `/api/happiness/questions?search=${debouncedSearchTerm}&category=${categoryFilter}&isActive=${activeFilter}`,
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

  const handleDeleteQuestion = (questionId: number) => {
    setQuestionToDelete(questionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      const response = await fetch(
        `/api/happiness/questions/${questionToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        mutate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to delete question");
    } finally {
      setShowDeleteConfirm(false);
      setQuestionToDelete(null);
    }
  };

  const cancelDeleteQuestion = () => {
    setShowDeleteConfirm(false);
    setQuestionToDelete(null);
  };

  // Sort questions by drag order or ID (ascending order)
  const sortedQuestions = useMemo(() => {
    const questions = data?.questions || [];
    if (dragOrder.length === 0) {
      return [...questions].sort((a, b) => a.id - b.id);
    }

    // Sort by drag order
    const orderedQuestions = [...questions].sort((a, b) => {
      const aIndex = dragOrder.indexOf(a.id);
      const bIndex = dragOrder.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) return a.id - b.id;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return orderedQuestions;
  }, [data?.questions, dragOrder]);

  // Calculate stats grouped by Truth → Essentials
  const truthStats = useMemo(() => {
    const questions = data?.questions || [];
    const grouped: Record<
      string,
      Record<
        string,
        { count: number; totalScore: number; essentialName: string }
      >
    > = {};

    questions.forEach((q: HappinessQuestion) => {
      if (!grouped[q.category]) {
        grouped[q.category] = {};
      }

      const essentialKey = q.essentialId
        ? `essential_${q.essentialId}`
        : "no_essential";
      const essentialName = q.essentialName || "No Essential";

      if (!grouped[q.category][essentialKey]) {
        grouped[q.category][essentialKey] = {
          count: 0,
          totalScore: 0,
          essentialName: essentialName,
        };
      }

      grouped[q.category][essentialKey].count += 1;
      // Add the maximum essential value (last value in array, typically 25)
      if (q.essentialValues && Array.isArray(q.essentialValues)) {
        grouped[q.category][essentialKey].totalScore +=
          q.essentialValues[q.essentialValues.length - 1] || 0;
      }
    });

    // Convert to array format for rendering
    return Object.entries(grouped).map(([category, essentials]) => ({
      name: category,
      essentials: Object.entries(essentials).map(([key, data]) => ({
        name: data.essentialName,
        count: data.count,
        totalScore: data.totalScore,
      })),
    }));
  }, [data?.questions]);

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = sortedQuestions.findIndex((q) => q.id === active.id);
      const newIndex = sortedQuestions.findIndex((q) => q.id === over.id);

      const newOrder = arrayMove(sortedQuestions, oldIndex, newIndex);
      setDragOrder(newOrder.map((q) => q.id));
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Happiness Questions ({sortedQuestions.length}) - Sorted by ID
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
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {searchTerm !== debouncedSearchTerm && searchTerm.length > 0 && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            </div>
          )}
          {searchTerm.length > 0 && searchTerm === debouncedSearchTerm && (
            <div className="absolute right-3 top-2.5 text-green-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
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
          <option value="all">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Dashboard Stats - Truth & Essential Overview */}
      {truthStats.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 Question Distribution by Category & Essential
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {truthStats.map((truth) => (
              <div
                key={truth.name}
                className="bg-white p-4 rounded-lg shadow-sm border"
              >
                <h4 className="font-bold text-base mb-3 text-gray-800 border-b pb-2">
                  {truth.name}
                </h4>
                <ul className="space-y-2">
                  {truth.essentials.map((ess, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">
                          {ess.name}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {ess.count} question{ess.count !== 1 ? "s" : ""} • Max
                          Score: {ess.totalScore}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions List - Drag and Drop Enabled */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedQuestions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sortedQuestions.map((question: HappinessQuestion) => (
              <SortableQuestionItem
                key={question.id}
                question={question}
                onEdit={() => setEditingQuestion(question)}
                onDelete={() => handleDeleteQuestion(question.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sortedQuestions.length === 0 && (
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Question"
        message="Are you sure you want to permanently delete this question? This action cannot be undone and will remove the question from all surveys."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteQuestion}
        onCancel={cancelDeleteQuestion}
      />
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
    categoryValues: question?.categoryValues || [200, 400, 600, 800, 1000],
    essentialId: question?.essentialId || "",
    essentialValues: question?.essentialValues || [0, 3.125, 6.25, 9.375, 12.5],
    isActive: question?.isActive ?? true,
  });

  const [essentials, setEssentials] = useState<Essential[]>([]);
  const [loadingEssentials, setLoadingEssentials] = useState(false);

  // Track manual overrides to disable auto-calculation
  const [manualOverrides, setManualOverrides] = useState({
    categoryValues: false,
    essentialValues: false,
  });

  // Update form data when question prop changes (for editing)
  useEffect(() => {
    if (question) {
      console.log("🔄 Updating form data for question:", question);
      console.log(
        "📊 Question essentialId:",
        question.essentialId,
        "type:",
        typeof question.essentialId
      );
      console.log("📊 Question essentialValues:", question.essentialValues);
      console.log("📊 Question categoryValues:", question.categoryValues);

      const categoryValues = question.categoryValues || [
        200, 400, 600, 800, 1000,
      ];
      const essentialValues = question.essentialValues || [
        0, 3.125, 6.25, 9.375, 12.5,
      ];

      // Detect if values are manually overridden
      const autoCategoryValues = getAutoCategoryValues(
        question.category || "Meaning"
      );
      const autoEssentialValues = getAutoEssentialValues();

      const categoryOverride = !valuesMatchAuto(
        categoryValues,
        autoCategoryValues
      );
      const essentialOverride = !valuesMatchAuto(
        essentialValues,
        autoEssentialValues
      );

      setFormData({
        text: question.text || "",
        category: question.category || "Meaning",
        categoryValues,
        essentialId: question.essentialId
          ? question.essentialId.toString()
          : "",
        essentialValues,
        isActive: question.isActive ?? true,
      });

      setManualOverrides({
        categoryValues: categoryOverride,
        essentialValues: essentialOverride,
      });
    } else {
      // Reset form when no question (adding new)
      const defaultValues = getDefaultQuestionValues("Meaning");

      setFormData({
        text: "",
        category: "Meaning",
        categoryValues: defaultValues.categoryValues,
        essentialId: "",
        essentialValues: defaultValues.essentialValues,
        isActive: true,
      });

      setManualOverrides({
        categoryValues: false,
        essentialValues: false,
      });
    }
  }, [question]);

  // Fetch essentials when category changes or modal opens
  useEffect(() => {
    const fetchEssentials = async () => {
      if (!formData.category) return;

      setLoadingEssentials(true);
      try {
        const response = await fetch(
          `/api/essentials?truth=${formData.category}`
        );
        const data = await response.json();
        if (data.success) {
          setEssentials(data.data);
          console.log(
            "✅ Fetched essentials for category:",
            formData.category,
            data.data
          );
        }
      } catch (error) {
        console.error("Error fetching essentials:", error);
      } finally {
        setLoadingEssentials(false);
      }
    };

    fetchEssentials();
  }, [formData.category]);

  // Auto-calculate values when category changes (if not manually overridden)
  useEffect(() => {
    // Only auto-calculate if we're not loading a question for editing
    if (!question) {
      const autoCategoryValues = getAutoCategoryValues(formData.category);
      const autoEssentialValues = getAutoEssentialValues();

      setFormData((prev) => ({
        ...prev,
        categoryValues: autoCategoryValues,
        essentialId: "",
        essentialValues: autoEssentialValues,
      }));

      // Reset manual overrides for new questions
      setManualOverrides({
        categoryValues: false,
        essentialValues: false,
      });
    } else {
      // For editing, only auto-calculate category values if not manually overridden
      if (!manualOverrides.categoryValues) {
        const autoCategoryValues = getAutoCategoryValues(formData.category);
        setFormData((prev) => ({
          ...prev,
          categoryValues: autoCategoryValues,
        }));
      }
    }
  }, [formData.category, question, manualOverrides.categoryValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.text.trim()) {
      alert("Question text is required");
      return;
    }

    // Validate category values
    const categoryValidation = validateValues(
      formData.categoryValues,
      "category"
    );
    if (!categoryValidation.isValid) {
      alert(`Category Values Error: ${categoryValidation.error}`);
      return;
    }

    // Validate essential values if essential is selected
    if (formData.essentialId && formData.essentialId !== "") {
      const essentialValidation = validateValues(
        formData.essentialValues,
        "essential"
      );
      if (!essentialValidation.isValid) {
        alert(`Essential Values Error: ${essentialValidation.error}`);
        return;
      }
    }

    // Map formData to API expected format
    const apiPayload = {
      text: formData.text,
      category: formData.category,
      categoryValues: formData.categoryValues,
      essentialId: formData.essentialId || null,
      essentialValues:
        formData.essentialId &&
        formData.essentialValues &&
        formData.essentialValues.length === 5
          ? formData.essentialValues
          : null,
      isActive: formData.isActive,
    };

    console.log("📤 Sending payload to API:", apiPayload);
    onSave(apiPayload);
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

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4"
          key={question?.id || "new"}
        >
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
              Category Values (5 numbers for category scoring) *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {formData.categoryValues.map((value, index) => (
                <input
                  key={index}
                  type="number"
                  value={value}
                  onChange={(e) => {
                    const newValues = [...formData.categoryValues];
                    newValues[index] = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, categoryValues: newValues });

                    // Detect manual override
                    const autoValues = getAutoCategoryValues(formData.category);
                    const isOverride = !valuesMatchAuto(newValues, autoValues);
                    setManualOverrides((prev) => ({
                      ...prev,
                      categoryValues: isOverride,
                    }));
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                  min="0"
                  step="0.01"
                  required
                />
              ))}
            </div>
            <div className="mt-1">
              {!manualOverrides.categoryValues ? (
                <p className="text-sm text-green-600">
                  ✓ Auto-calculated values (Max:{" "}
                  {CATEGORY_MAX_SCORES[formData.category] || 2000})
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-orange-600">
                    ⚠️ Manually overridden values
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const autoValues = getAutoCategoryValues(
                        formData.category
                      );
                      setFormData((prev) => ({
                        ...prev,
                        categoryValues: autoValues,
                      }));
                      setManualOverrides((prev) => ({
                        ...prev,
                        categoryValues: false,
                      }));
                    }}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Reset to Auto
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Essential
            </label>
            <select
              value={formData.essentialId}
              onChange={(e) => {
                const selectedEssentialId = e.target.value;
                const autoEssentialValues = getAutoEssentialValues();

                setFormData({
                  ...formData,
                  essentialId: selectedEssentialId || "",
                  // Auto-calculate essential values if not manually overridden
                  essentialValues:
                    selectedEssentialId && !manualOverrides.essentialValues
                      ? autoEssentialValues
                      : selectedEssentialId
                      ? formData.essentialValues
                      : [],
                });

                // Reset manual override flag when selecting new essential
                if (selectedEssentialId && !manualOverrides.essentialValues) {
                  setManualOverrides((prev) => ({
                    ...prev,
                    essentialValues: false,
                  }));
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={loadingEssentials}
            >
              <option value="">Select an Essential (optional)</option>
              {essentials.map((essential) => (
                <option key={essential.id} value={essential.id}>
                  {essential.name}
                </option>
              ))}
            </select>
            {loadingEssentials && (
              <p className="text-sm text-gray-500 mt-1">
                Loading essentials...
              </p>
            )}
            {formData.essentialId && formData.essentialId !== "" && (
              <div className="mt-1">
                {!manualOverrides.essentialValues ? (
                  <p className="text-sm text-green-600">
                    ✓ Auto-calculated values (Max: {MAX_ESSENTIAL_SCORE})
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-orange-600">
                      ⚠️ Manually overridden values
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const autoValues = getAutoEssentialValues();
                        setFormData((prev) => ({
                          ...prev,
                          essentialValues: autoValues,
                        }));
                        setManualOverrides((prev) => ({
                          ...prev,
                          essentialValues: false,
                        }));
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Reset to Auto
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {formData.essentialId && formData.essentialId !== "" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Essential Values (5 numbers for essential scoring) *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {formData.essentialValues.map((value, index) => (
                  <input
                    key={index}
                    type="number"
                    value={value}
                    onChange={(e) => {
                      const newValues = [...formData.essentialValues];
                      newValues[index] = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, essentialValues: newValues });

                      // Detect manual override
                      const autoValues = getAutoEssentialValues();
                      const isOverride = !valuesMatchAuto(
                        newValues,
                        autoValues
                      );
                      setManualOverrides((prev) => ({
                        ...prev,
                        essentialValues: isOverride,
                      }));
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min="0"
                    step="0.01"
                    required
                  />
                ))}
              </div>
            </div>
          )}

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

// Sortable Question Item Component
function SortableQuestionItem({
  question,
  onEdit,
  onDelete,
}: {
  question: HappinessQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 ${
        question.isActive ? "bg-white" : "bg-gray-50 border-gray-200"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </div>

            <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
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
            {question.essentialName && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {question.essentialName}
              </span>
            )}
          </div>
          <p className="text-gray-900 mb-2">{question.text}</p>
          <div className="text-sm text-gray-600">
            Category Values: [{question.categoryValues?.join(", ") || "Not set"}
            ]
            {question.essentialValues && (
              <div className="mt-1">
                Essential Values: [{question.essentialValues.join(", ")}]
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-200 rounded hover:bg-blue-50"
          >
            Edit
          </button>
          {!question.isActive && (
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-200 rounded hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
