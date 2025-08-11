import { NextRequest, NextResponse } from "next/server";
import { listResultsBySurvey, listResultsBySurveyPaged } from "../../../db/queries/results";

// GET - Fetch results for a specific survey
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const adminId = searchParams.get("adminId");
    const limit = searchParams.get("limit");
    const cursor = searchParams.get("cursor");

    let results;
    
    if (surveyId) {
      if (limit || cursor) {
        // Use paginated query
        const paginatedResults = await listResultsBySurveyPaged({
          surveyId,
          limit: limit ? parseInt(limit) : undefined,
          cursor: cursor || undefined,
        });
        return NextResponse.json(paginatedResults);
      } else {
        // Use simple query
        results = await listResultsBySurvey(surveyId);
      }
    } else {
      // Get all results with pagination
      const paginatedResults = await listResultsBySurveyPaged({
        limit: limit ? parseInt(limit) : undefined,
        cursor: cursor || undefined,
      });
      results = paginatedResults.results;
    }

    // Filter by adminId if provided (for backwards compatibility)
    if (adminId) {
      results = results.filter((r: any) => r.adminId === adminId);
    }

    // Transform to match existing API response format
    const transformedResults = results.map((result: any) => ({
      id: result.id,
      surveyId: result.surveyId,
      userId: result.userId,
      adminId: result.adminId,
      data: result.data,
      submittedAt: result.submittedAt?.toISOString(),
    }));

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit survey results
export async function POST(request: NextRequest) {
  try {
    const resultData = await request.json();

    // Import functions here to avoid dependency issues
    const { createResult, hasUserSubmittedSurvey } = await import("../../../db/queries/results");
    const { getSurveyById } = await import("../../../db/queries/surveys");
    const { markUserAsSubmitted } = await import("../../../db/queries/users");

    // Check if survey exists and get its configuration
    const survey = await getSurveyById(resultData.surveyId);
    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found" },
        { status: 404 }
      );
    }

    const canTakeMultiple = Boolean(survey.canTakeMultiple);

    // Block duplicates only for one-time surveys
    if (!canTakeMultiple && resultData.userId) {
      const hasSubmitted = await hasUserSubmittedSurvey(resultData.userId, resultData.surveyId);
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

    // Update user's submission status for one-time surveys
    if (!canTakeMultiple && resultData.userId) {
      await markUserAsSubmitted(resultData.userId);
    }

    // Transform response to match existing API format
    const response = {
      id: newResult.id,
      surveyId: newResult.surveyId,
      userId: newResult.userId,
      adminId: newResult.adminId,
      data: newResult.data,
      submittedAt: newResult.submittedAt?.toISOString(),
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
