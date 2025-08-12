import { z } from "zod";

// Schema for individual import row
export const importRowSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().trim().optional(),
  surveyId: z.string().trim().min(1),
  surveyTitle: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  dueAt: z.string().optional().transform((val) => {
    if (!val || val.trim() === "") return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date.getTime();
  }),
});

// Schema for import request
export const importRequestSchema = z.object({
  dryRun: z.boolean().default(false),
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
    "File size must be less than 10MB"
  ),
});

// Schema for user creation/update
export const userSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  companyId: z.number().optional(),
});

// Schema for user assignment
export const userAssignmentSchema = z.object({
  userId: z.string().min(1),
  surveyId: z.string().min(1),
  dueAt: z.number().optional(),
  status: z.enum(["pending", "active", "completed", "overdue"]).default("pending"),
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
