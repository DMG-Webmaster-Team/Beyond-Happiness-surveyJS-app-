import { NextRequest, NextResponse } from "next/server";
import { ensureHealthyConnection, withDb, reconnect } from "../../../db/client";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

// GET - Database health check endpoint
export async function GET(request: NextRequest) {
  try {
    console.log("🏥 Health check endpoint called");

    // Test database connection health
    const pool = await ensureHealthyConnection();

    // Get pool status
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    // Return health status
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      message: "Database connection is healthy",
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);
    console.error(
      "Full error stack:",
      error instanceof Error ? error.stack : error
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// POST - Force database reconnection
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Manual reconnection requested via API");

    await reconnect();

    return NextResponse.json({
      status: "success",
      message: "Database reconnection completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual reconnection failed:", error);
    console.error(
      "Full error stack:",
      error instanceof Error ? error.stack : error
    );

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to reconnect to database",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Example of using withDb wrapper for safe database operations
export async function PUT(request: NextRequest) {
  try {
    const result = await withDb(async (db) => {
      // Example query - get count of surveys
      const { surveys } = await import("../../../db/schema/surveys");
      const surveyCount = await db.select().from(surveys);
      return { count: surveyCount.length };
    }, "survey count query");

    return NextResponse.json({
      status: "success",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Database operation failed:", error);
    console.error(
      "Full error stack:",
      error instanceof Error ? error.stack : error
    );

    return NextResponse.json(
      {
        status: "error",
        message: "Database operation failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
