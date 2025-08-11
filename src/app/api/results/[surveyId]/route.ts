import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface SurveyResult {
  surveyId: string;
  userId: string;
  adminId: string;
  data: Record<string, any>;
  id: string;
  submittedAt: string;
}

interface Survey {
  id: string;
  title: string;
  json: {
    title: string;
    pages: Array<{
      elements?: Array<{
        name: string;
        title?: string;
        type: string;
      }>;
    }>;
  };
}

interface QuestionInfo {
  title: string;
  type: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    // Read results from JSON file
    const resultsPath = path.join(process.cwd(), "data", "results.json");
    const surveysPath = path.join(process.cwd(), "data", "surveys.json");

    const [resultsData, surveysData] = await Promise.all([
      fs.promises.readFile(resultsPath, "utf8"),
      fs.promises.readFile(surveysPath, "utf8"),
    ]);

    const allResults: SurveyResult[] = JSON.parse(resultsData);
    const surveys: Survey[] = JSON.parse(surveysData);

    // Find survey and get its name and questions
    const survey = surveys.find((s) => s.id === params.surveyId);
    const surveyName = survey?.title || "Untitled Survey";

    // Create a map of question IDs to their titles
    const questionMap: Record<string, QuestionInfo> = {};
    survey?.json.pages.forEach((page) => {
      page.elements?.forEach((element) => {
        questionMap[element.name] = {
          title: element.title || element.name,
          type: element.type,
        };
      });
    });

    // Filter results by surveyId if provided
    const filteredResults =
      params.surveyId !== "all"
        ? allResults.filter((result) => result.surveyId === params.surveyId)
        : allResults;

    // Sort by submittedAt descending
    const sortedResults = filteredResults.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return NextResponse.json({
      surveyName,
      questionMap,
      results: sortedResults,
    });
  } catch (error) {
    console.error("Error reading results:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey results" },
      { status: 500 }
    );
  }
}
