import { eq, like, desc, and, inArray } from "drizzle-orm";
import { db } from "../client";
import {
  users,
  userAssignments,
  surveys,
  type User,
  type NewUser,
} from "../schema";
import { createId } from "@paralleldrive/cuid2";

// Get user by ID
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return result[0];
}

// Get user by phone
export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  return result[0];
}

// Get users by emails (batch lookup)
export async function getUsersByEmails(emails: string[]): Promise<User[]> {
  if (emails.length === 0) return [];

  const normalizedEmails = emails.map((email) => email.toLowerCase());
  return db.select().from(users).where(inArray(users.email, normalizedEmails));
}

// Get users by company ID
export async function getUsersByCompany(companyId: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.companyId, companyId))
    .orderBy(desc(users.createdAt));
}

// Create new user
export async function createUser(
  userData: Omit<NewUser, "id" | "createdAt" | "updatedAt">
): Promise<User> {
  const now = new Date();
  const newUser: NewUser = {
    id: createId(),
    ...userData,
    createdAt: now,
    updatedAt: now,
  };

  const userId = newUser.id || require("nanoid").nanoid();
  await db.insert(users).values({ ...newUser, id: userId });
  return { ...newUser, id: userId };
}

// Update user
export async function updateUser(
  id: string,
  userData: Partial<Omit<NewUser, "id" | "createdAt">>
): Promise<User | undefined> {
  const updateData = {
    ...userData,
    updatedAt: new Date(),
  };

  const result = await db.update(users).set(updateData).where(eq(users.id, id));
  return result[0];
}

// Upsert user (create if not exists, update if exists)
export async function upsertUser(
  userData: Omit<NewUser, "id" | "createdAt" | "updatedAt">
): Promise<{ user: User; created: boolean }> {
  const existingUser = await getUserByEmail(userData.email);

  if (existingUser) {
    // Update existing user
    const updatedUser = await updateUser(existingUser.id, userData);
    return { user: updatedUser!, created: false };
  } else {
    // Create new user
    const newUser = await createUser(userData);
    return { user: newUser, created: true };
  }
}

// Delete user (soft delete by setting status to inactive)
export async function deleteUser(id: string): Promise<boolean> {
  const result = await db
    .update(users)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(users.id, id));

  return result.changes > 0;
}

// List users with pagination and search
export async function listUsers(params: {
  query?: string;
  page?: number;
  limit?: number;
  status?: string;
  companyId?: string;
}): Promise<{
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { query = "", page = 1, limit = 20, status, companyId } = params;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (query) {
    conditions.push(like(users.email, `%${query}%`));
    conditions.push(like(users.name, `%${query}%`));
  }
  if (status) {
    conditions.push(eq(users.status, status));
  }
  if (companyId) {
    conditions.push(eq(users.companyId, companyId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: users.id })
    .from(users)
    .where(whereClause);

  const total = countResult.length;

  // Get users
  const usersResult = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt), desc(users.id)) // Fallback to id if createdAt is null
    .limit(limit)
    .offset(offset);

  return {
    users: usersResult,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// Get user assignments
export async function getUserAssignments(userId: string): Promise<any[]> {
  return db
    .select({
      assignment: userAssignments,
      survey: surveys,
    })
    .from(userAssignments)
    .innerJoin(surveys, eq(userAssignments.surveyId, surveys.id))
    .where(eq(userAssignments.userId, userId));
}

// Create user assignment
export async function createUserAssignment(assignmentData: {
  userId: string;
  surveyId: string;
  dueAt?: number;
  status?: string;
}): Promise<any> {
  const now = new Date();
  const newAssignment = {
    userId: assignmentData.userId,
    surveyId: assignmentData.surveyId,
    assignedAt: now,
    dueAt: assignmentData.dueAt || null,
    status: assignmentData.status || "pending",
  };

  const result = await db.insert(userAssignments).values(newAssignment);
  return result[0];
}

// Upsert user assignment
export async function upsertUserAssignment(assignmentData: {
  userId: string;
  surveyId: string;
  dueAt?: number;
  status?: string;
}): Promise<any> {
  const existingAssignment = await db
    .select()
    .from(userAssignments)
    .where(
      and(
        eq(userAssignments.userId, assignmentData.userId),
        eq(userAssignments.surveyId, assignmentData.surveyId)
      )
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    // Update existing assignment
    const result = await db
      .update(userAssignments)
      .set({
        dueAt: assignmentData.dueAt || existingAssignment[0].dueAt,
        status: assignmentData.status || existingAssignment[0].status,
      })
      .where(
        and(
          eq(userAssignments.userId, assignmentData.userId),
          eq(userAssignments.surveyId, assignmentData.surveyId)
        )
      );
    return result[0];
  } else {
    // Create new assignment
    return createUserAssignment(assignmentData);
  }
}

// Get survey by ID
export async function getSurveyById(id: string): Promise<any> {
  const result = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, id))
    .limit(1);
  return result[0];
}

// Upsert survey
export async function upsertSurvey(surveyData: {
  id: string;
  title: string;
  description?: string;
  canTakeMultiple?: boolean;
  createdBy: string;
}): Promise<{ survey: any; created: boolean }> {
  const existingSurvey = await getSurveyById(surveyData.id);

  if (existingSurvey) {
    // Update existing survey
    const result = await db
      .update(surveys)
      .set({
        title: surveyData.title,
        description: surveyData.description || existingSurvey.description,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(surveys.id, surveyData.id));
    const updatedSurvey = await getSurveyById(surveyData.id);
    return { survey: updatedSurvey, created: false };
  } else {
    // Create new survey
    const now = new Date();
    const newSurvey = {
      id: surveyData.id,
      title: surveyData.title,
      description: surveyData.description || "",
      definition: "{}", // Default empty JSON definition
      canTakeMultiple: surveyData.canTakeMultiple ? 1 : 0,
      createdBy: surveyData.createdBy,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.insert(surveys).values(newSurvey);
    return { survey: newSurvey, created: true };
  }
}

export async function createHappinessAssignment(assignmentData: {
  userId: string;
  surveyId: string;
  assignedBy: string;
  isActive: boolean;
}): Promise<any> {
  const { happinessAssignments } = await import("../schema/happiness");
  const { nanoid } = await import("nanoid");

  const [assignment] = await db.insert(happinessAssignments).values({
    id: nanoid(),
    userId: assignmentData.userId,
    surveyId: assignmentData.surveyId,
    assignedBy: assignmentData.assignedBy,
    isActive: assignmentData.isActive,
    // assignedAt will use default value from schema
  });
  return assignment;
}
