import { PrismaClient } from "@prisma/client";

type GlobalPrisma = {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

const globalForPrisma = global as unknown as GlobalPrisma;

const DEFAULT_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);
const DEFAULT_POOL_TIMEOUT_MS = Number(process.env.DB_POOL_TIMEOUT_MS ?? 10_000);

function applyPooling(url: string | undefined): string | undefined {
  if (!url || url.startsWith("file:")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    if (!params.has("connection_limit")) {
      params.set("connection_limit", String(DEFAULT_POOL_MAX));
    }
    if (!params.has("pool_timeout")) {
      params.set("pool_timeout", String(DEFAULT_POOL_TIMEOUT_MS));
    }

    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url;
  }
}

const databaseUrl = applyPooling(process.env.DATABASE_URL);
const isTestEnv = process.env.NODE_ENV === "test";

// In tests we instantiate a fresh client for each run so DATABASE_URL changes are respected.
// In dev/prod we reuse a singleton but recreate it if the target URL changed.
export const prisma = (() => {
  if (isTestEnv) {
    return new PrismaClient({
      log: ["error", "warn"],
      datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    });
  }

  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== databaseUrl) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    });
    globalForPrisma.prismaUrl = databaseUrl;
  }

  return globalForPrisma.prisma;
})();
