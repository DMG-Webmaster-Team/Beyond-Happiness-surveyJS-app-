import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// MySQL connection pool
let connectionPool: mysql.Pool | null = null;

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  if (connectionPool) {
    try {
      await connectionPool.end();
      connectionPool = null;
      console.log("📊 Database connection pool closed");
    } catch (error) {
      console.error("Error closing database pool:", error);
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

  if (!connectionPool) {
    const connectionConfig = {
      host: "localhost",
      user: "root",
      password: "root",
      database: "happiness_survey",
      socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
      connectionLimit: 3, // Further reduced to prevent connection issues
      queueLimit: 0,
    };

    try {
      connectionPool = mysql.createPool(connectionConfig);

      console.log(
        "📊 MySQL database connected via socket:",
        connectionConfig.socketPath
      );
      console.log("🚀 Connection pool created with 10 connections");
    } catch (error) {
      console.error("❌ Failed to create MySQL connection pool:", error);
      throw error;
    }
  }

  return connectionPool;
}

// Initialize Drizzle with MySQL
export const db = drizzle(createConnection(), { schema, mode: "default" });

// Export types for use in other parts of the application
export type DatabaseInstance = typeof db;
