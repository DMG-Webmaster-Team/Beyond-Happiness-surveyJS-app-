import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "../../../../db/client";
import { importRowSchema } from "../../../../lib/validation/import-schemas";
import {
  upsertUser,
  upsertSurvey,
  upsertUserAssignment,
  getUsersByEmails,
} from "../../../../db/queries/users";
import { inArray } from "drizzle-orm";

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Row limit: 50,000
const MAX_ROWS = 50000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const dryRun = formData.get("dryRun") === "1";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload Excel (.xlsx, .xls) or CSV (.csv) files",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel/CSV file
    let workbook: XLSX.WorkBook;
    try {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        // Handle CSV files
        const csvString = buffer.toString("utf-8");
        workbook = XLSX.read(csvString, { type: "string" });
      } else {
        // Handle Excel files
        workbook = XLSX.read(buffer, { type: "buffer" });
      }
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return NextResponse.json(
        {
          error:
            "Failed to parse file. Please ensure it's a valid Excel or CSV file.",
        },
        { status: 400 }
      );
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with consistent empty field handling
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    // Validate row count
    if (rawData.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `File contains ${rawData.length} rows, which exceeds the limit of ${MAX_ROWS}`,
        },
        { status: 400 }
      );
    }

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "File contains no data" },
        { status: 400 }
      );
    }

    console.log(`📊 Processing ${rawData.length} rows from file: ${file.name}`);

    // Parse and validate each row
    const validRows: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows are 1-indexed and we have headers

      try {
        // Normalize row data
        const normalizedRow = {
          email: (row.email || row.Email || "").toString().trim(),
          name: (row.name || row.Name || "").toString().trim(),
          surveyId: (row.surveyId || row.survey_id || row["Survey ID"] || "")
            .toString()
            .trim(),
        };

        // Validate row
        const validatedRow = importRowSchema.parse(normalizedRow);
        validRows.push(validatedRow);
      } catch (validationError: any) {
        errors.push({
          row: rowNumber,
          data: row,
          error: validationError.message,
        });
      }
    }

    console.log(`✅ Valid rows: ${validRows.length}, Errors: ${errors.length}`);

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in file", errors },
        { status: 400 }
      );
    }

    // If dry run, return validation results without processing
    if (dryRun) {
      return NextResponse.json({
        message: "Dry run completed",
        totalRows: rawData.length,
        validRows: validRows.length,
        errors,
        dryRun: true,
      });
    }

    // Process valid rows in database transaction
    const importResults = await processImport(validRows);

    return NextResponse.json({
      message: "Import completed successfully",
      totalRows: rawData.length,
      validRows: validRows.length,
      errors,
      importResults,
      dryRun: false,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error during import" },
      { status: 500 }
    );
  }
}

async function processImport(validRows: any[]) {
  const startTime = Date.now();

  // Statistics tracking
  const stats = {
    insertedUsers: 0,
    updatedUsers: 0,
    insertedAssignments: 0,
    updatedAssignments: 0,
    skipped: 0,
  };

  try {
    // Extract unique emails and survey IDs for batch lookups
    const uniqueEmails = Array.from(new Set(validRows.map((row) => row.email)));
    const uniqueSurveyIds = Array.from(
      new Set(validRows.map((row) => row.surveyId))
    );

    console.log(
      `🔍 Batch lookup: ${uniqueEmails.length} unique emails, ${uniqueSurveyIds.length} unique surveys`
    );

    // Batch lookup existing users and surveys
    const existingUsers = await getUsersByEmails(uniqueEmails);
    const existingUsersMap = new Map(
      existingUsers.map((user) => [user.email, user])
    );

    // Get existing surveys
    console.log("🔍 Looking up existing surveys...");
    const { surveys } = await import("../../../../db/schema");
    console.log("📋 Surveys schema imported:", surveys ? "success" : "failed");

    const existingSurveys = await db
      .select()
      .from(surveys)
      .where(inArray(surveys.id, uniqueSurveyIds));
    console.log(
      "📊 Survey lookup result:",
      existingSurveys.length,
      "surveys found"
    );

    const existingSurveysMap = new Map(
      existingSurveys.map((survey: any) => [survey.id, survey])
    );
    console.log(
      "🗺️ Survey map created with keys:",
      Array.from(existingSurveysMap.keys())
    );

    console.log(
      `📊 Found ${existingUsers.length} existing users, ${existingSurveys.length} existing surveys`
    );

    // Validate that all survey IDs exist
    const missingSurveys = uniqueSurveyIds.filter(
      (id) => !existingSurveysMap.has(id)
    );
    if (missingSurveys.length > 0) {
      throw new Error(
        `The following surveys do not exist: ${missingSurveys.join(
          ", "
        )}. Please create them first.`
      );
    }

    // Process rows sequentially (SQLite doesn't support async transactions well)
    console.log("🔄 Starting import process...");

    try {
      console.log("📝 Processing rows...");

      // Process each row
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        console.log(
          `📋 Processing row ${i + 1}/${validRows.length}: ${row.email} -> ${
            row.surveyId
          }`
        );

        try {
          // Upsert user
          console.log(`👤 Upserting user: ${row.email}`);
          const userResult = await upsertUser({
            email: row.email,
            name: row.name || undefined,
            status: "active", // Default status
          });

          if (userResult.created) {
            stats.insertedUsers++;
            console.log(`✅ User created: ${userResult.user.id}`);
          } else {
            stats.updatedUsers++;
            console.log(`🔄 User updated: ${userResult.user.id}`);
          }

          // Upsert user assignment
          console.log(
            `🔗 Creating assignment: ${userResult.user.id} -> ${row.surveyId}`
          );
          const assignmentResult = await upsertUserAssignment({
            userId: userResult.user.id,
            surveyId: row.surveyId,
            status: "pending", // Default status
          });

          if (assignmentResult) {
            stats.insertedAssignments++;
            console.log(
              `✅ Assignment created: ${assignmentResult.userId} -> ${assignmentResult.surveyId}`
            );
          }
        } catch (rowError) {
          console.error(`❌ Error processing row ${i + 1}:`, row, rowError);
          stats.skipped++;
        }
      }

      console.log("✅ Import process completed successfully");
    } catch (processError) {
      console.error("❌ Import process failed:", processError);
      throw new Error(
        `Import process failed: ${
          processError instanceof Error ? processError.message : "Unknown error"
        }`
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`⚡ Import completed in ${processingTime}ms`);

    return {
      ...stats,
      processingTimeMs: processingTime,
    };
  } catch (transactionError) {
    console.error("Transaction error:", transactionError);
    throw new Error("Database transaction failed during import");
  }
}
