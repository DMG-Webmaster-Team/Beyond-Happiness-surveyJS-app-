import { NextRequest, NextResponse } from "next/server";

// GET - Get happiness surveys assigned to a company

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { getCompanyHappinessSurveys } = await import(
      "../../../../../db/queries/survey-company-assignments"
    );

    const surveys = await getCompanyHappinessSurveys(id);

    return NextResponse.json({
      surveys,
      total: surveys.length,
    });
  } catch (error) {
    console.error("Error fetching company happiness surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch company happiness surveys" },
      { status: 500 }
    );
  }
}
