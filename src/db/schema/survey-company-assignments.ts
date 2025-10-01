import {
  mysqlTable,
  varchar,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { surveys } from "./surveys";
import { companies } from "./companies";

export const surveyCompanyAssignments = mysqlTable(
  "survey_company_assignments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    surveyId: varchar("survey_id", { length: 128 })
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    companyId: varchar("company_id", { length: 128 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Assignment metadata
    assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
    assignedBy: varchar("assigned_by", { length: 128 }), // Admin who made the assignment
  },
  (table) => ({
    surveyIdIdx: index("survey_company_assignment_survey_id_idx").on(
      table.surveyId
    ),
    companyIdIdx: index("survey_company_assignment_company_id_idx").on(
      table.companyId
    ),
    surveyCompanyIdx: index("survey_company_assignment_survey_company_idx").on(
      table.surveyId,
      table.companyId
    ),
  })
);

// Similar table for happiness surveys
export const happinessSurveyCompanyAssignments = mysqlTable(
  "happiness_survey_company_assignments",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    surveyId: varchar("survey_id", { length: 128 })
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }), // References happiness surveys
    companyId: varchar("company_id", { length: 128 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Assignment metadata
    assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
    assignedBy: varchar("assigned_by", { length: 128 }), // Admin who made the assignment
  },
  (table) => ({
    surveyIdIdx: index("happiness_survey_company_assignment_survey_id_idx").on(
      table.surveyId
    ),
    companyIdIdx: index(
      "happiness_survey_company_assignment_company_id_idx"
    ).on(table.companyId),
    surveyCompanyIdx: index(
      "happiness_survey_company_assignment_survey_company_idx"
    ).on(table.surveyId, table.companyId),
  })
);

export type SurveyCompanyAssignment =
  typeof surveyCompanyAssignments.$inferSelect;
export type NewSurveyCompanyAssignment =
  typeof surveyCompanyAssignments.$inferInsert;

export type HappinessSurveyCompanyAssignment =
  typeof happinessSurveyCompanyAssignments.$inferSelect;
export type NewHappinessSurveyCompanyAssignment =
  typeof happinessSurveyCompanyAssignments.$inferInsert;
