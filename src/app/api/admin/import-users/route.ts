import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "../../../../db/client";
import { importRowSchema } from "../../../../lib/validation/import-schemas";
import {
  validateEgyptianPhone,
  validateEmail as utilValidateEmail,
} from "@/utils/errors";
import {
  upsertUser,
  upsertSurvey,
  upsertUserAssignment,
  getUsersByEmails,
} from "../../../../db/queries/users";
import { happinessAssignments, happinessSurveys } from "@/db/schema/happiness";
import { userAssignments } from "../../../../db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Row limit: 50,000
const MAX_ROWS = 50000;

// Input validation functions
const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  return utilValidateEmail(email.trim());
};

const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") return true; // Optional field

  // Clean phone number: remove Excel apostrophe prefix and whitespace
  let cleanPhone = phone.toString().trim();
  if (cleanPhone.startsWith("'")) {
    cleanPhone = cleanPhone.substring(1);
  }

  // If phone doesn't start with 0 and looks like Egyptian format, add leading 0
  if (cleanPhone && /^1[0-2,5]{1}[0-9]{8}$/.test(cleanPhone)) {
    cleanPhone = "0" + cleanPhone;
  }

  return validateEgyptianPhone(cleanPhone);
};

const validateName = (name: string): boolean => {
  if (!name || typeof name !== "string") return true; // Optional field
  return name.trim().length >= 1 && name.trim().length <= 100;
};

// Enhanced row validation with precise column-level error reporting
const validateRow = async (
  row: any,
  rowIndex: number
): Promise<{
  isValid: boolean;
  errors: string[];
  cleanedRow?: any;
  rowData: any;
}> => {
  const errors: string[] = [];
  const rowData = {
    email: row.email?.toString().trim() || "",
    name: row.name?.toString().trim() || "",
    phone: row.phone?.toString().trim() || "",
  };

  // 1. Email validation - Required and must match standard email format
  if (!rowData.email) {
    errors.push("Email is required");
  } else if (!validateEmail(rowData.email)) {
    errors.push("Invalid email format");
  }

  // 2. Name validation - Optional
  if (rowData.name && !validateName(rowData.name)) {
    errors.push("Name must be between 1 and 100 characters");
  }

  // 3. Phone validation - Optional, but if present must be valid Egyptian format
  let cleanedPhone = rowData.phone;
  if (rowData.phone) {
    // Clean phone number: remove Excel apostrophe prefix and whitespace
    cleanedPhone = rowData.phone.toString().trim();
    if (cleanedPhone.startsWith("'")) {
      cleanedPhone = cleanedPhone.substring(1);
    }

    // If phone doesn't start with 0 and looks like Egyptian format, add leading 0
    if (cleanedPhone && /^1[0-2,5]{1}[0-9]{8}$/.test(cleanedPhone)) {
      cleanedPhone = "0" + cleanedPhone;
    }

    if (!validateEgyptianPhone(cleanedPhone)) {
      errors.push(
        "Phone number must be in Egyptian format (e.g., 01012345678 or +20-10-1234-5678)"
      );
    }
  }

  // Clean and normalize data for processing
  const cleanedRow = {
    email: rowData.email.toLowerCase(),
    name: rowData.name || null,
    phone: cleanedPhone || null,
  };

  return {
    isValid: errors.length === 0,
    errors,
    cleanedRow: errors.length === 0 ? cleanedRow : undefined,
    rowData,
  };
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("❌ Failed to parse form data:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid form data format",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;
    // Parse survey IDs from form data (handle both array and JSON string formats)
    const rawSurveyIds = formData.getAll("surveyIds");
    const rawHappinessSurveyIds = formData.getAll("happinessSurveyIds");

    const surveyIds =
      rawSurveyIds.length > 0
        ? rawSurveyIds
            .flatMap((id) => {
              try {
                // If it's a JSON string, parse it
                return typeof id === "string" && id.startsWith("[")
                  ? JSON.parse(id)
                  : [id];
              } catch {
                // If parsing fails, treat as regular string
                return [id];
              }
            })
            .filter((id) => id && id.trim() !== "")
        : [];

    const happinessSurveyIds =
      rawHappinessSurveyIds.length > 0
        ? rawHappinessSurveyIds
            .flatMap((id) => {
              try {
                // If it's a JSON string, parse it
                return typeof id === "string" && id.startsWith("[")
                  ? JSON.parse(id)
                  : [id];
              } catch {
                // If parsing fails, treat as regular string
                return [id];
              }
            })
            .filter((id) => id && id.trim() !== "")
        : [];
    const companyId = formData.get("companyId") as string;
    const dryRun = formData.get("dryRun") === "1";

    // Validate required parameters - must have at least one assignment method
    const hasCompany = !!companyId;
    const hasSurveys = surveyIds.length > 0 || happinessSurveyIds.length > 0;

    if (!hasCompany && !hasSurveys) {
      console.error("❌ Missing assignment parameters");
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select at least one of the following: Company, Regular Survey, or Happiness Survey.",
        },
        { status: 400 }
      );
    }

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

    // Convert file to buffer with error handling
    let arrayBuffer: ArrayBuffer;
    let buffer: Buffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

    } catch (error) {
      console.error("❌ Failed to convert file to buffer:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to read file data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    // Parse Excel/CSV file with comprehensive error handling
    let workbook: XLSX.WorkBook;
    try {

      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        // Handle CSV files
        const csvString = buffer.toString("utf-8");
        if (!csvString.trim()) {
          return NextResponse.json(
            {
              success: false,
              error: "CSV file is empty",
            },
            { status: 400 }
          );
        }
        workbook = XLSX.read(csvString, { type: "string" });
      } else {
        // Handle Excel files
        if (buffer.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Excel file is empty",
            },
            { status: 400 }
          );
        }
        workbook = XLSX.read(buffer, { type: "buffer" });
      }

    } catch (parseError) {
      console.error("❌ File parsing error:", parseError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to parse file. Please ensure it's a valid Excel or CSV file.",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
        { status: 400 }
      );
    }

    // Get first sheet with validation
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No sheets found in the file",
        },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json(
        {
          success: false,
          error: `Sheet '${sheetName}' not found or is empty`,
        },
        { status: 400 }
      );
    }

    // Convert to JSON with error handling
    let rawData: any[];
    try {
      rawData = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

    } catch (error) {
      console.error("❌ Failed to convert sheet to JSON:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process sheet data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    // Validate row count
    if (rawData.length > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `File contains ${rawData.length} rows, which exceeds the limit of ${MAX_ROWS}`,
        },
        { status: 400 }
      );
    }

    if (rawData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File contains no data rows. Please ensure the file has data below the headers.",
        },
        { status: 400 }
      );
    }

    // Comprehensive row-by-row validation with detailed error reporting
    const validRows: any[] = [];
    const errors: Array<{
      row: number;
      data: any;
      errors: string[];
    }> = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows are 1-indexed and we have headers

      try {
        // Skip completely empty rows
        if (
          !row ||
          Object.keys(row).length === 0 ||
          Object.values(row).every(
            (val) => !val || val.toString().trim() === ""
          )
        ) {

          continue;
        }

        // Normalize row data with multiple column name variations
        const normalizedRow = {
          email: (row.email || row.Email || row.EMAIL || "").toString().trim(),
          name: (
            row.name ||
            row.Name ||
            row.NAME ||
            row["Full Name"] ||
            row.fullName ||
            ""
          )
            .toString()
            .trim(),
          phone:
            (
              row.phone ||
              row.Phone ||
              row.PHONE ||
              row.mobile ||
              row.Mobile ||
              row.MOBILE ||
              ""
            )
              .toString()
              .trim() || null,
          companyId:
            (
              row.companyId ||
              row.CompanyId ||
              row.COMPANYID ||
              row.company_id ||
              row["Company ID"] ||
              ""
            )
              .toString()
              .trim() || null,
        };

        // Validate using our enhanced async validation
        const validation = await validateRow(normalizedRow, rowNumber);

        if (validation.isValid && validation.cleanedRow) {
          validRows.push({
            ...validation.cleanedRow,
            originalRowNumber: rowNumber,
          });

        } else {
          errors.push({
            row: rowNumber,
            data: validation.rowData,
            errors: validation.errors,
          });
          console.warn(
            `❌ Row ${rowNumber} validation failed:`,
            validation.errors
          );
        }
      } catch (validationError: any) {
        console.error(
          `❌ Unexpected error validating row ${rowNumber}:`,
          validationError
        );
        errors.push({
          row: rowNumber,
          data: row,
          errors: [
            `Validation error: ${validationError.message || "Unknown error"}`,
          ],
        });
      }
    }

    // Prepare response structure
    const responseData = {
      success: true,
      totalRows: rawData.length,
      validRows: validRows.length,
      errors,
      processingTime: Date.now() - startTime,
      dryRun,
    };

    // if (validRows.length === 0) {
    //   return NextResponse.json(
    //     {
    //       ...responseData,
    //       success: false,
    //       error: "No valid rows found after validation",
    //     },
    //     { status: 400 }
    //   );
    // }

    // If dry run, return validation results without processing
    if (dryRun) {

      // Simulate assignment creation for dry run
      const simulatedStats = {
        insertedUsers: 0,
        updatedUsers: 0,
        insertedAssignments: 0,
        skippedAssignments: 0,
        duplicateAssignments: 0,
        errors: [],
        processingTime: 0,
      };

      // Simulate processing each valid row
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];

        if (companyId) {

        }

        if (surveyIds.length > 0) {

        }

        if (happinessSurveyIds.length > 0) {

        }

        // Simulate user creation/update
        simulatedStats.insertedUsers++; // Assume new user for simulation

        // Simulate assignment creation (company + additional surveys)
        const totalAssignments =
          (companyId ? 2 : 0) + surveyIds.length + happinessSurveyIds.length; // Assume 2 company surveys
        simulatedStats.insertedAssignments += totalAssignments;
      }

      return NextResponse.json({
        ...responseData,
        importResults: simulatedStats,
        message: `Dry run completed successfully. Would import ${validRows.length} users with mixed survey assignments. No data was saved.`,
      });
    }

    // Process the import with comprehensive error handling
    let importResults;
    try {

      // Handle different import scenarios
      if (hasCompany && !hasSurveys) {
        // Company-only import: assign all company surveys

        importResults = await processCompanyImport(validRows, companyId);
      } else {
        // Mixed import: company surveys + manual surveys

        importResults = await processMixedImport(
          validRows,
          companyId,
          surveyIds,
          happinessSurveyIds
        );
      }

    } catch (importError) {
      console.error("❌ Import process failed:", importError);
      return NextResponse.json(
        {
          ...responseData,
          success: false,
          error: "Import process failed",
          details:
            importError instanceof Error
              ? importError.message
              : "Unknown import error",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...responseData,
      importResults,
      message: `Successfully processed ${validRows.length} rows`,
    });
  } catch (error) {
    console.error("❌ Unexpected error in import endpoint:", error);

    // Return structured error response instead of generic 500
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during import",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

async function processImport(
  validRows: any[],
  surveyId: string,
  surveyType: "regular" | "happiness",
  companyId?: string
) {
  const startTime = Date.now();

  // Enhanced statistics tracking
  const stats = {
    insertedUsers: 0,
    updatedUsers: 0,
    insertedAssignments: 0,
    skippedAssignments: 0,
    duplicateAssignments: 0,
    errors: [] as Array<{
      row: number;
      email: string;
      error: string;
      type: "duplicate" | "error" | "constraint";
    }>,
    processingTime: 0,
  };

  try {
    // Extract unique emails for batch lookups
    const uniqueEmails = Array.from(new Set(validRows.map((row) => row.email)));

    // Validate that the survey exists first

    let survey: any;
    try {
      if (surveyType === "happiness") {
        const happinessSurvey = await db
          .select()
          .from(happinessSurveys)
          .where(eq(happinessSurveys.id, surveyId))
          .limit(1);

        if (happinessSurvey.length === 0) {
          throw new Error(
            `Happiness survey with ID ${surveyId} does not exist`
          );
        }
        survey = happinessSurvey[0];
      } else {
        const { surveys } = await import("../../../../db/schema");
        const regularSurvey = await db
          .select()
          .from(surveys)
          .where(eq(surveys.id, surveyId))
          .limit(1);

        if (regularSurvey.length === 0) {
          throw new Error(`Regular survey with ID ${surveyId} does not exist`);
        }
        survey = regularSurvey[0];
      }

    } catch (error) {
      console.error("❌ Survey validation failed:", error);
      throw new Error(
        `Survey validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Batch lookup existing users with error handling
    let existingUsers: any[] = [];
    let existingUsersMap = new Map();
    try {
      existingUsers = await getUsersByEmails(uniqueEmails);
      existingUsersMap = new Map(
        existingUsers.map((user) => [user.email, user])
      );

    } catch (error) {
      console.error("❌ Failed to lookup existing users:", error);
      throw new Error(
        `Failed to lookup existing users: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Get company name if companyId is provided
    let companyName: string | undefined;
    if (companyId) {
      try {
        const { companies } = await import("../../../../db/schema");
        const company = await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);

        if (company.length > 0) {
          companyName = company[0].name;

        } else {
          console.warn(
            `⚠️ Company ID ${companyId} not found, proceeding without company`
          );
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch company name:", error);
      }
    }

    // Process rows with comprehensive error handling

    // Process each row individually with full error isolation
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNumber = row.originalRowNumber || i + 1;

      try {
        // Safe user upsert with comprehensive error handling
        let userResult: any;
        try {

          // Check if user already exists first
          const existingUser = existingUsersMap.get(row.email);

          if (existingUser) {

            userResult = {
              user: existingUser,
              created: false,
            };
            stats.updatedUsers++;
          } else {

            userResult = await upsertUser({
              email: row.email,
              name: row.name || undefined,
              phone: row.phone || undefined,
              status: "active",
              companyId: companyId || undefined,
              companyName: companyName || undefined,
            });

            if (userResult.created) {
              stats.insertedUsers++;
              // Add to existing users map to avoid duplicate lookups
              existingUsersMap.set(row.email, userResult.user);

            } else {
              stats.updatedUsers++;

            }
          }
        } catch (userError: any) {
          console.error(`❌ User upsert failed for ${row.email}:`, userError);
          stats.errors.push({
            row: rowNumber,
            email: row.email,
            error: `User creation/update failed: ${
              userError.message || "Unknown error"
            }`,
            type: "error",
          });
          continue; // Skip to next row
        }

        // Safe assignment creation with duplicate checking
        try {

          const existingAssignment = await checkExistingAssignment(
            userResult.user.id,
            surveyId,
            surveyType
          );

          if (existingAssignment.alreadyAssigned) {

            stats.duplicateAssignments++;
            stats.skippedAssignments++;
            continue; // Skip assignment creation for this specific survey, but don't count as error
          }

          // Create assignment based on survey type

          if (surveyType === "happiness") {
            try {

              const assignmentId = nanoid();
              await db.insert(happinessAssignments).values({
                id: assignmentId,
                surveyId: surveyId,
                userId: userResult.user.id,
                assignedBy: "admin",
                notes: "Imported via CSV",
              });

              // Assignment created successfully
              stats.insertedAssignments++;

            } catch (assignmentError: any) {
              console.error(`❌ Happiness assignment creation failed:`, {
                error: assignmentError.message,
                code: assignmentError.code,
                userId: userResult.user.id,
                surveyId,
                email: userResult.user.email,
              });

              if (
                assignmentError.message?.includes("UNIQUE constraint") ||
                assignmentError.code === "SQLITE_CONSTRAINT_UNIQUE"
              ) {

                stats.duplicateAssignments++;
                stats.skippedAssignments++;
              } else {
                throw assignmentError; // Re-throw other errors
              }
            }
          } else {
            // Regular survey assignment
            try {

              const { createUserAssignment } = await import(
                "../../../../db/queries/users"
              );
              const assignmentResult = await createUserAssignment({
                userId: userResult.user.id,
                surveyId: surveyId,
                status: "pending",
              });

              if (assignmentResult) {
                stats.insertedAssignments++;

              } else {
                console.warn(
                  `⚠️ Regular assignment creation returned empty result`
                );
              }
            } catch (assignmentError: any) {
              console.error(`❌ Regular assignment creation failed:`, {
                error: assignmentError.message,
                code: assignmentError.code,
                userId: userResult.user.id,
                surveyId,
                email: userResult.user.email,
              });

              if (
                assignmentError.message?.includes("UNIQUE constraint") ||
                assignmentError.code === "SQLITE_CONSTRAINT_UNIQUE"
              ) {

                stats.duplicateAssignments++;
                stats.skippedAssignments++;
              } else {
                throw assignmentError; // Re-throw other errors
              }
            }
          }
        } catch (assignmentError: any) {
          console.error(
            `❌ Assignment creation error for ${userResult.user.email}:`,
            assignmentError
          );
          stats.errors.push({
            row: rowNumber,
            email: row.email,
            error: `Assignment creation failed: ${
              assignmentError.message || "Unknown error"
            }`,
            type: "error",
          });
        }
      } catch (rowError: any) {
        console.error(
          `❌ Unexpected error processing row ${rowNumber}:`,
          rowError
        );
        stats.errors.push({
          row: rowNumber,
          email: row.email || "N/A",
          error: `Row processing failed: ${
            rowError.message || "Unknown error"
          }`,
          type: "error",
        });
      }
    }

    // Calculate final statistics
    stats.processingTime = Date.now() - startTime;

    return stats;
  } catch (processError) {
    console.error("❌ Import process failed:", processError);
    throw new Error(
      `Import process failed: ${
        processError instanceof Error ? processError.message : "Unknown error"
      }`
    );
  }
}

// Process company-only import: create users and assign them to all company surveys
async function processCompanyImport(validRows: any[], companyId: string) {
  const startTime = Date.now();

  const stats = {
    insertedUsers: 0,
    updatedUsers: 0,
    insertedAssignments: 0,
    skippedAssignments: 0,
    duplicateAssignments: 0,
    errors: [] as Array<{
      row: number;
      email: string;
      error: string;
      type: "duplicate" | "error" | "constraint";
    }>,
    processingTime: 0,
  };

  try {
    // Get all surveys assigned to this company
    const { db } = await import("../../../../db");
    const { surveys } = await import("../../../../db/schema/surveys");
    const { happinessSurveys } = await import(
      "../../../../db/schema/happiness"
    );
    const { eq } = await import("drizzle-orm");

    // Fetch company info
    const { getCompanyById } = await import("../../../../db/queries/companies");
    const company = await getCompanyById(companyId);
    const companyName = company?.name || null;

    // Get surveys assigned to this company using the many-to-many relationship
    const { getCompanySurveys, getCompanyHappinessSurveys } = await import(
      "../../../../db/queries/survey-company-assignments"
    );

    const [regularSurveys, happinessSurveysData] = await Promise.all([
      getCompanySurveys(companyId),
      getCompanyHappinessSurveys(companyId),
    ]);

    if (regularSurveys.length === 0 && happinessSurveysData.length === 0) {
      throw new Error(
        `No surveys found for company ${companyId}. Please assign surveys to the company first.`
      );
    }

    // Extract unique emails for batch lookups
    const uniqueEmails = Array.from(new Set(validRows.map((row) => row.email)));

    // Get existing users
    const { getUsersByEmails } = await import("../../../../db/queries/users");
    const existingUsers = await getUsersByEmails(uniqueEmails);
    const existingUsersMap = new Map(
      existingUsers.map((user) => [user.email, user])
    );

    // Process each user
    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];
      try {
        let user = existingUsersMap.get(row.email);

        if (!user) {
          // Create new user
          const { createUser } = await import("../../../../db/queries/users");
          user = await createUser({
            email: row.email,
            name: row.name || null,
            phone: row.phone || null,
            status: "active",
            companyId: companyId,
            companyName: companyName,
          });
          stats.insertedUsers++;

        } else {
          // Update existing user with company if not already set
          if (!user.companyId) {
            const { updateUser } = await import("../../../../db/queries/users");
            await updateUser(user.id, {
              companyId: companyId,
              companyName: companyName,
            });
            stats.updatedUsers++;

          }
        }

        // Create assignments for all company surveys
        const { userAssignments } = await import(
          "../../../../db/schema/user-assignments"
        );
        const { happinessAssignments } = await import(
          "../../../../db/schema/happiness"
        );
        const { nanoid } = await import("nanoid");

        const now = new Date();

        // Regular survey assignments
        for (const survey of regularSurveys) {
          try {
            await db.insert(userAssignments).values({
              userId: user.id,
              surveyId: survey.id,
              assignedAt: now,
              status: "pending",
            });
            stats.insertedAssignments++;
          } catch (error: any) {
            if (
              error.message?.includes("UNIQUE constraint failed") ||
              error.message?.includes("Duplicate entry") ||
              error.code === "ER_DUP_ENTRY" ||
              error.cause?.code === "ER_DUP_ENTRY" ||
              error.cause?.message?.includes("Duplicate entry")
            ) {
              stats.duplicateAssignments++;

            } else {
              throw error;
            }
          }
        }

        // Happiness survey assignments
        for (const survey of happinessSurveysData) {
          try {
            await db.insert(happinessAssignments).values({
              id: nanoid(),
              userId: user.id,
              surveyId: survey.id,
              assignedAt: now,
              assignedBy: "system",
              isActive: true,
            });
            stats.insertedAssignments++;
          } catch (error: any) {
            if (
              error.message?.includes("UNIQUE constraint failed") ||
              error.message?.includes("Duplicate entry") ||
              error.code === "ER_DUP_ENTRY" ||
              error.cause?.code === "ER_DUP_ENTRY" ||
              error.cause?.message?.includes("Duplicate entry")
            ) {
              stats.duplicateAssignments++;

            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${row.email}:`, error);
        stats.errors.push({
          row: index + 2,
          email: row.email,
          error: error instanceof Error ? error.message : "Unknown error",
          type: "error",
        });
      }
    }

    stats.processingTime = Date.now() - startTime;

    return stats;
  } catch (error) {
    console.error("❌ Company import process failed:", error);
    throw new Error(
      `Company import process failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Process mixed import: company surveys + additional manual surveys
async function processMixedImport(
  validRows: any[],
  companyId?: string,
  additionalSurveyIds: string[] = [],
  additionalHappinessSurveyIds: string[] = []
) {
  const startTime = Date.now();

  const stats = {
    insertedUsers: 0,
    updatedUsers: 0,
    insertedAssignments: 0,
    skippedAssignments: 0,
    duplicateAssignments: 0,
    errors: [] as Array<{
      row: number;
      email: string;
      error: string;
      type: "duplicate" | "error" | "constraint";
    }>,
    processingTime: 0,
  };

  try {
    const { db } = await import("../../../../db");
    const { surveys } = await import("../../../../db/schema/surveys");
    const { happinessSurveys } = await import(
      "../../../../db/schema/happiness"
    );
    const { eq } = await import("drizzle-orm");

    // Get company surveys and company info if company is selected
    let companySurveys: any[] = [];
    let companyHappinessSurveys: any[] = [];
    let companyName: string | null = null;

    if (companyId) {
      // Fetch company info
      const { getCompanyById } = await import(
        "../../../../db/queries/companies"
      );
      const company = await getCompanyById(companyId);
      companyName = company?.name || null;

      const [companyRegularSurveys, companyHappinessData] = await Promise.all([
        db
          .select({ id: surveys.id, title: surveys.title })
          .from(surveys)
          .where(eq(surveys.companyId, companyId)),
        db
          .select({ id: happinessSurveys.id, title: happinessSurveys.title })
          .from(happinessSurveys)
          .where(eq(happinessSurveys.companyId, companyId)),
      ]);

      companySurveys = companyRegularSurveys;
      companyHappinessSurveys = companyHappinessData;

    }

    // Combine company surveys with additional surveys
    const allRegularSurveyIds = [
      ...companySurveys.map((s) => s.id),
      ...additionalSurveyIds,
    ];
    const allHappinessSurveyIds = [
      ...companyHappinessSurveys.map((s) => s.id),
      ...additionalHappinessSurveyIds,
    ];

    // Remove duplicates
    const finalRegularSurveyIds = Array.from(new Set(allRegularSurveyIds));
    const finalHappinessSurveyIds = Array.from(new Set(allHappinessSurveyIds));

    // Extract unique emails for batch lookups
    const uniqueEmails = Array.from(new Set(validRows.map((row) => row.email)));

    // Get existing users
    const { getUsersByEmails } = await import("../../../../db/queries/users");
    const existingUsers = await getUsersByEmails(uniqueEmails);
    const existingUsersMap = new Map(
      existingUsers.map((user) => [user.email, user])
    );

    // Process each user
    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];
      try {
        let user = existingUsersMap.get(row.email);

        if (!user) {
          // Create new user
          const { createUser } = await import("../../../../db/queries/users");
          user = await createUser({
            email: row.email,
            name: row.name || null,
            phone: row.phone || null,
            status: "active",
            companyId: companyId || null,
            companyName: companyName,
          });
          stats.insertedUsers++;

        } else {
          // Update existing user with company if provided and not already set
          if (companyId && !user.companyId) {
            const { updateUser } = await import("../../../../db/queries/users");
            await updateUser(user.id, {
              companyId: companyId,
              companyName: companyName,
            });
            stats.updatedUsers++;

          }
        }

        // Create assignments for all surveys
        const { userAssignments } = await import(
          "../../../../db/schema/user-assignments"
        );
        const { happinessAssignments } = await import(
          "../../../../db/schema/happiness"
        );
        const { nanoid } = await import("nanoid");

        const now = new Date();

        // Regular survey assignments
        for (const surveyId of finalRegularSurveyIds) {
          try {
            await db.insert(userAssignments).values({
              userId: user.id,
              surveyId: surveyId,
              assignedAt: now,
              status: "pending",
            });
            stats.insertedAssignments++;
          } catch (error: any) {
            if (
              error.message?.includes("UNIQUE constraint failed") ||
              error.message?.includes("Duplicate entry") ||
              error.code === "ER_DUP_ENTRY" ||
              error.cause?.code === "ER_DUP_ENTRY" ||
              error.cause?.message?.includes("Duplicate entry")
            ) {
              stats.duplicateAssignments++;

            } else {
              throw error;
            }
          }
        }

        // Happiness survey assignments
        for (const surveyId of finalHappinessSurveyIds) {
          try {
            await db.insert(happinessAssignments).values({
              id: nanoid(),
              userId: user.id,
              surveyId: surveyId,
              assignedAt: now,
              assignedBy: "system",
              isActive: true,
            });
            stats.insertedAssignments++;
          } catch (error: any) {
            if (
              error.message?.includes("UNIQUE constraint failed") ||
              error.message?.includes("Duplicate entry") ||
              error.code === "ER_DUP_ENTRY" ||
              error.cause?.code === "ER_DUP_ENTRY" ||
              error.cause?.message?.includes("Duplicate entry")
            ) {
              stats.duplicateAssignments++;

            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${row.email}:`, error);
        stats.errors.push({
          row: index + 2,
          email: row.email,
          error: error instanceof Error ? error.message : "Unknown error",
          type: "error",
        });
      }
    }

    stats.processingTime = Date.now() - startTime;

    return stats;
  } catch (error) {
    console.error("❌ Mixed import process failed:", error);
    throw new Error(
      `Mixed import process failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Check if user is already assigned to this specific survey
async function checkExistingAssignment(
  userId: string,
  targetSurveyId: string,
  targetSurveyType: string
): Promise<{
  alreadyAssigned: boolean;
  message?: string;
}> {
  try {
    if (targetSurveyType === "happiness") {
      // Check existing happiness survey assignment for this specific survey
      const existingHappinessAssignment = await db
        .select()
        .from(happinessAssignments)
        .where(
          and(
            eq(happinessAssignments.surveyId, targetSurveyId),
            eq(happinessAssignments.userId, userId),
            eq(happinessAssignments.isActive, true)
          )
        )
        .limit(1);

      if (existingHappinessAssignment.length > 0) {
        return {
          alreadyAssigned: true,
          message: `User already assigned to happiness survey ${targetSurveyId}`,
        };
      }
    } else {
      // Check existing regular survey assignment for this specific survey
      const existingRegularAssignment = await db
        .select()
        .from(userAssignments)
        .where(
          and(
            eq(userAssignments.surveyId, targetSurveyId),
            eq(userAssignments.userId, userId)
          )
        )
        .limit(1);

      if (existingRegularAssignment.length > 0) {
        return {
          alreadyAssigned: true,
          message: `User already assigned to regular survey ${targetSurveyId}`,
        };
      }
    }

    return {
      alreadyAssigned: false,
    };
  } catch (error) {
    console.error("Error checking existing assignment:", error);
    return {
      alreadyAssigned: false,
      message: "Error checking existing assignment",
    };
  }
}
