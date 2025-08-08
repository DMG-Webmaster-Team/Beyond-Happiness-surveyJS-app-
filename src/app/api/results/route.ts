import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET - Fetch results for a specific survey
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const adminId = searchParams.get("adminId");

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

    const resultsPath = path.join(process.cwd(), "data", "results.json");
    const resultsData = fs.readFileSync(resultsPath, "utf8");
    const results = JSON.parse(resultsData);

    // Read survey configuration to determine duplication policy
    const surveysPath = path.join(process.cwd(), "data", "surveys.json");
    const surveysData = fs.readFileSync(surveysPath, "utf8");
    const surveys = JSON.parse(surveysData);
    const survey = surveys.find((s: any) => s.id === resultData.surveyId);
    const canTakeMultiple = Boolean(survey?.canTakeMultiple);

    // Block duplicates only for one-time surveys
    if (!canTakeMultiple) {
      const existingResult = results.find(
        (r: any) =>
          r.userId === resultData.userId && r.surveyId === resultData.surveyId
      );

      if (existingResult) {
        return NextResponse.json(
          { error: "Survey already submitted by this user" },
          { status: 400 }
        );
      }
    }

    // Generate new result ID
    const newResult = {
      ...resultData,
      id: `result${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };

    results.push(newResult);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Update user's submission status for one-time surveys
    if (!canTakeMultiple) {
      const usersPath = path.join(process.cwd(), "data", "users.json");
      const usersData = fs.readFileSync(usersPath, "utf8");
      const users = JSON.parse(usersData);

      const userIndex = users.findIndex((u: any) => u.id === resultData.userId);
      if (userIndex !== -1) {
        users[userIndex].hasSubmitted = true;
        users[userIndex].submittedAt = new Date().toISOString();
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
      }
    }

    return NextResponse.json(newResult);
  } catch (error) {
    console.error("Error submitting results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
