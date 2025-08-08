import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET - Fetch surveys for a specific admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    
    const surveysPath = path.join(process.cwd(), 'data', 'surveys.json');
    const surveysData = fs.readFileSync(surveysPath, 'utf8');
    const surveys = JSON.parse(surveysData);
    
    if (adminId) {
      const adminSurveys = surveys.filter((survey: any) => survey.adminId === adminId);
      return NextResponse.json(adminSurveys);
    }
    
    return NextResponse.json(surveys);
    
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
    
    const surveysPath = path.join(process.cwd(), 'data', 'surveys.json');
    const surveysData = fs.readFileSync(surveysPath, 'utf8');
    const surveys = JSON.parse(surveysData);
    
    // Generate new survey ID
    const newSurvey = {
      ...surveyData,
      id: `survey${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    surveys.push(newSurvey);
    fs.writeFileSync(surveysPath, JSON.stringify(surveys, null, 2));
    
    return NextResponse.json(newSurvey);
    
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 