import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Singleton connection pool for serverless environments
let connection: mysql.Pool | undefined;

function createConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Guard against Edge runtime
  if (typeof window !== "undefined") {
    throw new Error("Database client cannot be used in browser environment");
  }

  if (!connection) {
    connection = mysql.createPool({
      uri: process.env.DATABASE_URL,
      // Connection pool settings for serverless
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      // Prevent connections from hanging
      idleTimeout: 300000,
      // SSL configuration (adjust based on provider)
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
    });
  }

  return connection;
}

// Initialize Drizzle with the connection pool
export const db = drizzle(createConnection(), { schema, mode: "default" });

// Export types for use in other parts of the application
export type Database = typeof db;
export * from "./schema";
