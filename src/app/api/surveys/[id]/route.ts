import { NextRequest, NextResponse } from 'next/server';
import { getSurveyById, updateSurvey, deleteSurvey } from '../../../../db/queries/surveys';

// GET - Fetch a specific survey
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const survey = await getSurveyById(id);
    
    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    // Transform to match existing API response format
    const response = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      canTakeMultiple: survey.canTakeMultiple,
      createdAt: survey.createdAt?.toISOString(),
      updatedAt: survey.updatedAt?.toISOString(),
      adminId: survey.createdBy,
      json: survey.definition,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    
    const updatedSurvey = await updateSurvey(id, {
      title: updateData.title,
      description: updateData.description,
      definition: updateData.json,
      canTakeMultiple: updateData.canTakeMultiple,
    });
    
    if (!updatedSurvey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    // Transform response to match existing API format
    const response = {
      id: updatedSurvey.id,
      title: updatedSurvey.title,
      description: updatedSurvey.description,
      canTakeMultiple: updatedSurvey.canTakeMultiple,
      createdAt: updatedSurvey.createdAt?.toISOString(),
      updatedAt: updatedSurvey.updatedAt?.toISOString(),
      adminId: updatedSurvey.createdBy,
      json: updatedSurvey.definition,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    
    const deleted = await deleteSurvey(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 