import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// MySQL connection pool
let connectionPool: mysql.Pool | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

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

// Health check function
async function healthCheck(): Promise<boolean> {
  if (!connectionPool) return false;

  try {
    const connection = await connectionPool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
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
      connectionLimit: 2, // Conservative limit to prevent "too many connections"
      queueLimit: 20, // Reasonable queue size
      idleTimeout: 60000, // 60 seconds idle timeout
      maxIdle: 1, // Keep minimal idle connections
    };

    try {
      connectionPool = mysql.createPool(connectionConfig);

      console.log(
        "📊 MySQL database connected via socket:",
        connectionConfig.socketPath
      );
      console.log(
        `🚀 Connection pool created with ${connectionConfig.connectionLimit} connections`
      );
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
