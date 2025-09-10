import { z } from "zod";

// Schema for individual import row
export const importRowSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

// Schema for import request
export const importRequestSchema = z
  .object({
    dryRun: z.boolean().default(false),
    surveyId: z.string().optional(),
    happinessSurveyId: z.string().optional(),
    companyId: z.string().optional(),
    file: z.instanceof(File).refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
      "File size must be less than 10MB"
    ),
  })
  .refine(
    (data) => {
      // Must have at least one: company, regular survey, or happiness survey
      return !!(data.companyId || data.surveyId || data.happinessSurveyId);
    },
    {
      message:
        "Please select at least one of the following: Company, Regular Survey, or Happiness Survey.",
    }
  );

// Schema for user creation/update
export const userSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  companyId: z.string().optional(),
  surveyAssignments: z.array(z.string()).optional(),
  happinessSurveyAssignments: z.array(z.string()).optional(),
});

// Schema for user assignment
export const userAssignmentSchema = z.object({
  userId: z.string().min(1),
  surveyId: z.string().min(1),
  dueAt: z.number().optional(),
  status: z
    .enum(["pending", "active", "completed", "overdue"])
    .default("pending"),
});

// Schema for survey creation/update
export const surveyImportSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  canTakeMultiple: z.boolean().default(false),
  createdBy: z.string().min(1),
});

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type User = z.infer<typeof userSchema>;
export type UserAssignment = z.infer<typeof userAssignmentSchema>;
export type SurveyImport = z.infer<typeof surveyImportSchema>;
