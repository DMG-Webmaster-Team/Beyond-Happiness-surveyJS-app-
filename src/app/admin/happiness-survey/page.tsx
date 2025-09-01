"use client";

import { useState } from "react";
import AdminNavbar from "@/components/shared/AdminNavbar";
import QuestionsTab from "@/components/happiness/admin/QuestionsTab";
import CharactersTab from "@/components/happiness/admin/CharactersTab";
import SurveysTab from "@/components/happiness/admin/SurveysTab";
import ResultsTab from "@/components/happiness/admin/ResultsTab";

export default function HappinessSurveyAdminPage() {
  const [activeTab, setActiveTab] = useState("questions");

  const tabs = [
    { id: "questions", label: "Questions", component: QuestionsTab },
    { id: "characters", label: "Characters", component: CharactersTab },
    { id: "surveys", label: "Surveys", component: SurveysTab },
    { id: "results", label: "Results", component: ResultsTab },
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || QuestionsTab;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Happiness Survey Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage happiness survey questions, characters, surveys, and view
              results
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-400 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
