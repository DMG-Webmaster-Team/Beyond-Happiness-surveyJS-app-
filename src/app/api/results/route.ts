import { NextRequest, NextResponse } from "next/server";

// GET - Fetch results for a specific survey
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("surveyId");
  const userId = searchParams.get("userId");
  const adminId = searchParams.get("adminId");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  // 🔍 DEBUG: Log the received parameters
  console.log("🔍 /api/results GET request:", {
    surveyId,
    userId,
    adminId,
    page,
    limit,
    url: request.url,
  });

  // 🚨 SECURITY: Enforce both surveyId AND userId for submission checks
  if (userId && !surveyId) {
    console.log("❌ userId provided without surveyId - rejecting request");
    return NextResponse.json(
      { error: "surveyId is required when userId is provided" },
      { status: 400 }
    );
  }

  try {
    // Dynamic import to avoid static generation issues
    const {
      listResultsBySurvey,
      listResultsBySurveyPaged,
      getUserResultsForSurvey,
    } = await import("../../../db/queries/results");

    // 🔍 SPECIFIC USER SUBMISSION CHECK: If both surveyId and userId provided
    if (surveyId && userId) {
      console.log(
        `🔍 Checking submissions for user ${userId} in survey ${surveyId}`
      );

      const userResults = await getUserResultsForSurvey(userId, surveyId);

      console.log(
        `🔍 Found ${userResults.length} submissions for user ${userId} in survey ${surveyId}`
      );

      return NextResponse.json({
        results: userResults,
        total: userResults.length,
        userId,
        surveyId,
      });
    }

    // 🔍 ADMIN VIEW: Survey results (paginated)
    if (surveyId) {
      console.log(
        `🔍 Fetching paginated results for survey ${surveyId} (admin view)`
      );

      // Always use pagination for survey results
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 50;

      const paginatedResults = await listResultsBySurveyPaged({
        surveyId,
        page: pageNum,
        limit: limitNum,
      });

      console.log(
        `🔍 Returning ${paginatedResults.results.length} results out of ${paginatedResults.total} total`
      );

      return NextResponse.json({
        items: paginatedResults.results,
        total: paginatedResults.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(paginatedResults.total / limitNum),
      });
    } else {
      // Get all results with pagination (admin overview)
      console.log("🔍 Fetching all results (admin overview)");

      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 100;

      const paginatedResults = await listResultsBySurveyPaged({
        page: pageNum,
        limit: limitNum,
      });

      console.log(
        `🔍 Returning ${paginatedResults.results.length} results out of ${paginatedResults.total} total`
      );

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
