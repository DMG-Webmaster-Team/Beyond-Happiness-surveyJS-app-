import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// MySQL connection pool
let connectionPool: mysql.Pool | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
let isReconnecting = false;

// Parse DATABASE_URL or use individual environment variables
function getConnectionConfig(): mysql.PoolOptions {
  // Try DATABASE_URL first (recommended for production)
  if (process.env.DATABASE_URL) {
    try {
      // Parse mysql://user:password@host:port/database
      const url = new URL(process.env.DATABASE_URL);
      const config: mysql.PoolOptions = {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading '/'
        connectionLimit: 10,
        queueLimit: 50,
        idleTimeout: 60000,
        maxIdle: 2,
      };

      // Only add socketPath if it's a local socket connection (not in production)
      if (
        url.protocol === "mysql:" &&
        url.hostname === "localhost" &&
        process.env.NODE_ENV === "development"
      ) {
        // Check if socket path is provided in query params
        const socketPath = url.searchParams.get("socketPath");
        if (socketPath) {
          config.socketPath = socketPath;
        }
      }

      return config;
    } catch (error) {
      console.error(
        "❌ Failed  to parse DATABASE_URL,  falling back to individual variables:",
        error
      );
    }
  }

  // Fall back to individual environment variables
  const config: mysql.PoolOptions = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "surveyjs_nextjs",
    connectionLimit: 10,
    queueLimit: 50,
    idleTimeout: 60000,
    maxIdle: 2,
  };

  // Only use socketPath in development with localhost
  if (
    config.host === "localhost" &&
    process.env.NODE_ENV === "development" &&
    process.env.DB_SOCKET_PATH
  ) {
    config.socketPath = process.env.DB_SOCKET_PATH;
  }

  return config;
}

// Connection configuration - now reads from environment variables
const CONNECTION_CONFIG = getConnectionConfig();

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  if (connectionPool) {
    try {
      await connectionPool.end();
      connectionPool = null;
      console.log("📊 Database connection pool closed gracefully");
    } catch (error) {
      console.error("❌ Error closing database pool:", error);
    }
  }
}

// Handle process termination
if (typeof process !== "undefined") {
  process.on("SIGINT", closeDatabase);
  process.on("SIGTERM", closeDatabase);
  process.on("exit", closeDatabase);
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
    closeDatabase();
  });
}

// Enhanced health check function
async function healthCheck(): Promise<boolean> {
  if (!connectionPool) {
    console.log("🔍 Health check: No connection pool exists");
    return false;
  }

  try {
    const connection = await connectionPool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Database health check passed");
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return false;
  }
}

// Ensure healthy connection with automatic recovery
export async function ensureHealthyConnection(): Promise<mysql.Pool> {
  // Prevent concurrent reconnection attempts
  if (isReconnecting) {
    console.log("⏳ Reconnection already in progress, waiting...");
    // Wait for ongoing reconnection
    while (isReconnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // If pool exists and is healthy, return it
  if (connectionPool && (await healthCheck())) {
    return connectionPool;
  }

  // Mark as reconnecting
  isReconnecting = true;

  try {
    console.log("🔄 Creating/recreating database connection pool...");

    // Close existing pool if it exists
    if (connectionPool) {
      try {
        await connectionPool.end();
        console.log("🗑️ Old connection pool closed");
      } catch (error) {
        console.error("⚠️ Error closing old pool:", error);
      }
      connectionPool = null;
    }

    connectionAttempts++;
    if (connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
      throw new Error(
        `❌ Failed to create database connection after ${MAX_CONNECTION_ATTEMPTS} attempts`
      );
    }

    // Create new connection pool
    connectionPool = mysql.createPool(CONNECTION_CONFIG);

    // Test the connection immediately
    const testConnection = await connectionPool.getConnection();
    await testConnection.ping();
    testConnection.release();

    console.log(
      CONNECTION_CONFIG.socketPath
        ? `✅ MySQL database connected via socket: ${CONNECTION_CONFIG.socketPath}`
        : `✅ MySQL database connected to ${CONNECTION_CONFIG.host}:${CONNECTION_CONFIG.port}/${CONNECTION_CONFIG.database}`
    );
    console.log(
      `🚀 Connection pool created with ${CONNECTION_CONFIG.connectionLimit} connections`
    );
    console.log(
      `📊 Pool stats: Queue limit: ${CONNECTION_CONFIG.queueLimit}, Idle timeout: ${CONNECTION_CONFIG.idleTimeout}ms`
    );

    // Reset connection attempts on success
    connectionAttempts = 0;

    return connectionPool;
  } catch (error) {
    console.error("❌ Failed to create/recreate MySQL connection pool:", error);
    connectionPool = null;
    throw error;
  } finally {
    isReconnecting = false;
  }
}

// Utility to manually reconnect (for scripts/cron jobs)
export async function reconnect(): Promise<void> {
  console.log("🔄 Manual reconnection requested");
  connectionPool = null;
  connectionAttempts = 0;
  await ensureHealthyConnection();
  console.log("✅ Manual reconnection completed");
}

// Legacy createConnection function - now uses ensureHealthyConnection
async function createConnection(): Promise<mysql.Pool> {
  // Guard against Edge runtime
  if (typeof window !== "undefined") {
    throw new Error("❌ Database client cannot be used in browser environment");
  }

  return await ensureHealthyConnection();
}

// Legacy synchronous db export (deprecated - use getDb() instead)
// This creates the connection immediately but doesn't ensure health
export const db = drizzle(mysql.createPool(CONNECTION_CONFIG), {
  schema,
  mode: "default",
});

// Create a lazy-initialized Drizzle instance
let drizzleInstance: typeof db | null = null;

// Get Drizzle instance with health check
export async function getDb() {
  if (!drizzleInstance) {
    const pool = await ensureHealthyConnection();
    drizzleInstance = drizzle(pool, { schema, mode: "default" }) as typeof db;
    console.log("🔧 Drizzle ORM initialized with healthy connection pool");
  }
  return drizzleInstance;
}

// Database query wrapper with automatic health check and error handling
export async function withDb<T>(
  operation: (dbInstance: Awaited<ReturnType<typeof getDb>>) => Promise<T>,
  operationName: string = "database operation"
): Promise<T> {
  try {
    console.log(`🔍 Starting ${operationName}...`);
    const dbInstance = await getDb();
    const result = await operation(dbInstance);
    console.log(`✅ ${operationName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);

    // If it's a connection error, reset the Drizzle instance
    if (
      error instanceof Error &&
      (error.message.includes("Connection") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("PROTOCOL_CONNECTION_LOST"))
    ) {
      console.log("🔄 Connection error detected, resetting Drizzle instance");
      drizzleInstance = null;
    }

    throw error;
  }
}

// Export types for use in other parts of the application
export type DatabaseInstance = typeof db;
