import { beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import {
  systemConfigService,
  SystemConfigValues,
} from "../services/systemConfigService.js";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgrespassword@localhost:55432/whatsself_test?schema=test";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "7d";
process.env.RATE_MAX_PER_MIN = "100";
process.env.RATE_PER_CONTACT_PER_5MIN = "10";
process.env.BUSINESS_HOURS = "00:00-23:59";
process.env.SKIP_WHATSAPP = "true";
process.env.DEFAULT_ADMIN_PASSWORD = "TestAdmin!234";
process.env.DEFAULT_ADMIN_EMAIL = "admin@whatsself.local";
process.env.CONFIG_CRYPTO_KEY =
  process.env.CONFIG_CRYPTO_KEY ?? "TestCryptoKey1234567890";
process.env.WINDOWS_LONG_PATH_SUPPORT =
  process.env.WINDOWS_LONG_PATH_SUPPORT ?? "true";

const TEST_DATA_DIR = resolve(process.cwd(), "data");
const TEST_CIRCUIT_STATE = resolve(TEST_DATA_DIR, "circuit_state_test.json");
const TEST_QUEUE_STATE = resolve(
  TEST_DATA_DIR,
  "message_queue_state_test.json",
);

if (!existsSync(TEST_DATA_DIR)) {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
}

for (const file of [TEST_CIRCUIT_STATE, TEST_QUEUE_STATE]) {
  if (existsSync(file)) {
    unlinkSync(file);
  }
}

process.env.CIRCUIT_BREAKER_STATE_PATH = TEST_CIRCUIT_STATE;
process.env.MESSAGE_QUEUE_STATE_PATH = TEST_QUEUE_STATE;

// Create a test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DB_URL,
    },
  },
});

// Global setup
beforeAll(async () => {
  const defaults: SystemConfigValues = {
    jwtSecret: process.env.JWT_SECRET!,
    defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL!,
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD!,
    skipWhatsapp: process.env.SKIP_WHATSAPP === "true",
    puppeteerExecutablePath: null,
    rateMaxPerMin: Number(process.env.RATE_MAX_PER_MIN) || 12,
    ratePerContactPer5Min: Number(process.env.RATE_PER_CONTACT_PER_5MIN) || 2,
    businessHoursStart: (process.env.BUSINESS_HOURS || "09:00-18:00").split(
      "-",
    )[0],
    businessHoursEnd: (process.env.BUSINESS_HOURS || "09:00-18:00").split(
      "-",
    )[1],
    timezone: process.env.TIMEZONE || "America/Sao_Paulo",
    wsPort: Number(process.env.WS_PORT) || 3001,
    wsPath: process.env.WS_PATH || "/socket.io",
    humanizerMinDelayMs: Number(process.env.HUMANIZER_MIN_DELAY_MS) || 3000,
    humanizerMaxDelayMs: Number(process.env.HUMANIZER_MAX_DELAY_MS) || 7000,
    humanizerMinTypingMs: Number(process.env.HUMANIZER_MIN_TYPING_MS) || 1500,
    humanizerMaxTypingMs: Number(process.env.HUMANIZER_MAX_TYPING_MS) || 3500,
    cbWindowMode: process.env.CB_WINDOW_MODE || "5m_or_50",
    cbMinAttempts: Number(process.env.CB_MIN_ATTEMPTS) || 20,
    cbFailRateOpen: Number(process.env.CB_FAIL_RATE_OPEN) || 0.25,
    cbProbeIntervalSec: Number(process.env.CB_PROBE_INTERVAL_SEC) || 45,
    cbProbeSuccessClose: Number(process.env.CB_PROBE_SUCCESS_CLOSE) || 0.9,
    cbProbeSamples: Number(process.env.CB_PROBE_SAMPLES) || 10,
    cbCooldownInitialSec: Number(process.env.CB_COOLDOWN_INITIAL_SEC) || 300,
    cbCooldownMaxSec: Number(process.env.CB_COOLDOWN_MAX_SEC) || 1800,
    windowsTempDir: process.env.WINDOWS_TEMP_DIR || null,
    windowsLongPathSupport: process.env.WINDOWS_LONG_PATH_SUPPORT !== "false",
    updatedAt: new Date(),
  };

  await systemConfigService.initialize(testPrisma, {
    cryptoKey: process.env.CONFIG_CRYPTO_KEY!,
    defaults,
  });

  // Clean up test database before running tests
  try {
    await testPrisma.$executeRawUnsafe("DELETE FROM Message");
    await testPrisma.$executeRawUnsafe("DELETE FROM FlowInstance");
    await testPrisma.$executeRawUnsafe("DELETE FROM FlowStep");
    await testPrisma.$executeRawUnsafe("DELETE FROM Flow");
    await testPrisma.$executeRawUnsafe("DELETE FROM Trigger");
    await testPrisma.$executeRawUnsafe("DELETE FROM Template");
    await testPrisma.$executeRawUnsafe("DELETE FROM Contact");
    await testPrisma.$executeRawUnsafe("DELETE FROM User");
  } catch (error) {
    // Database might not exist yet, that's ok
  }
});

// Global teardown
afterAll(async () => {
  await testPrisma.$disconnect();
});

// Mock WhatsApp client
export const mockWhatsAppClient = {
  initialize: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue({ id: { _serialized: "msg_123" } }),
  getChatById: vi.fn().mockResolvedValue({
    sendStateTyping: vi.fn().mockResolvedValue(undefined),
  }),
  getState: vi.fn().mockResolvedValue("CONNECTED"),
};

// Mock logger
vi.mock("pino", () => {
  const mockDestination = vi.fn(() => ({
    reopen: vi.fn(),
  }));
  const mockMultistream = vi.fn().mockImplementation((targets) => targets[0]);
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  };
  const loggerFactory = vi.fn(() => mockLogger) as any;
  loggerFactory.destination = mockDestination;
  loggerFactory.multistream = mockMultistream;
  return {
    default: loggerFactory,
  };
});
