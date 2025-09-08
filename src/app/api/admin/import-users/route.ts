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
import { happinessAssignments, happinessSurveys } from "@/db/schema/happiness";
import { userAssignments } from "../../../../db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Row limit: 50,000
const MAX_ROWS = 50000;

// Input validation functions
const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") return false;
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
};

const validateName = (name: string): boolean => {
  if (!name || typeof name !== "string") return false;
  return name.trim().length >= 1 && name.trim().length <= 100;
};

// Company validation function
const validateCompanyId = async (companyId: string): Promise<boolean> => {
  if (!companyId || typeof companyId !== "string") return true; // Optional field

  try {
    const { companies } = await import("../../../../db/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("../../../../db/client");

    const result = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId.trim()))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Error validating company ID:", error);
    return false;
  }
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
    companyId: row.companyId?.toString().trim() || "",
  };

  // 1. Email validation - Required and must match standard email format
  if (!rowData.email) {
    errors.push("Email is required");
  } else if (!validateEmail(rowData.email)) {
    errors.push("Invalid email format");
  }

  // 2. Name validation - Required
  if (!rowData.name) {
    errors.push("Name is required");
  }

  // 3. Phone validation - Optional, but if present must be valid format
  if (rowData.phone && !validatePhone(rowData.phone)) {
    errors.push("Invalid phone number");
  }

  // 4. Company ID validation - Optional, but if provided must exist in database
  if (rowData.companyId) {
    const isValidCompany = await validateCompanyId(rowData.companyId);
    if (!isValidCompany) {
      errors.push(`Company not found: ${rowData.companyId}`);
    }
  }

  // Clean and normalize data for processing
  const cleanedRow = {
    email: rowData.email.toLowerCase(),
    name: rowData.name,
    phone: rowData.phone ? rowData.phone.replace(/[^\d+]/g, "") : null,
    companyId: rowData.companyId || null,
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
  console.log("🚀 Import users API called at:", new Date().toISOString());

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
    const surveyId = formData.get("surveyId") as string;
    const surveyType = (formData.get("surveyType") as string) || "regular"; // Default to "regular" if not specified
    const companyId = formData.get("companyId") as string;
    const dryRun = formData.get("dryRun") === "1";

    console.log("📋 Import parameters:", {
      surveyId,
      surveyType,
      companyId,
      dryRun,
      fileName: file?.name,
      fileSize: file?.size,
    });

    // Validate required parameters
    if (!surveyId) {
      console.error("❌ Missing surveyId parameter");
      return NextResponse.json(
        {
          success: false,
          error: "Survey ID is required for user import",
        },
        { status: 400 }
      );
    }

    console.log(`📋 Using survey type: ${surveyType}`);

    // Validate survey type
    if (surveyType && !["regular", "happiness"].includes(surveyType)) {
      return NextResponse.json(
        { error: "Survey type must be 'regular' or 'happiness'" },
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
      console.log(`📁 File converted to buffer: ${buffer.length} bytes`);
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
      console.log(`📊 Parsing file: ${file.name} (${file.type})`);

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

      console.log(
        `✅ File parsed successfully. Sheets: ${workbook.SheetNames.join(", ")}`
      );
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
      console.log(
        `📊 Extracted ${rawData.length} rows from sheet '${sheetName}'`
      );
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

    console.log(`📊 Processing ${rawData.length} rows from file: ${file.name}`);

    console.log(`📊 Starting validation for ${rawData.length} rows...`);

    // Comprehensive row-by-row validation with detailed error reporting
    const validRows: any[] = [];
    const errors: Array<{
      row: number;
      data: any;
      errors: string[];
    }> = [];

    console.log(
      `🔍 Starting row-by-row validation for ${rawData.length} rows...`
    );

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
          console.log(`⏭️ Skipping empty row ${rowNumber}`);
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
          console.log(
            `✅ Row ${rowNumber} validated: ${validation.cleanedRow.email}`
          );
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

    console.log(
      `📈 Validation complete: ${validRows.length} valid rows, ${errors.length} errors`
    );

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
      console.log("🧪 Dry run mode - simulating import process...");

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
        console.log(
          `🧪 DRY RUN - Would process: ${row.email} -> ${surveyId} (${surveyType})`
        );

        // Simulate user creation/update
        simulatedStats.insertedUsers++; // Assume new user for simulation

        // Simulate assignment creation
        simulatedStats.insertedAssignments++;
        console.log(
          `🧪 DRY RUN - Would create ${surveyType} assignment: ${row.email} -> ${surveyId}`
        );
      }

      return NextResponse.json({
        ...responseData,
        importResults: simulatedStats,
        message: `Dry run completed successfully. Would import ${validRows.length} users with assignments to survey ${surveyId}. No data was saved.`,
      });
    }

    // Process the import with comprehensive error handling
    let importResults;
    try {
      console.log("🔄 Starting import process...");
      importResults = await processImport(
        validRows,
        surveyId,
        surveyType as "regular" | "happiness", // Type assertion since we validated it above
        companyId
      );
      console.log("✅ Import process completed successfully");
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
  console.log(
    `🔄 Processing import: ${validRows.length} rows for survey ${surveyId} (${surveyType})`
  );

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

    console.log(
      `🔍 Batch lookup: ${uniqueEmails.length} unique emails, assigning to survey: ${surveyId}`
    );

    // Validate that the survey exists first
    console.log("🔍 Validating survey exists...");
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
      console.log(
        `✅ Survey validated: ${survey.title || survey.name || surveyId}`
      );
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
      console.log(
        `📊 Found ${existingUsers.length} existing users out of ${uniqueEmails.length} unique emails`
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
          console.log(`🏢 Company found: ${companyName} (${companyId})`);
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
    console.log("🔄 Starting row-by-row processing...");

    // Process each row individually with full error isolation
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNumber = row.originalRowNumber || i + 1;

      console.log(
        `📋 Processing row ${i + 1}/${
          validRows.length
        } (original row ${rowNumber}): ${row.email} -> ${surveyId}`
      );

      try {
        // Safe user upsert with comprehensive error handling
        let userResult: any;
        try {
          console.log(`👤 Upserting user: ${row.email}`);

          // Check if user already exists first
          const existingUser = existingUsersMap.get(row.email);

          if (existingUser) {
            console.log(`🔄 User exists, updating: ${existingUser.id}`);
            userResult = {
              user: existingUser,
              created: false,
            };
            stats.updatedUsers++;
          } else {
            console.log(`👤 Creating new user: ${row.email}`);
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
              console.log(`✅ User created: ${userResult.user.id}`);
            } else {
              stats.updatedUsers++;
              console.log(`🔄 User updated: ${userResult.user.id}`);
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
          console.log(
            `🔍 Checking existing assignment for user: ${userResult.user.id} -> survey: ${surveyId} (type: ${surveyType})`
          );

          const existingAssignment = await checkExistingAssignment(
            userResult.user.id,
            surveyId,
            surveyType
          );

          console.log(`🔍 Assignment check result:`, {
            userId: userResult.user.id,
            surveyId,
            surveyType,
            alreadyAssigned: existingAssignment.alreadyAssigned,
            message: existingAssignment.message,
          });

          if (existingAssignment.alreadyAssigned) {
            console.log(
              `ℹ️ User ${userResult.user.email} already assigned to survey ${surveyId}, skipping duplicate assignment`
            );

            stats.duplicateAssignments++;
            stats.skippedAssignments++;
            continue; // Skip assignment creation for this specific survey, but don't count as error
          }

          // Create assignment based on survey type
          console.log(
            `🔗 Creating ${surveyType} assignment: ${userResult.user.id} -> ${surveyId}`
          );

          if (surveyType === "happiness") {
            try {
              console.log(`🎯 Inserting happiness assignment:`, {
                surveyId,
                userId: userResult.user.id,
                assignedBy: "admin",
                notes: "Imported via CSV",
              });

              const happinessAssignmentResult = await db
                .insert(happinessAssignments)
                .values({
                  id: nanoid(),
                  surveyId: surveyId,
                  userId: userResult.user.id,
                  assignedBy: "admin",
                  notes: "Imported via CSV",
                })
                .returning();

              if (happinessAssignmentResult.length > 0) {
                stats.insertedAssignments++;
                console.log(`✅ Happiness assignment created successfully:`, {
                  assignmentId: happinessAssignmentResult[0].id,
                  userId: userResult.user.id,
                  surveyId,
                  email: userResult.user.email,
                });
              } else {
                console.warn(
                  `⚠️ Happiness assignment creation returned empty result`
                );
              }
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
                console.log(
                  `ℹ️ Happiness assignment already exists (constraint): ${userResult.user.id} -> ${surveyId}`
                );
                stats.duplicateAssignments++;
                stats.skippedAssignments++;
              } else {
                throw assignmentError; // Re-throw other errors
              }
            }
          } else {
            // Regular survey assignment
            try {
              console.log(`🎯 Inserting regular assignment:`, {
                surveyId,
                userId: userResult.user.id,
                status: "pending",
              });

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
                console.log(`✅ Regular assignment created successfully:`, {
                  userId: assignmentResult.userId,
                  surveyId: assignmentResult.surveyId,
                  email: userResult.user.email,
                  status: assignmentResult.status,
                });
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
                console.log(
                  `ℹ️ Regular assignment already exists (constraint): ${userResult.user.id} -> ${surveyId}`
                );
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

    console.log("✅ Import process completed successfully");
    console.log(`📊 Final Statistics:`, {
      totalProcessed: validRows.length,
      insertedUsers: stats.insertedUsers,
      updatedUsers: stats.updatedUsers,
      insertedAssignments: stats.insertedAssignments,
      skippedAssignments: stats.skippedAssignments,
      duplicateAssignments: stats.duplicateAssignments,
      errors: stats.errors.length,
      processingTime: `${stats.processingTime}ms`,
    });

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
