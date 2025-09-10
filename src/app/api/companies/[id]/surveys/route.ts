import { NextRequest, NextResponse } from "next/server";

// GET - Get regular surveys assigned to a company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { getCompanySurveys } = await import(
      "../../../../../db/queries/survey-company-assignments"
    );

    const surveys = await getCompanySurveys(id);

    return NextResponse.json({
      surveys,
      total: surveys.length,
    });
  } catch (error) {
    console.error("Error fetching company surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch company surveys" },
      { status: 500 }
    );
  }
}

