"use client";

import { useState } from "react";
import SurveySelectorSeparate from "@/components/shared/SurveySelectorSeparate";

export default function SurveySelectorTest() {
  const [selectedRegularSurveys, setSelectedRegularSurveys] = useState<
    string[]
  >([]);
  const [selectedHappinessSurveys, setSelectedHappinessSurveys] = useState<
    string[]
  >([]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Survey Selector Test (Separate Dropdowns)
        </h1>
        <p className="text-gray-600 mb-8">
          Testing separate dropdowns for Regular and Happiness surveys with
          individual search bars
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Regular Surveys */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Regular Surveys
            </h2>

            <SurveySelectorSeparate
              value={selectedRegularSurveys}
              onChange={setSelectedRegularSurveys}
              surveyType="regular"
              label="Select Regular Surveys"
              placeholder="Search regular surveys..."
              multiple={true}
              includeDeleted={false}
            />

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Selected: {selectedRegularSurveys.length} survey(s)
              </h3>
              <pre className="text-xs text-blue-700 overflow-auto max-h-32">
                {JSON.stringify(selectedRegularSurveys, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setSelectedRegularSurveys([])}
              className="mt-3 w-full px-3 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
            >
              Clear Regular
            </button>
          </div>

          {/* Happiness Surveys */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              😊 Happiness Surveys
            </h2>

            <SurveySelectorSeparate
              value={selectedHappinessSurveys}
              onChange={setSelectedHappinessSurveys}
              surveyType="happiness"
              label="Select Happiness Surveys"
              placeholder="Search happiness surveys..."
              multiple={true}
              includeDeleted={false}
            />

            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Selected: {selectedHappinessSurveys.length} survey(s)
              </h3>
              <pre className="text-xs text-green-700 overflow-auto max-h-32">
                {JSON.stringify(selectedHappinessSurveys, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setSelectedHappinessSurveys([])}
              className="mt-3 w-full px-3 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
            >
              Clear Happiness
            </button>
          </div>
        </div>

        {/* Combined Summary */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">📊 Combined Summary</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">
                {selectedRegularSurveys.length}
              </div>
              <div className="text-sm opacity-90">Regular Surveys</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">
                {selectedHappinessSurveys.length}
              </div>
              <div className="text-sm opacity-90">Happiness Surveys</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {selectedRegularSurveys.length + selectedHappinessSurveys.length}
            </div>
            <div className="text-lg">Total Surveys Selected</div>
          </div>

          <button
            onClick={() => {
              setSelectedRegularSurveys([]);
              setSelectedHappinessSurveys([]);
            }}
            className="mt-4 w-full px-4 py-3 bg-white text-purple-600 font-semibold rounded-md hover:bg-gray-100"
          >
            Clear All Selections
          </button>
        </div>

        {/* Features List */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ✨ Component Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Separate dropdowns for each survey type
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Individual search bars per dropdown
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Real-time debounced search
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Multiple selection support
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Selected items display with badges
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">
                Clear all functionality
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">Loading states</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-sm text-gray-700">Error handling</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
