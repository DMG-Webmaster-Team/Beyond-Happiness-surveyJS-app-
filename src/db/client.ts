import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

type DrizzleDb = MySql2Database<typeof schema>;

const POOL_OPTIONS = {
  connectionLimit: 10,
  queueLimit: 50,
  idleTimeout: 60000,
  maxIdle: 2,
  connectTimeout: 10000,
} as const;

let connectionPool: mysql.Pool | null = null;
let drizzleInstance: DrizzleDb | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
let isReconnecting = false;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function validateProductionDatabaseTarget(
  host: string | undefined,
  usesSocket: boolean
): void {
  if (!isProduction() || usesSocket) return;

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasDbHost = Boolean(process.env.DB_HOST?.trim());

  if (!hasDatabaseUrl && !hasDbHost) {
    throw new Error(
      "Database misconfigured: production requires DATABASE_URL or DB_HOST. " +
        "Do not rely on localhost defaults inside Docker."
    );
  }

  const resolvedHost = host || "localhost";
  const isLocalhost =
    resolvedHost === "localhost" || resolvedHost === "127.0.0.1";

  if (isLocalhost && process.env.ALLOW_LOCALHOST_DB !== "true") {
    throw new Error(
      `Database misconfigured: production cannot use host "${resolvedHost}". ` +
        "Set DATABASE_URL to your remote MySQL host (e.g. mysql://user:pass@db-host:3306/happiness_survey)."
    );
  }
}

function shouldUseSocketFromDatabaseUrl(databaseUrl: string): boolean {
  if (!isProduction() && databaseUrl.includes("localhost")) {
    try {
      const url = new URL(databaseUrl);
      return Boolean(url.searchParams.get("socketPath"));
    } catch {
      return false;
    }
  }
  return false;
}

/** Read DB config at runtime (not at module load) so production env vars are applied. */
export function getConnectionConfig(): mysql.PoolOptions | string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    if (shouldUseSocketFromDatabaseUrl(databaseUrl)) {
      const url = new URL(databaseUrl);
      const socketPath = url.searchParams.get("socketPath");
      if (socketPath) {
        return {
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.slice(1),
          socketPath,
          ...POOL_OPTIONS,
        };
      }
    }

    try {
      const url = new URL(databaseUrl);
      validateProductionDatabaseTarget(url.hostname, false);

      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ""),
        ...POOL_OPTIONS,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Database misconfigured")) {
        throw error;
      }
      console.error("Failed to parse DATABASE_URL, using connection string:", error);
      validateProductionDatabaseTarget(undefined, false);
      return databaseUrl;
    }
  }

  const config: mysql.PoolOptions = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user:
      process.env.DB_USER ||
      process.env.DB_USERNAME ||
      "root",
    password: process.env.DB_PASSWORD || "",
    database:
      process.env.DB_NAME ||
      process.env.DB_DATABASE ||
      "happiness_survey",
    ...POOL_OPTIONS,
  };

  const usesSocket = Boolean(
    config.host === "localhost" &&
      !isProduction() &&
      process.env.DB_SOCKET_PATH
  );

  if (usesSocket) {
    config.socketPath = process.env.DB_SOCKET_PATH;
    delete config.host;
    delete config.port;
  } else {
    validateProductionDatabaseTarget(config.host as string, false);
  }

  return config;
}

function createPoolFromEnv(): mysql.Pool {
  const config = getConnectionConfig();
  if (typeof config === "string") {
    return mysql.createPool(config);
  }
  return mysql.createPool(config);
}

function resetDrizzleInstance(): void {
  drizzleInstance = null;
}

function getOrCreatePool(): mysql.Pool {
  if (!connectionPool) {
    connectionPool = createPoolFromEnv();
  }
  return connectionPool;
}

function getDbSync(): DrizzleDb {
  if (!drizzleInstance) {
    drizzleInstance = drizzle(getOrCreatePool(), {
      schema,
      mode: "default",
    });
  }
  return drizzleInstance;
}

/** Backward-compatible export; pool is created lazily on first use with runtime env. */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop: string | symbol) {
    const instance = getDbSync();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});

export async function closeDatabase() {
  if (connectionPool) {
    try {
      await connectionPool.end();
      connectionPool = null;
      resetDrizzleInstance();
    } catch (error) {
      console.error("Error closing database pool:", error);
    }
  }
}

if (typeof process !== "undefined") {
  process.on("SIGINT", closeDatabase);
  process.on("SIGTERM", closeDatabase);
  process.on("exit", closeDatabase);
}

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

export async function ensureHealthyConnection(): Promise<mysql.Pool> {
  if (isReconnecting) {
    while (isReconnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (connectionPool) return connectionPool;
  }

  if (connectionPool && (await healthCheck())) {
    return connectionPool;
  }

  isReconnecting = true;

  try {
    if (connectionPool) {
      try {
        await connectionPool.end();
      } catch (error) {
        console.error("Error closing old pool:", error);
      }
      connectionPool = null;
      resetDrizzleInstance();
    }

    connectionAttempts++;
    if (connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
      throw new Error(
        `Failed to create database connection after ${MAX_CONNECTION_ATTEMPTS} attempts`
      );
    }

    connectionPool = createPoolFromEnv();

    const testConnection = await connectionPool.getConnection();
    await testConnection.ping();
    testConnection.release();

    connectionAttempts = 0;
    resetDrizzleInstance();
    getDbSync();

    return connectionPool;
  } catch (error) {
    console.error("Failed to create/recreate MySQL connection pool:", error);
    connectionPool = null;
    resetDrizzleInstance();
    throw error;
  } finally {
    isReconnecting = false;
  }
}

export async function reconnect(): Promise<void> {
  connectionPool = null;
  connectionAttempts = 0;
  resetDrizzleInstance();
  await ensureHealthyConnection();
}

export async function getDb(): Promise<DrizzleDb> {
  const pool = await ensureHealthyConnection();
  if (!drizzleInstance) {
    drizzleInstance = drizzle(pool, { schema, mode: "default" });
  }
  return drizzleInstance;
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message;
  const cause = (error as { cause?: Error }).cause;
  const causeCode = cause && "code" in cause ? String(cause.code) : "";

  return (
    message.includes("connect ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    message.includes("PROTOCOL_CONNECTION_LOST") ||
    message.includes("Database misconfigured") ||
    message.includes("ENOTFOUND") ||
    causeCode === "ETIMEDOUT" ||
    causeCode === "ECONNREFUSED"
  );
}

export async function withDb<T>(
  operation: (dbInstance: Awaited<ReturnType<typeof getDb>>) => Promise<T>,
  operationName: string = "database operation"
): Promise<T> {
  try {
    const dbInstance = await getDb();
    return await operation(dbInstance);
  } catch (error) {
    console.error(`${operationName} failed:`, error);

    if (isDatabaseConnectionError(error)) {
      connectionPool = null;
      resetDrizzleInstance();
    }

    throw error;
  }
}

export type DatabaseInstance = DrizzleDb;
