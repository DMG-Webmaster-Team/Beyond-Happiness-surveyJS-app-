import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// SQLite database instance
let sqlite: any;

// Cleanup function for graceful shutdown
export function closeDatabase() {
  if (sqlite) {
    try {
      sqlite.close();
      sqlite = null;
      console.log("📊 Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

// Handle process termination
if (typeof process !== "undefined") {
  process.on("SIGINT", closeDatabase);
  process.on("SIGTERM", closeDatabase);
  process.on("exit", closeDatabase);
}

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

    // Performance optimizations with better I/O error handling
    try {
      // Try WAL mode first, fallback to DELETE if it fails
      const journalMode = sqlite.pragma("journal_mode = WAL", { simple: true });
      if (journalMode !== "wal") {
        console.warn("⚠️ WAL mode failed, falling back to DELETE mode");
        sqlite.pragma("journal_mode = DELETE");
      }

      sqlite.pragma("synchronous = NORMAL");
      sqlite.pragma("temp_store = MEMORY");
      sqlite.pragma("cache_size = -64000"); // 64MB cache

      // Only set mmap if WAL mode is working
      if (journalMode === "wal") {
        sqlite.pragma("mmap_size = 268435456"); // 256MB mmap
      }

      // Test a simple query to ensure connection is working
      sqlite.prepare("SELECT 1").get();
    } catch (error) {
      console.error(
        "⚠️ Database optimization failed, using default settings:",
        error
      );
      // Reset to safe defaults
      sqlite.pragma("journal_mode = DELETE");
      sqlite.pragma("synchronous = FULL");
    }

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
