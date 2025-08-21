import { NextRequest, NextResponse } from "next/server";

// GET - Fetch results for a specific survey
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("surveyId");
  const adminId = searchParams.get("adminId");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  try {
    // Dynamic import to avoid static generation issues
    const { listResultsBySurvey, listResultsBySurveyPaged } = await import(
      "../../../db/queries/results"
    );

    let results;

    if (surveyId) {
      // Always use pagination for survey results
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 50;

      const paginatedResults = await listResultsBySurveyPaged({
        surveyId,
        page: pageNum,
        limit: limitNum,
      });

      return NextResponse.json({
        items: paginatedResults.results,
        total: paginatedResults.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(paginatedResults.total / limitNum),
      });
    } else {
      // Get all results with pagination
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 100;

      const paginatedResults = await listResultsBySurveyPaged({
        page: pageNum,
        limit: limitNum,
      });

      return NextResponse.json({
        items: paginatedResults.results,
        total: paginatedResults.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(paginatedResults.total / limitNum),
      });
    }
  } catch (error) {
    console.error("Database error, falling back to JSON:", error);

    // Fallback to JSON files when database is not available
    try {
      const fs = await import("fs");
      const path = await import("path");

      const resultsPath = path.join(process.cwd(), "data", "results.json");
      const resultsData = fs.readFileSync(resultsPath, "utf8");
      const results = JSON.parse(resultsData);

      let filteredResults = results;

      if (surveyId) {
        filteredResults = filteredResults.filter(
          (r: any) => r.surveyId === surveyId
        );
      }

      if (adminId) {
        filteredResults = filteredResults.filter(
          (r: any) => r.adminId === adminId
        );
      }

      return NextResponse.json(filteredResults);
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}

// POST - Submit survey results
export async function POST(request: NextRequest) {
  try {
    const resultData = await request.json();

    // Import functions here to avoid dependency issues
    const { createResult, hasUserSubmittedSurvey } = await import(
      "../../../db/queries/results"
    );
    const { getSurveyById } = await import("../../../db/queries/surveys");
    const { updateAssignmentStatus } = await import(
      "../../../db/queries/user-assignments"
    );

    // Check if survey exists and get its configuration
    const survey = await getSurveyById(resultData.surveyId);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const canTakeMultiple = Boolean(survey.canTakeMultiple);

    // Block duplicates only for one-time surveys
    if (!canTakeMultiple && resultData.userId) {
      const hasSubmitted = await hasUserSubmittedSurvey(
        resultData.userId,
        resultData.surveyId
      );
      if (hasSubmitted) {
        return NextResponse.json(
          { error: "Survey already submitted by this user" },
          { status: 400 }
        );
      }
    }

    // Create result in database
    const newResult = await createResult({
      surveyId: resultData.surveyId,
      userId: resultData.userId,
      adminId: resultData.adminId,
      data: resultData.data || {},
    });

    // Update user assignment status to "completed" when survey is submitted
    if (resultData.userId) {
      try {
        await updateAssignmentStatus(
          resultData.userId,
          resultData.surveyId,
          "completed"
        );
      } catch (error) {
        console.warn("Failed to update assignment status:", error);
        // Don't fail the entire request if status update fails
      }
    }

    // Transform response to match existing API format
    const response = {
      id: newResult.id,
      surveyId: newResult.surveyId,
      userId: newResult.userId,
      adminId: newResult.adminId,
      data: newResult.data,
      submittedAt: newResult.submittedAt, // Already ISO string format
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error submitting results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
