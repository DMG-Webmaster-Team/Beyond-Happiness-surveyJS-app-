"use client";

import { useState, useEffect } from "react";

export interface ParticipantData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  ageRange: string;
}

interface ParticipantInformationFormProps {
  language?: "en" | "ar";
  onSubmit: (data: ParticipantData) => void;
  initialData?: Partial<ParticipantData>;
  requiredFields?: (keyof ParticipantData)[];
  showHeader?: boolean;
  submitButtonText?: {
    en: string;
    ar: string;
  };
}

export default function ParticipantInformationForm({
  language = "en",
  onSubmit,
  initialData = {},
  requiredFields = ["name", "email", "phone", "gender", "ageRange"],
  showHeader = true,
  submitButtonText = {
    en: "Continue to Survey",
    ar: "متابعة إلى الاستطلاع",
  },
}: ParticipantInformationFormProps) {
  const [formData, setFormData] = useState<ParticipantData>({
    name: initialData.name || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    gender: initialData.gender || "",
    ageRange: initialData.ageRange || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ParticipantData, string>>>({});

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  // Clear error when field is updated
  const updateField = (field: keyof ParticipantData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    const newErrors: Partial<Record<keyof ParticipantData, string>> = {};

    // Validate all required fields
    requiredFields.forEach((field) => {
      if (!formData[field] || !String(formData[field]).trim()) {
        const fieldName =
          language === "ar"
            ? field === "name"
              ? "الاسم الكامل"
              : field === "email"
              ? "البريد الإلكتروني"
              : field === "phone"
              ? "رقم الهاتف"
              : field === "gender"
              ? "الجنس"
              : "الفئة العمرية"
            : field === "name"
            ? "Full Name"
            : field === "email"
            ? "Email"
            : field === "phone"
            ? "Phone Number"
            : field === "gender"
            ? "Gender"
            : "Age Range";
        newErrors[field] =
          language === "ar"
            ? `يرجى إدخال ${fieldName}`
            : `Please enter ${fieldName}`;
      }
    });

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (requiredFields.includes("email") && formData.email && !emailRegex.test(formData.email)) {
      newErrors.email =
        language === "ar"
          ? "يرجى إدخال بريد إلكتروني صحيح"
          : "Please enter a valid email address";
    }

    // If there are errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and submit
    setErrors({});
    onSubmit(formData);
  };

  const isRequired = (field: keyof ParticipantData) =>
    requiredFields.includes(field);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        {showHeader && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {language === "ar" ? "معلومات المشارك" : "Participant Information"}
            </h2>
            <p className="text-sm text-gray-600">
              {language === "ar"
                ? "يرجى إدخال معلوماتك للمتابعة إلى الاستطلاع"
                : "Please fill in your information to continue to the survey"}
            </p>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          {requiredFields.includes("name") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الاسم الكامل" : "Full Name"}{" "}
                {isRequired("name") && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required={isRequired("name")}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
                placeholder={
                  language === "ar"
                    ? "أدخل اسمك الكامل"
                    : "Enter your full name"
                }
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
          )}

          {requiredFields.includes("email") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "البريد الإلكتروني" : "Email"}{" "}
                {isRequired("email") && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required={isRequired("email")}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          )}

          {requiredFields.includes("phone") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "رقم الهاتف" : "Phone Number"}{" "}
                {isRequired("phone") && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                required={isRequired("phone")}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
                placeholder={language === "ar" ? "+20 123 456 7890" : "+20 123 456 7890"}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          )}

          {requiredFields.includes("gender") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الجنس" : "Gender"}{" "}
                {isRequired("gender") && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                required={isRequired("gender")}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.gender
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
              >
                <option value="">
                  {language === "ar" ? "اختر الجنس" : "Select Gender"}
                </option>
                <option value="male">
                  {language === "ar" ? "ذكر" : "Male"}
                </option>
                <option value="female">
                  {language === "ar" ? "أنثى" : "Female"}
                </option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
              )}
            </div>
          )}

          {requiredFields.includes("ageRange") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الفئة العمرية" : "Age Range"}{" "}
                {isRequired("ageRange") && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <select
                value={formData.ageRange}
                onChange={(e) => updateField("ageRange", e.target.value)}
                required={isRequired("ageRange")}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.ageRange
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                }`}
              >
                <option value="">
                  {language === "ar"
                    ? "اختر الفئة العمرية"
                    : "Select Age Range"}
                </option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55-64">55-64</option>
                <option value="65+">65+</option>
              </select>
              {errors.ageRange && (
                <p className="mt-1 text-sm text-red-600">{errors.ageRange}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-blue-400 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            {language === "ar" ? submitButtonText.ar : submitButtonText.en}
          </button>
        </div>
      </div>
    </div>
  );
}

