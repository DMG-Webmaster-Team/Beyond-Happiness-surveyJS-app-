import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a specific survey
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { getSurveyById } = await import("../../../../db/queries/surveys");
    const survey = await getSurveyById(id);

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Transform to match existing API response format
    const response = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      canTakeMultiple: survey.canTakeMultiple,
      isAnonymous: survey.isAnonymous,
      createdAt: survey.createdAt, // Already ISO string format
      updatedAt: survey.updatedAt, // Already ISO string format
      adminId: survey.createdBy,
      json:
        typeof survey.definition === "string"
          ? JSON.parse(survey.definition)
          : survey.definition,
    };

    const responseWithHeaders = NextResponse.json(response);
    responseWithHeaders.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
    return responseWithHeaders;
  } catch (error) {
    console.error("Error fetching survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update a survey
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updateData = await request.json();

    // Dynamic import to avoid static generation issues
    const { updateSurvey } = await import("../../../../db/queries/surveys");
    const updatedSurvey = await updateSurvey(id, {
      title: updateData.title,
      description: updateData.description,
      definition: updateData.json,
      canTakeMultiple: updateData.canTakeMultiple,
      isAnonymous: updateData.isAnonymous,
      companyId: updateData.companyId,
      companyName: updateData.companyName,
    });

    if (!updatedSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Transform response to match existing API format
    const response = {
      id: updatedSurvey.id,
      title: updatedSurvey.title,
      description: updatedSurvey.description,
      canTakeMultiple: updatedSurvey.canTakeMultiple,
      isAnonymous: updatedSurvey.isAnonymous,
      createdAt: updatedSurvey.createdAt, // Already ISO string format
      updatedAt: updatedSurvey.updatedAt, // Already ISO string format
      adminId: updatedSurvey.createdBy,
      json:
        typeof updatedSurvey.definition === "string"
          ? JSON.parse(updatedSurvey.definition)
          : updatedSurvey.definition,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a survey
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { deleteSurvey } = await import("../../../../db/queries/surveys");
    const deleted = await deleteSurvey(id);

    if (!deleted) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
