import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// SQLite database instance
let sqlite: Database | undefined;

function createConnection() {
  // Guard against Edge runtime
  if (typeof window !== "undefined") {
    throw new Error("Database client cannot be used in browser environment");
  }

  if (!sqlite) {
    // Always use local SQLite file for now, ignore DATABASE_URL
    const dbPath = path.join(process.cwd(), "surveyjs.db");

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    sqlite = new Database(dbPath);

    // Enable foreign keys
    sqlite.pragma("foreign_keys = ON");

    console.log("📊 SQLite database connected:", dbPath);
  }

  return sqlite;
}

// Initialize Drizzle with SQLite
export const db = drizzle(createConnection(), { schema });

// Export types for use in other parts of the application
export type Database = typeof db;
export * from "./schema";
