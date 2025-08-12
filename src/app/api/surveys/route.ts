import { NextRequest, NextResponse } from "next/server";
import {
  listSurveys,
  listSurveysByAdmin,
  createSurvey,
} from "../../../db/queries/surveys";

// GET - Fetch surveys for a specific admin
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminId = searchParams.get("adminId");

  try {
    let surveys;
    if (adminId) {
      surveys = await listSurveysByAdmin(adminId);
    } else {
      surveys = await listSurveys();
    }

    // Transform to match existing API response format
    const transformedSurveys = surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      canTakeMultiple: survey.canTakeMultiple,
      createdAt: survey.createdAt, // Already ISO string format
      updatedAt: survey.updatedAt, // Already ISO string format
      adminId: survey.createdBy, // Map createdBy to adminId for backwards compatibility
    }));

    return NextResponse.json(transformedSurveys);
  } catch (error) {
    console.error("Database error, falling back to JSON:", error);

    // Fallback to JSON files when database is not available
    try {
      const fs = await import("fs");
      const path = await import("path");

      const surveysPath = path.join(process.cwd(), "data", "surveys.json");
      const surveysData = fs.readFileSync(surveysPath, "utf8");
      const surveys = JSON.parse(surveysData);

      if (adminId) {
        const adminSurveys = surveys.filter(
          (survey: any) => survey.adminId === adminId
        );
        return NextResponse.json(adminSurveys);
      }

      return NextResponse.json(surveys);
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}

// POST - Create a new survey
export async function POST(request: NextRequest) {
  try {
    const surveyData = await request.json();

    // Create survey in database
    const newSurvey = await createSurvey({
      title: surveyData.title,
      description: surveyData.description,
      definition: surveyData.json || {},
      canTakeMultiple: surveyData.canTakeMultiple || false,
      createdBy: surveyData.adminId,
    });

    // Transform response to match existing API format
    const response = {
      id: newSurvey.id,
      title: newSurvey.title,
      description: newSurvey.description,
      canTakeMultiple: newSurvey.canTakeMultiple,
      createdAt: newSurvey.createdAt, // Already ISO string format
      updatedAt: newSurvey.updatedAt, // Already ISO string format
      adminId: newSurvey.createdBy,
      json:
        typeof newSurvey.definition === "string"
          ? JSON.parse(newSurvey.definition)
          : newSurvey.definition,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
