import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { surveys } from "./surveys";
import { companies } from "./companies";

export const surveyCompanyAssignments = sqliteTable(
  "survey_company_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Assignment metadata
    assignedAt: integer("assigned_at").$defaultFn(() => Date.now()),
    assignedBy: text("assigned_by"), // Admin who made the assignment
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
export const happinessSurveyCompanyAssignments = sqliteTable(
  "happiness_survey_company_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }), // References happiness surveys
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Assignment metadata
    assignedAt: integer("assigned_at").$defaultFn(() => Date.now()),
    assignedBy: text("assigned_by"), // Admin who made the assignment
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

