import { NextRequest, NextResponse } from "next/server";
import { listResultsBySurvey } from "../../../../db/queries/results";
import { getSurveyById } from "../../../../db/queries/surveys";

interface QuestionInfo {
  title: string;
  type: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    // Get survey and results from database
    const [survey, results] = await Promise.all([
      getSurveyById(params.surveyId),
      listResultsBySurvey(params.surveyId),
    ]);

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const surveyName = survey.title || "Untitled Survey";

    // Create a map of question IDs to their titles from survey definition
    const questionMap: Record<string, QuestionInfo> = {};
    const surveyDefinition = survey.definition as any;

    if (surveyDefinition?.pages) {
      surveyDefinition.pages.forEach((page: any) => {
        page.elements?.forEach((element: any) => {
          questionMap[element.name] = {
            title: element.title || element.name,
            type: element.type,
          };
        });
      });
    }

    // Transform results to match existing API format
    const transformedResults = results.map((result) => ({
      id: result.id,
      surveyId: result.surveyId,
      userId: result.userId,
      adminId: result.adminId,
      data: (() => {
        try {
          return typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        } catch (error) {
          console.error('Error parsing result data:', error);
          return result.data; // Return original data if parsing fails
        }
      })(),
      submittedAt: result.submittedAt, // Already ISO string format
    }));

    return NextResponse.json({
      surveyName,
      questionMap,
      results: transformedResults,
    });
  } catch (error) {
    console.error("Error reading results:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey results" },
      { status: 500 }
    );
  }
}
