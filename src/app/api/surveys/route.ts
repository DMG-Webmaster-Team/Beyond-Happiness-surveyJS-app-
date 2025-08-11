import { NextRequest, NextResponse } from 'next/server';
import { listSurveys, listSurveysByAdmin, createSurvey } from '../../../db/queries/surveys';

// GET - Fetch surveys for a specific admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    
    let surveys;
    if (adminId) {
      surveys = await listSurveysByAdmin(adminId);
    } else {
      surveys = await listSurveys();
    }
    
    // Transform to match existing API response format
    const transformedSurveys = surveys.map(survey => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      canTakeMultiple: survey.canTakeMultiple,
      createdAt: survey.createdAt?.toISOString(),
      updatedAt: survey.updatedAt?.toISOString(),
      adminId: survey.createdBy, // Map createdBy to adminId for backwards compatibility
    }));
    
    return NextResponse.json(transformedSurveys);
    
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      createdAt: newSurvey.createdAt?.toISOString(),
      updatedAt: newSurvey.updatedAt?.toISOString(),
      adminId: newSurvey.createdBy,
      json: newSurvey.definition,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 