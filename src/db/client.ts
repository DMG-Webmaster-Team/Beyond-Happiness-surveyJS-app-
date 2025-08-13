import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// SQLite database instance
let sqlite: any;

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

    // Performance optimizations for high-throughput imports
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("temp_store = MEMORY");
    sqlite.pragma("cache_size = -64000"); // 64MB cache
    sqlite.pragma("mmap_size = 268435456"); // 256MB mmap

    console.log("📊 SQLite database connected:", dbPath);
    console.log(
      "🚀 Performance optimizations enabled: WAL mode, NORMAL sync, 64MB cache"
    );
  }

  return sqlite;
}

// Initialize Drizzle with SQLite
export const db = drizzle(createConnection(), { schema });

// Export types for use in other parts of the application
export type DatabaseInstance = typeof db;
