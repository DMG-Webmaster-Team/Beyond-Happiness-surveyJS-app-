import {
  mysqlTable,
  varchar,
  text,
  int,
  json,
  boolean,
  timestamp,
  index,
  mysqlEnum,
  char,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// Essentials Table
export const essentials = mysqlTable(
  "essentials",
  {
    id: int("id").primaryKey().autoincrement(),
    truth: mysqlEnum("truth", [
      "Meaning",
      "Delight",
      "Freedom",
      "Engagement",
      "Vitality",
    ]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    truthIdx: index("essentials_truth_idx").on(table.truth),
  })
);

// Happiness Questions Table
export const happinessQuestions = mysqlTable(
  "happiness_questions",
  {
    id: int("id").primaryKey().autoincrement(),
    text: text("text").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    categoryValues: json("category_values").notNull(), // JSON array of [int, int, int, int, int] for category scoring
    essentialId: int("essential_id").references(() => essentials.id), // Reference to essentials table
    essentialValues: json("essential_values"), // JSON array of [int, int, int, int, int] for essential scoring (optional)
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    categoryIdx: index("happiness_questions_category_idx").on(table.category),
    isActiveIdx: index("happiness_questions_is_active_idx").on(table.isActive),
  })
);

// Happiness Characters Table
export const happinessCharacters = mysqlTable(
  "happiness_characters",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull(),
    match: varchar("match", { length: 5 }).notNull(), // 5-bit code like "01111"
    avatarUrl: varchar("avatar_url", { length: 500 }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    matchIdx: index("happiness_characters_match_idx").on(table.match),
  })
);

// Happiness Surveys Table
export const happinessSurveys = mysqlTable("happiness_surveys", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  anonymous: boolean("anonymous").default(false),
  accessMode: mysqlEnum("access_mode", [
    "login",
    "anonymous",
    "collect_info",
  ]).default("login"), // Access mode for survey
  retakeCooldownDays: int("retake_cooldown_days").default(0), // Days before user can retake
  companyId: varchar("company_id", { length: 128 }), // Company assignment
  companyName: varchar("company_name", { length: 255 }), // Company name for easier queries
  isActive: boolean("is_active").default(true), // true = visible in assignable forms
  isPublished: boolean("is_published").default(true), // false = "deleted" from admin UI
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

// Happiness Results Table
export const happinessResults = mysqlTable(
  "happiness_results",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    surveyId: varchar("survey_id", { length: 128 })
      .notNull()
      .references(() => happinessSurveys.id),
    userId: varchar("user_id", { length: 128 }), // nullable for anonymous surveys
    answers: json("answers").notNull(), // JSON array of {questionId, valueIndex, questionText?, answerText?}
    categoryTotals: json("category_totals").notNull(), // JSON object {Meaning: number, ...}
    essentialTotals: json("essential_totals"), // JSON object {essential_1: number, essential_2: number, ...}
    code: varchar("code", { length: 10 }).notNull(), // 5-bit string like "01111"
    characterId: int("character_id")
      .notNull()
      .references(() => happinessCharacters.id),
    collectedUserData: json("collected_user_data"), // JSON object with name, email, phone, gender, age for collect_info mode
    language: varchar("language", { length: 10 }).default("en"), // "en" or "ar"
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`),
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
export const happinessAssignments = mysqlTable(
  "happiness_assignments",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    surveyId: varchar("survey_id", { length: 128 })
      .notNull()
      .references(() => happinessSurveys.id),
    userId: varchar("user_id", { length: 128 }).notNull(),
    assignedBy: varchar("assigned_by", { length: 128 }), // Admin who assigned
    assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
    completedAt: timestamp("completed_at"),
    isActive: boolean("is_active").default(true),
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

export type Essential = typeof essentials.$inferSelect;
export type HappinessQuestion = typeof happinessQuestions.$inferSelect;
export type HappinessCharacter = typeof happinessCharacters.$inferSelect;
export type HappinessSurvey = typeof happinessSurveys.$inferSelect;
export type HappinessResult = typeof happinessResults.$inferSelect;
export type HappinessAssignment = typeof happinessAssignments.$inferSelect;

export type NewEssential = typeof essentials.$inferInsert;
export type NewHappinessQuestion = typeof happinessQuestions.$inferInsert;
export type NewHappinessCharacter = typeof happinessCharacters.$inferInsert;
export type NewHappinessSurvey = typeof happinessSurveys.$inferInsert;
export type NewHappinessResult = typeof happinessResults.$inferInsert;
export type NewHappinessAssignment = typeof happinessAssignments.$inferInsert;
