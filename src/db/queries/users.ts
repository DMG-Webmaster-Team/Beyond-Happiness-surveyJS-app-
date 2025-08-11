import { eq, and } from "drizzle-orm";
import { db } from "../client";
import { users, type User, type NewUser } from "../schema/users";
import { z } from "zod";

// Validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  name: z.string().optional(),
  otp: z.string().optional(),
  assignedSurveyId: z.string().optional(),
  companyId: z.number().optional(),
});

export const updateUserSchema = createUserSchema.partial();

// Query functions
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByPhoneAndOtp(phone: string, otp: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.phone, phone), eq(users.otp, otp)))
    .limit(1);
  return result[0];
}

export async function createUser(userData: z.infer<typeof createUserSchema>): Promise<User> {
  const validatedData = createUserSchema.parse(userData);
  const result = await db.insert(users).values(validatedData).returning();
  return result[0];
}

export async function updateUser(id: string, userData: z.infer<typeof updateUserSchema>): Promise<User | undefined> {
  const validatedData = updateUserSchema.parse(userData);
  const result = await db
    .update(users)
    .set(validatedData)
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function markUserAsSubmitted(id: string, submittedAt: Date = new Date()): Promise<User | undefined> {
  const result = await db
    .update(users)
    .set({ hasSubmitted: true, submittedAt })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function getUsersByAssignedSurvey(surveyId: string): Promise<User[]> {
  return db.select().from(users).where(eq(users.assignedSurveyId, surveyId));
}
