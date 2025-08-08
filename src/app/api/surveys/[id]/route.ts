import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET - Fetch a specific survey
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const surveysPath = path.join(process.cwd(), 'data', 'surveys.json');
    const surveysData = fs.readFileSync(surveysPath, 'utf8');
    const surveys = JSON.parse(surveysData);
    
    const survey = surveys.find((s: any) => s.id === id);
    
    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(survey);
    
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
    
    const surveysPath = path.join(process.cwd(), 'data', 'surveys.json');
    const surveysData = fs.readFileSync(surveysPath, 'utf8');
    const surveys = JSON.parse(surveysData);
    
    const surveyIndex = surveys.findIndex((s: any) => s.id === id);
    
    if (surveyIndex === -1) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    surveys[surveyIndex] = {
      ...surveys[surveyIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(surveysPath, JSON.stringify(surveys, null, 2));
    
    return NextResponse.json(surveys[surveyIndex]);
    
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
    
    const surveysPath = path.join(process.cwd(), 'data', 'surveys.json');
    const surveysData = fs.readFileSync(surveysPath, 'utf8');
    const surveys = JSON.parse(surveysData);
    
    const surveyIndex = surveys.findIndex((s: any) => s.id === id);
    
    if (surveyIndex === -1) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    surveys.splice(surveyIndex, 1);
    fs.writeFileSync(surveysPath, JSON.stringify(surveys, null, 2));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 