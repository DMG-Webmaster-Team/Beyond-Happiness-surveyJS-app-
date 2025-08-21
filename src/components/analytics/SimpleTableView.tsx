"use client";

import { useEffect, useRef, useState } from "react";

export default function SimpleTableView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    const testSurveyJS = async () => {
      try {
        setStatus("Loading SurveyJS components...");

        // Import components (client-only)
        const { Model } = await import("survey-core");
        const { Tabulator } = await import(
          "survey-analytics/survey.analytics.tabulator"
        );

        setStatus("Creating test survey model...");

        // Create a simple test survey
        const testSchema = {
          title: "Test Survey",
          pages: [
            {
              name: "page1",
              elements: [
                {
                  type: "text",
                  name: "question1",
                  title: "What is your name?",
                },
                {
                  type: "text",
                  name: "question2",
                  title: "What is your favorite color?",
                },
              ],
            },
          ],
        };

        const model = new Model(testSchema);

        setStatus("Creating test data...");

        // Create test data
        const testData = [
          {
            question1: "John Doe",
            question2: "Blue",
          },
          {
            question1: "Jane Smith",
            question2: "Red",
          },
        ];

        setStatus("Initializing table...");

        // Create table
        const table = new Tabulator(model, testData);

        setStatus("Rendering table...");

        // Render to container
        if (containerRef.current) {
          table.render(containerRef.current);
          setStatus("Table rendered successfully!");
        } else {
          setStatus("Container not found!");
        }
      } catch (error) {
        console.error("SurveyJS test failed:", error);
        setStatus(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    testSurveyJS();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Simple SurveyJS Table Test</h2>

      <div className="mb-4 p-3 bg-blue-50 rounded">
        <strong>Status:</strong> {status}
      </div>

      <div
        ref={containerRef}
        className="border-2 border-dashed border-gray-300 p-4 min-h-[400px]"
      >
        <div className="text-gray-500 text-center">
          SurveyJS Table will render here...
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          This is a minimal test to verify SurveyJS Table View works correctly.
        </p>
        <p>
          If you see a table with test data above, the component is working.
        </p>
        <p>If you see an error, check the browser console for details.</p>
      </div>
    </div>
  );
}
