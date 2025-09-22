import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Happiness Questions Table
export const happinessQuestions = sqliteTable(
  "happiness_questions",
  {
    id: integer("id").primaryKey(),
    text: text("text").notNull(),
    category: text("category", {
      enum: ["Meaning", "Delight", "Freedom", "Engagement", "Vitality"],
    }).notNull(),
    values: text("values").notNull(), // JSON string of [int, int, int, int, int]
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at").default(sql`(unixepoch())`),
  },
  (table) => ({
    categoryIdx: index("happiness_questions_category_idx").on(table.category),
    isActiveIdx: index("happiness_questions_is_active_idx").on(table.isActive),
  })
);

// Happiness Characters Table
export const happinessCharacters = sqliteTable(
  "happiness_characters",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    match: text("match", { length: 5 }).notNull(), // 5-bit code like "01111"
    avatarUrl: text("avatar_url"),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at").default(sql`(unixepoch())`),
  },
  (table) => ({
    matchIdx: index("happiness_characters_match_idx").on(table.match),
  })
);

// Happiness Surveys Table
export const happinessSurveys = sqliteTable("happiness_surveys", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  anonymous: integer("anonymous", { mode: "boolean" }).default(false),
  retakeCooldownDays: integer("retake_cooldown_days").default(0), // Days before user can retake
  companyId: text("company_id"), // Company assignment
  companyName: text("company_name"), // Company name for easier queries
  isActive: integer("is_active", { mode: "boolean" }).default(true), // true = visible in assignable forms
  isPublished: integer("is_published", { mode: "boolean" }).default(true), // false = "deleted" from admin UI
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

// Happiness Results Table
export const happinessResults = sqliteTable(
  "happiness_results",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => happinessSurveys.id),
    userId: text("user_id"), // nullable for anonymous surveys
    answers: text("answers").notNull(), // JSON array of {questionId, valueIndex, questionText?, answerText?}
    categoryTotals: text("category_totals").notNull(), // JSON object {Meaning: number, ...}
    code: text("code", { length: 5 }).notNull(), // 5-bit string like "01111"
    characterId: integer("character_id")
      .notNull()
      .references(() => happinessCharacters.id),
    language: text("language", { length: 2 }).default("en"), // "en" or "ar"
    createdAt: integer("created_at").default(sql`(unixepoch())`),
  },
  (table) => ({
    surveyUserIdx: index("happiness_results_survey_user_idx").on(
      table.surveyId,
      table.userId
    ),
    surveyIdx: index("happiness_results_survey_idx").on(table.surveyId),
    userIdx: index("happiness_results_user_idx").on(table.userId),
    codeIdx: index("happiness_results_code_idx").on(table.code),
  })
);

// Happiness Survey Assignments Table
export const happinessAssignments = sqliteTable(
  "happiness_assignments",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => happinessSurveys.id),
    userId: text("user_id").notNull(),
    assignedBy: text("assigned_by"), // Admin who assigned
    assignedAt: integer("assigned_at").default(sql`(unixepoch())`),
    completedAt: integer("completed_at"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    notes: text("notes"), // Optional assignment notes
  },
  (table) => ({
    surveyUserIdx: index("happiness_assignments_survey_user_idx").on(
      table.surveyId,
      table.userId
    ),
    userIdx: index("happiness_assignments_user_idx").on(table.userId),
    surveyIdx: index("happiness_assignments_survey_idx").on(table.surveyId),
  })
);

export type HappinessQuestion = typeof happinessQuestions.$inferSelect;
export type HappinessCharacter = typeof happinessCharacters.$inferSelect;
export type HappinessSurvey = typeof happinessSurveys.$inferSelect;
export type HappinessResult = typeof happinessResults.$inferSelect;
export type HappinessAssignment = typeof happinessAssignments.$inferSelect;

export type NewHappinessQuestion = typeof happinessQuestions.$inferInsert;
export type NewHappinessCharacter = typeof happinessCharacters.$inferInsert;
export type NewHappinessSurvey = typeof happinessSurveys.$inferInsert;
export type NewHappinessResult = typeof happinessResults.$inferInsert;
export type NewHappinessAssignment = typeof happinessAssignments.$inferInsert;
