import express from "express";
import cors, { type CorsOptions } from "cors";
import {
  PrismaClient,
  Prisma,
  UserRole,
  MessageDirection,
  MessageStatus,
} from "@prisma/client";
import { prisma } from "./config/prisma.js";
import dotenv from "dotenv";
import { z } from "zod";
import { createLogger } from "./services/logger.js";
import { existsSync, promises as fsp } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { randomUUID } from "node:crypto";
import { matchTrigger } from "./domain/triggerMatcher.js";
import { ensureFlowInstance, processAutoSteps } from "./domain/flowEngine.js";
import { AutomationOrchestrator } from "./services/automationOrchestrator.js";
import { AuthService } from "./services/authService.js";
import { renderTemplate } from "./services/templateRenderer.js";
import {
  authenticate,
  authorize,
  optionalAuth,
  extractTokenFromRequest,
} from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { envValidator } from "./config/env.validator.js";
import type { Env } from "./config/env.validator.js";
import {
  systemConfigService,
  SystemConfigValues,
  SystemConfigUpdateInput,
} from "./services/systemConfigService.js";
import { configSyncService } from "./services/configSyncService.js";

dotenv.config();
const logger = createLogger("api");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_META = {
  security: {
    fields: {
      jwtSecret: { type: "secret", minLength: 32 },
      defaultAdminEmail: { type: "email" },
      defaultAdminPassword: { type: "secret", minLength: 8 },
    },
  },
  whatsapp: {
    fields: {
      skipWhatsapp: { type: "boolean" },
      puppeteerExecutablePath: {
        type: "path",
        helper: "Caminho completo do navegador",
      },
    },
  },
  rateLimit: {
    fields: {
      rateMaxPerMin: { type: "number", min: 1, max: 100 },
      ratePerContactPer5Min: { type: "number", min: 1, max: 20 },
    },
  },
  humanizer: {
    fields: {
      humanizerMinDelayMs: { type: "duration", unit: "ms", min: 0 },
      humanizerMaxDelayMs: { type: "duration", unit: "ms", min: 0 },
      humanizerMinTypingMs: { type: "duration", unit: "ms", min: 0 },
      humanizerMaxTypingMs: { type: "duration", unit: "ms", min: 0 },
    },
  },
  circuitBreaker: {
    fields: {
      cbWindowMode: { type: "string" },
      cbMinAttempts: { type: "number", min: 1 },
      cbFailRateOpen: { type: "number", min: 0, max: 1 },
      cbProbeIntervalSec: { type: "number", min: 1 },
      cbProbeSuccessClose: { type: "number", min: 0, max: 1 },
      cbProbeSamples: { type: "number", min: 1 },
      cbCooldownInitialSec: { type: "number", min: 1 },
      cbCooldownMaxSec: { type: "number", min: 1 },
    },
  },
  operation: {
    fields: {
      businessHoursStart: { type: "time" },
      businessHoursEnd: { type: "time" },
      timezone: { type: "timezone" },
      firstContactEnabled: { type: "boolean" },
      firstContactMessage: {
        type: "string",
        helper: "Mensagem enviada no primeiro contato (opcional). Deixe vazio para n\u00e3o enviar automaticamente.",
      },
      windowsTempDir: { type: "path", optional: true },
      windowsLongPathSupport: { type: "boolean" },
    },
  },
  websocket: {
    fields: {
      wsPort: { type: "number", min: 1000, max: 65535 },
      wsPath: { type: "string" },
    },
  },
} as const;

type BulkContactInfo = {
  id: string;
  phone: string;
  name: string | null;
  optIn: boolean;
  optedOut: boolean;
};

const BULK_CONTACT_SELECT = {
  id: true,
  phone: true,
  name: true,
  optIn: true,
  optedOut: true,
} as const;

const BULK_VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

function buildContactVariables(
  contact: BulkContactInfo,
  extra?: Record<string, string>,
): Record<string, string> {
  const firstName = contact.name?.split(" ")[0] ?? "";
  return {
    nome: contact.name ?? "",
    primeiro_nome: firstName,
    telefone: contact.phone,
    phone: contact.phone,
    ...(extra ?? {}),
  };
}

function applyTextVariables(
  text: string,
  vars: Record<string, string>,
): string {
  if (!text) return "";
  return text.replace(BULK_VARIABLE_REGEX, (_, key: string) => vars[key] ?? "");
}

const CONFIG_UPDATE_SCHEMA = z
  .object({
    jwtSecret: z.string().min(32).optional(),
    defaultAdminEmail: z.string().email().optional(),
    defaultAdminPassword: z.string().min(4).optional(),
    regenerateJwtSecret: z.boolean().optional(),
    regenerateAdminPassword: z.boolean().optional(),
    skipWhatsapp: z.boolean().optional(),
    puppeteerExecutablePath: z.string().min(1).optional().nullable(),
    rateMaxPerMin: z.number().int().min(1).max(100).optional(),
    ratePerContactPer5Min: z.number().int().min(1).max(20).optional(),
    businessHours: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
        timezone: z.string().min(1),
      })
      .optional(),
    timezone: z.string().min(1).optional(),
    wsPort: z.number().int().min(1000).max(65535).optional(),
    wsPath: z.string().min(1).optional(),
    humanizerMinDelayMs: z.number().int().min(0).optional(),
    humanizerMaxDelayMs: z.number().int().min(0).optional(),
    humanizerMinTypingMs: z.number().int().min(0).optional(),
    humanizerMaxTypingMs: z.number().int().min(0).optional(),
    cbWindowMode: z.string().min(1).optional(),
    cbMinAttempts: z.number().int().min(1).optional(),
    cbFailRateOpen: z.number().min(0).max(1).optional(),
    cbProbeIntervalSec: z.number().int().min(1).optional(),
    cbProbeSuccessClose: z.number().min(0).max(1).optional(),
    cbProbeSamples: z.number().int().min(1).optional(),
    cbCooldownInitialSec: z.number().int().min(1).optional(),
    cbCooldownMaxSec: z.number().int().min(1).optional(),
    firstContactEnabled: z.boolean().optional(),
    firstContactMessage: z.string().max(1000).optional().nullable(),
    windowsTempDir: z.string().min(1).optional().nullable(),
    windowsLongPathSupport: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.businessHours) {
      const { start, end } = data.businessHours;
      if (!start || !end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Horário comercial requer início e fim",
          path: ["businessHours"],
        });
      }
    }
    if (
      typeof data.humanizerMinDelayMs === "number" &&
      typeof data.humanizerMaxDelayMs === "number" &&
      data.humanizerMinDelayMs > data.humanizerMaxDelayMs
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delay mínimo não pode ser maior que o máximo",
        path: ["humanizerMinDelayMs"],
      });
    }
    if (
      typeof data.humanizerMinTypingMs === "number" &&
      typeof data.humanizerMaxTypingMs === "number" &&
      data.humanizerMinTypingMs > data.humanizerMaxTypingMs
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tempo mínimo de digitação não pode ser maior que o máximo",
        path: ["humanizerMinTypingMs"],
      });
    }
    if (
      typeof data.cbCooldownInitialSec === "number" &&
      typeof data.cbCooldownMaxSec === "number" &&
      data.cbCooldownInitialSec > data.cbCooldownMaxSec
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cooldown inicial não pode ser maior que o máximo",
        path: ["cbCooldownInitialSec"],
      });
    }
  });

function detectBrowserExecutables(): string[] {
  const candidates: string[] = [];
  const isWin = platform() === "win32";
  if (isWin) {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 =
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData =
      process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    candidates.push(
      join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(programFiles, "Chromium", "Application", "chrome.exe"),
      join(programFilesX86, "Chromium", "Application", "chrome.exe"),
      join(
        programFiles,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
      join(
        programFilesX86,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    );
  }
  return candidates.filter((candidate) => existsSync(candidate));
}

type CreateServerOptions = {
  awaitWhatsApp?: boolean;
};

function buildDefaultSystemConfig(env: Env): SystemConfigValues {
  const [businessHoursStart, businessHoursEnd] = env.BUSINESS_HOURS.split("-");
  return {
    jwtSecret: env.JWT_SECRET,
    defaultAdminEmail: env.DEFAULT_ADMIN_EMAIL,
    defaultAdminPassword: env.DEFAULT_ADMIN_PASSWORD,
    skipWhatsapp: env.SKIP_WHATSAPP,
    puppeteerExecutablePath: env.PUPPETEER_EXECUTABLE_PATH || null,
    rateMaxPerMin: env.RATE_MAX_PER_MIN,
    ratePerContactPer5Min: env.RATE_PER_CONTACT_PER_5MIN,
  businessHoursStart,
  businessHoursEnd,
  timezone: env.TIMEZONE,
  wsPort: env.WS_PORT,
  wsPath: env.WS_PATH,
  firstContactEnabled: false,
  firstContactMessage: null,
  humanizerMinDelayMs: env.HUMANIZER_MIN_DELAY_MS,
  humanizerMaxDelayMs: env.HUMANIZER_MAX_DELAY_MS,
  humanizerMinTypingMs: env.HUMANIZER_MIN_TYPING_MS,
  humanizerMaxTypingMs: env.HUMANIZER_MAX_TYPING_MS,
  cbWindowMode: env.CB_WINDOW_MODE,
    cbMinAttempts: env.CB_MIN_ATTEMPTS,
    cbFailRateOpen: env.CB_FAIL_RATE_OPEN,
    cbProbeIntervalSec: env.CB_PROBE_INTERVAL_SEC,
    cbProbeSuccessClose: env.CB_PROBE_SUCCESS_CLOSE,
    cbProbeSamples: env.CB_PROBE_SAMPLES,
    cbCooldownInitialSec: env.CB_COOLDOWN_INITIAL_SEC,
    cbCooldownMaxSec: env.CB_COOLDOWN_MAX_SEC,
    windowsTempDir: env.WINDOWS_TEMP_DIR || null,
    windowsLongPathSupport: env.WINDOWS_LONG_PATH_SUPPORT,
    updatedAt: new Date(),
  };
}

type DashboardMetrics = {
  totalContacts: number;
  totalMessages: number;
  todayMessages: number;
  sentMessages: number;
  failedMessages: number;
  automationRate: number;
};

let dashboardMetricsCache: {
  data: DashboardMetrics;
  expiresAt: number;
} | null = null;
const DASHBOARD_METRICS_TTL_MS = 5_000;

function resolveWhatsappSessionPath(): string {
  return process.env.WHATS_SESSION_PATH
    ? resolve(process.env.WHATS_SESSION_PATH)
    : resolve(__dirname, "..", "data", "whatsapp_session");
}

async function buildDashboardMetrics(
  prisma: PrismaClient,
): Promise<DashboardMetrics> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalContacts,
    totalMessages,
    todayMessages,
    sentMessages,
    failedMessages,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.message.count(),
    prisma.message.count({
      where: {
        createdAt: {
          gte: today,
          lte: todayEnd,
        },
      },
    }),
    prisma.message.count({
      where: {
        direction: MessageDirection.outbound,
      },
    }),
    prisma.message.count({
      where: {
        status: MessageStatus.failed,
      },
    }),
  ]);

  const automationRate =
    totalMessages > 0 ? Math.round((sentMessages / totalMessages) * 100) : 0;

  return {
    totalContacts,
    totalMessages,
    todayMessages,
    sentMessages,
    failedMessages,
    automationRate,
  };
}

async function getCachedDashboardMetrics(
  prisma: PrismaClient,
): Promise<DashboardMetrics> {
  const now = Date.now();
  if (dashboardMetricsCache && dashboardMetricsCache.expiresAt > now) {
    return dashboardMetricsCache.data;
  }
  const data = await buildDashboardMetrics(prisma);
  dashboardMetricsCache = {
    data,
    expiresAt: now + DASHBOARD_METRICS_TTL_MS,
  };
  return data;
}

export async function createServer(options: CreateServerOptions = {}) {
  // const prisma = new PrismaClient(); // Removed in favor of singleton
  const app = express();
  const env = envValidator.validate();

  const defaults = buildDefaultSystemConfig(env);
  const isProduction = env.NODE_ENV === "production";
  await systemConfigService.initialize(prisma, {
    cryptoKey: env.CONFIG_CRYPTO_KEY,
    defaults,
  });

  // Inicia sincronização automática de configurações (desenvolvimento apenas)
  // DESABILITADO TEMPORARIAMENTE - Causando instabilidade com skipWhatsapp
  // if (env.NODE_ENV === 'development') {
  //	configSyncService.startAutoSync(5000); // Verifica mudanças a cada 5 segundos
  //	logger.info('Config auto-sync enabled for development mode');
  // }

  // CORS deve ser o PRIMEIRO middleware
  const requestedOrigins = process.env.API_CORS_ORIGIN
    ? process.env.API_CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
    : ["http://localhost:5173"];

  const allowedOrigins = new Set(requestedOrigins);
  for (const origin of requestedOrigins) {
    if (origin.includes("localhost")) {
      allowedOrigins.add(origin.replace("localhost", "127.0.0.1"));
    }
    if (origin.startsWith("http://")) {
      allowedOrigins.add(origin.replace("http://", "https://"));
    }
  }

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      logger.warn({ origin }, "CORS: origem bloqueada");
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  logger.info(
    { allowedOrigins: Array.from(allowedOrigins) },
    "CORS configurado",
  );
  app.use(cors(corsOptions));

  // Body parser depois do CORS
  app.use(express.json());

  // Static assets with aggressive cache for hashed bundles (optional, only if built frontend is present)
  const frontendAssetsPath = resolve(
    __dirname,
    "..",
    "..",
    "..",
    "frontend",
    "dist",
    "client",
    "assets",
  );
  if (existsSync(frontendAssetsPath)) {
    logger.info({ frontendAssetsPath }, "Servindo assets estǭticos com cache");
    app.use(
      "/assets",
      express.static(frontendAssetsPath, {
        immutable: true,
        maxAge: "365d",
        setHeaders: (res) => {
          res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable",
          );
        },
      }),
    );
  }

  // Initialize services
  const authService = new AuthService(prisma);
  await authService.ensureDefaultAdmin();

  // Create HTTP server for WebSocket
  const http = await import("http");
  const httpServer = http.createServer(app);
  httpServer.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
  httpServer.headersTimeout = env.HTTP_HEADERS_TIMEOUT_MS;
  httpServer.keepAliveTimeout = env.HTTP_KEEPALIVE_TIMEOUT_MS;
  logger.info(
    {
      requestTimeoutMs: env.HTTP_REQUEST_TIMEOUT_MS,
      headersTimeoutMs: env.HTTP_HEADERS_TIMEOUT_MS,
      keepAliveTimeoutMs: env.HTTP_KEEPALIVE_TIMEOUT_MS,
    },
    "Timeouts configurados para o servidor HTTP",
  );

  // Initialize WebSocket
  const { WebSocketService } = await import("./services/websocketService.js");
  const websocketService = new WebSocketService({
    httpServer,
    authService,
    apiPort: env.PORT,
    initialConfig: systemConfigService.getConfig(),
    subscribe: systemConfigService.subscribe.bind(systemConfigService),
  });

  // Initialize automation orchestrator with WebSocket
  const orchestrator = new AutomationOrchestrator(prisma, websocketService);

  // Configure WebSocket to get current QR code from orchestrator
  websocketService.setQRCodeGetter(() => {
    return orchestrator.getWhatsAppService().getQRCode();
  });

  const orchestratorInitPromise = orchestrator.initialize();

  if (options.awaitWhatsApp === false) {
    logger.info(
      "Iniciando WhatsApp em background - API liberada enquanto aguarda o QR Code",
    );
    orchestratorInitPromise.catch((error) => {
      const errorMessage = error?.message || String(error);
      const isProtocolError =
        errorMessage.includes("Protocol error") ||
        errorMessage.includes("Target closed");

      if (isProtocolError) {
        logger.error(
          { error: errorMessage },
          "Erro de protocolo ao inicializar WhatsApp - Chrome pode ter fechado",
        );
        logger.warn(
          "O WhatsApp não foi inicializado, mas a API continuará funcionando.",
        );
        logger.warn("Para resolver:");
        logger.warn("1. Feche todas as janelas do Chrome");
        logger.warn("2. Reinicie o backend");
        logger.warn(
          "3. Ou configure PUPPETEER_HEADLESS=false para ver o que está acontecendo",
        );
        
        // Fix: Avoid Zombie State in production
        if (process.env.NODE_ENV === 'production') {
           logger.fatal('Ambiente de produção detectado: Encerrando processo para tentativa de recuperação automática...');
           process.exit(1);
        }

      } else {
        logger.error({ error }, "Erro ao inicializar o orquestrador/WhatsApp");
      }
      logger.warn(
        "API continuará funcionando mesmo sem WhatsApp. Verifique os logs acima para mais detalhes.",
      );
      // Não encerra o processo - permite que a API continue funcionando
      // O usuário pode corrigir o problema e reiniciar o WhatsApp via API se necessário
    });
  } else {
    try {
      await orchestratorInitPromise;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isProtocolError =
        errorMessage.includes("Protocol error") ||
        errorMessage.includes("Target closed");

      if (isProtocolError) {
        logger.error(
          { error: errorMessage },
          "Erro de protocolo - Chrome pode ter fechado durante inicialização",
        );
        logger.warn(
          "API continuará funcionando. Reinicie o backend após fechar todas as janelas do Chrome.",
        );
      } else {
        logger.error({ error }, "Erro ao inicializar WhatsApp");
      }
      // Não relança o erro - permite que a API continue funcionando
    }
  }

  // ==================== Public Endpoints ====================

  // Authentication
  app.post("/auth/register", async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      role: z.enum(["admin", "operator"]).optional(),
    });

    try {
      const data = schema.parse(req.body);
      const result = await authService.register(data);
      // Set HttpOnly cookie for session
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/auth/login", async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    try {
      const data = schema.parse(req.body);
      const result = await authService.login(data.email, data.password);
      // Set HttpOnly cookie for session
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.post("/auth/refresh", async (req, res) => {
    try {
      const token = extractTokenFromRequest(req as any);
      if (!token) {
        return res
          .status(401)
          .json({
            error: "Unauthorized",
            message: "Missing authentication token",
          });
      }

      const payload = authService.verifyToken(token);
      if (!payload) {
        return res
          .status(401)
          .json({ error: "Unauthorized", message: "Invalid or expired token" });
      }

      const result = await authService.issueTokenForUserId(payload.userId);
      if (!result) {
        return res
          .status(401)
          .json({
            error: "Unauthorized",
            message: "User not found or inactive",
          });
      }

      res.cookie("auth_token", result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(result);
    } catch (error: any) {
      logger.error({ error }, "Failed to refresh auth token");
      res
        .status(401)
        .json({ error: "Unauthorized", message: "Could not refresh session" });
    }
  });

  app.post("/auth/logout", (req, res) => {
    res.cookie("auth_token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 0,
    });
    res.json({ success: true });
  });

  app.get("/auth/me", authenticate(authService), async (req, res) => {
    const user = await authService.getUserById(req.user!.userId);
    res.json({ user });
  });

  app.post(
    "/auth/change-password",
    authenticate(authService),
    async (req, res) => {
      const schema = z.object({
        oldPassword: z.string().min(1),
        newPassword: z.string().min(6),
      });

      try {
        const data = schema.parse(req.body);
        await authService.updatePassword(
          req.user!.userId,
          data.oldPassword,
          data.newPassword,
        );
        res.json({ success: true, message: "Password updated successfully" });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    },
  );

  // Health (public)
  app.get("/health", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false });
    }
  });

  // Latest WhatsApp QR (public)
  app.get("/qr", (req, res) => {
    const qr = orchestrator.getWhatsAppService().getQRCode();
    logger.info(
      { qrLength: qr?.length || 0, qrStart: qr?.substring(0, 20) },
      "QR endpoint called",
    );
    res.json({ qr });
  });

  // Basic WhatsApp status (public)
  app.get("/whatsapp/status", async (req, res) => {
    const status = await orchestrator.getStatus();
    res.json(status.whatsapp);
  });

  app.post(
    "/whatsapp/session/backup",
    authenticate(authService),
    authorize(UserRole.admin),
    async (req, res) => {
      try {
        const sessionPath = resolveWhatsappSessionPath();
        if (!existsSync(sessionPath)) {
          return res
            .status(404)
            .json({ error: "Diretório de sessão não encontrado" });
        }
        const backupRoot = resolve(__dirname, "..", "..", "data", "backups");
        await fsp.mkdir(backupRoot, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const destination = resolve(
          backupRoot,
          `whatsapp_session-${timestamp}`,
        );
        await fsp.cp(sessionPath, destination, { recursive: true });
        res.json({ success: true, backupPath: destination });
      } catch (error) {
        logger.error({ error }, "Failed to backup WhatsApp session");
        res.status(500).json({ error: "Falha ao salvar sessão do WhatsApp" });
      }
    },
  );

  app.post(
    "/whatsapp/disconnect",
    authenticate(authService),
    authorize(UserRole.admin),
    async (req, res) => {
      const schema = z
        .object({
          clearSession: z.boolean().optional(),
        })
        .optional();

      const payload = schema.parse(req.body) ?? {};
      const clearSession = payload.clearSession ?? true;

      const config = systemConfigService.getConfig();
      if (config.skipWhatsapp) {
        return res
          .status(400)
          .json({ error: "WhatsApp estǭ desativado nas configura����es" });
      }

      try {
        const whatsappService = orchestrator.getWhatsAppService();
        await whatsappService.disconnect();
        websocketService.emitWhatsAppDisconnected("manual_disconnect");

        if (clearSession) {
          const sessionPath = resolveWhatsappSessionPath();
          if (existsSync(sessionPath)) {
            // Retry logic for Windows file lock
            let retries = 0;
            while (retries < 5) {
              try {
                await fsp.rm(sessionPath, { recursive: true, force: true });
                break;
              } catch (err: any) {
                if (err.code === 'EBUSY' || err.code === 'EPERM') {
                  retries++;
                  logger.warn({ attempt: retries }, 'File locked, retrying session deletion...');
                  await new Promise(r => setTimeout(r, 1000)); // Wait 1s
                } else {
                  throw err;
                }
              }
            }
          }
        }

        await whatsappService.initialize();

        try {
          const status = await orchestrator.getStatus();
          websocketService.emitSystemStatus(status);
        } catch (error) {
          logger.warn({ error }, "Failed to emit system status after disconnect");
        }

        res.json({
          success: true,
          clearedSession: clearSession,
        });
      } catch (error) {
        logger.error({ error }, "Failed to disconnect WhatsApp session");
        res
          .status(500)
          .json({ error: "Falha ao desconectar sessǜo do WhatsApp" });
      }
    },
  );

  // Debug endpoint (public)
  app.get("/debug", async (req, res) => {
    const qr = orchestrator.getWhatsAppService().getQRCode();
    const status = await orchestrator.getStatus();
    const config = await prisma.systemConfig.findUnique({
      where: { id: "global" },
    });

    res.json({
      qr: {
        available: qr !== null,
        length: qr?.length || 0,
        start: qr?.substring(0, 50) || null,
      },
      whatsapp: status.whatsapp,
      skipWhatsapp: config?.skipWhatsapp || false,
      websocket: {
        connectedClients: websocketService.getConnectedClientsCount(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Apply authentication to all subsequent routes
  app.use(authenticate(authService));

  // Configuration endpoints (admin only)
  app.get("/config/meta", authorize(UserRole.admin), (req, res) => {
    res.json(CONFIG_META);
  });

  app.get("/config", authorize(UserRole.admin), (req, res) => {
    const configData = systemConfigService.getMaskedConfig();
    res.json(configData);
  });

  app.get("/config/audit", authorize(UserRole.admin), async (req, res) => {
    const history = await prisma.configAudit.findMany({
      where: { configId: "global" },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    res.json(history);
  });

  app.put("/config", authorize(UserRole.admin), async (req, res) => {
    try {
      const payload = CONFIG_UPDATE_SCHEMA.parse(req.body);
      const updateInput: SystemConfigUpdateInput = {
        jwtSecret: payload.jwtSecret,
        defaultAdminEmail: payload.defaultAdminEmail,
        defaultAdminPassword: payload.defaultAdminPassword,
        regenerateJwtSecret: payload.regenerateJwtSecret,
        regenerateAdminPassword: payload.regenerateAdminPassword,
        skipWhatsapp: payload.skipWhatsapp,
        puppeteerExecutablePath:
          payload.puppeteerExecutablePath === undefined
            ? undefined
            : payload.puppeteerExecutablePath,
        rateMaxPerMin: payload.rateMaxPerMin,
        ratePerContactPer5Min: payload.ratePerContactPer5Min,
        wsPort: payload.wsPort,
        wsPath: payload.wsPath,
        humanizerMinDelayMs: payload.humanizerMinDelayMs,
        humanizerMaxDelayMs: payload.humanizerMaxDelayMs,
        humanizerMinTypingMs: payload.humanizerMinTypingMs,
        humanizerMaxTypingMs: payload.humanizerMaxTypingMs,
        cbWindowMode: payload.cbWindowMode,
        cbMinAttempts: payload.cbMinAttempts,
        cbFailRateOpen: payload.cbFailRateOpen,
        cbProbeIntervalSec: payload.cbProbeIntervalSec,
        cbProbeSuccessClose: payload.cbProbeSuccessClose,
        cbProbeSamples: payload.cbProbeSamples,
        cbCooldownInitialSec: payload.cbCooldownInitialSec,
        cbCooldownMaxSec: payload.cbCooldownMaxSec,
        firstContactEnabled: payload.firstContactEnabled,
        firstContactMessage:
          payload.firstContactMessage === undefined
            ? undefined
            : payload.firstContactMessage,
        windowsTempDir:
          payload.windowsTempDir === undefined
            ? undefined
            : payload.windowsTempDir,
        windowsLongPathSupport: payload.windowsLongPathSupport,
      };

      if (payload.businessHours) {
        updateInput.businessHoursStart = payload.businessHours.start;
        updateInput.businessHoursEnd = payload.businessHours.end;
        updateInput.timezone = payload.businessHours.timezone;
      } else if (payload.timezone) {
        updateInput.timezone = payload.timezone;
      }

      const updated = await systemConfigService.updateConfig(
        updateInput,
        req.user!.userId,
      );
      res.json({
        config: systemConfigService.getMaskedConfig(),
        raw: { updatedAt: updated.updatedAt },
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to update config");
      res.status(400).json({ error: error.message || "Invalid configuration" });
    }
  });

  app.post("/config/secret/reveal", authorize(UserRole.admin), (req, res) => {
    const schema = z.object({
      field: z.enum(["jwtSecret", "defaultAdminPassword"]),
    });
    const { field } = schema.parse(req.body);
    const config = systemConfigService.getConfig();
    res.json({
      field,
      value:
        field === "jwtSecret" ? config.jwtSecret : config.defaultAdminPassword,
    });
  });

  app.post(
    "/config/puppeteer/detect",
    authorize(UserRole.admin),
    (req, res) => {
      const candidates = detectBrowserExecutables();
      res.json({ candidates });
    },
  );

  app.post(
    "/config/puppeteer/validate",
    authorize(UserRole.admin),
    (req, res) => {
      const schema = z.object({ path: z.string().min(1) });
      const { path } = schema.parse(req.body);
      const resolvedPath = resolve(path);
      res.json({
        valid: existsSync(resolvedPath),
        resolvedPath,
      });
    },
  );

  // Templates
  app.get("/templates", async (req, res) => {
    const rawTake = Number(req.query.take);
    const rawSkip = Number(req.query.skip);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;

    const list = await prisma.template.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    });
    res.json(list);
  });

  app.get("/templates/:id", async (req, res) => {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });
    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }
    res.json(template);
  });
  app.post("/templates", async (req, res) => {
    const schema = z.object({
      key: z.string().min(1),
      content: z.string().min(1),
      variables: z.array(z.string()).optional(),
      variants: z.array(z.string()).optional(),
      locale: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    try {
      const created = await prisma.template.create({
        data: {
          key: data.key,
          content: data.content,
          variables: data.variables ?? [],
          variants: data.variants ?? [],
          locale: data.locale,
          isActive: data.isActive ?? true,
        },
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res
          .status(409)
          .json({ error: "Já existe um template com essa chave" });
      }
      throw error;
    }
  });
  app.put("/templates/:id", async (req, res) => {
    const schema = z.object({
      content: z.string().optional(),
      variables: z.array(z.string()).optional(),
      variants: z.array(z.string()).optional(),
      locale: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.template.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  });
  app.delete("/templates/:id", async (req, res) => {
    await prisma.template.delete({ where: { id: req.params.id } });
    res.status(204).send();
  });

  // Triggers
  app.get("/triggers", async (req, res) => {
    const rawTake = Number(req.query.take);
    const rawSkip = Number(req.query.skip);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;

    const list = await prisma.trigger.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take,
      skip,
    });
    res.json(list);
  });

  app.get("/triggers/:id", async (req, res) => {
    const trigger = await prisma.trigger.findUnique({
      where: { id: req.params.id },
      include: { template: true, flow: true },
    });
    if (!trigger) {
      return res.status(404).json({ error: "Gatilho não encontrado" });
    }
    res.json(trigger);
  });
  app.post("/triggers", async (req, res) => {
    const schema = z.object({
      type: z.enum(["equals", "contains", "regex", "number"]),
      pattern: z.string().min(1),
      priority: z.number().int().default(0),
      cooldownSec: z.number().int().default(0),
      active: z.boolean().default(true),
      templateId: z.string().optional(),
      flowId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const created = await prisma.trigger.create({ data });
    res.status(201).json(created);
  });
  app.put("/triggers/:id", async (req, res) => {
    const schema = z.object({
      type: z.enum(["equals", "contains", "regex", "number"]).optional(),
      pattern: z.string().optional(),
      priority: z.number().int().optional(),
      cooldownSec: z.number().int().optional(),
      active: z.boolean().optional(),
      templateId: z.string().nullable().optional(),
      flowId: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.trigger.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  });
  app.delete("/triggers/:id", async (req, res) => {
    await prisma.trigger.delete({ where: { id: req.params.id } });
    res.status(204).send();
  });

  // Flows
  app.get("/flows", async (req, res) => {
    const rawTake = Number(req.query.take);
    const rawSkip = Number(req.query.skip);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 100) : 50;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;

    const list = await prisma.flow.findMany({
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    });
    res.json(list);
  });

  app.get("/flows/:id", async (req, res) => {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    if (!flow) {
      return res.status(404).json({ error: "Fluxo não encontrado" });
    }

    res.json(flow);
  });
  app.post("/flows", async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      status: z.enum(["draft", "published", "archived"]).default("draft"),
      version: z.number().int().default(1),
      steps: z
        .array(
          z.object({
            key: z.string().min(1),
            type: z.enum(["send_template", "collect_input", "end"]),
            templateId: z.string().optional(),
            waitInput: z.boolean().optional(),
            order: z.number().int().default(0),
            transitions: z.record(z.string(), z.string()).optional(),
          }),
        )
        .default([]),
    });
    const data = schema.parse(req.body);
    const created = await prisma.flow.create({
      data: {
        name: data.name,
        status: data.status,
        version: data.version,
        steps: {
          create: data.steps.map((s) => ({
            key: s.key,
            type: s.type,
            templateId: s.templateId,
            waitInput: s.waitInput ?? false,
            order: s.order,
            transitionsJson: s.transitions ?? {},
          })),
        },
      },
      include: { steps: true },
    });
    res.status(201).json(created);
  });
  app.put("/flows/:id", async (req, res) => {
    const schema = z.object({
      name: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      version: z.number().int().optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.flow.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  });
  app.post("/flows/:id/publish", async (req, res) => {
    const updated = await prisma.flow.update({
      where: { id: req.params.id },
      data: { status: "published" },
    });
    res.json(updated);
  });
  app.delete("/flows/:id", async (req, res) => {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.flowStep.deleteMany({ where: { flowId: id } }),
      prisma.flowInstance.deleteMany({ where: { flowId: id } }),
      prisma.flow.delete({ where: { id } }),
    ]);
    res.status(204).send();
  });

  // Flow steps CRUD básico (opcional, para edições finas)
  app.post("/flows/:id/steps", async (req, res) => {
    const schema = z.object({
      key: z.string().min(1),
      type: z.enum(["send_template", "collect_input", "end"]),
      templateId: z.string().optional(),
      waitInput: z.boolean().optional(),
      order: z.number().int().default(0),
      transitions: z.record(z.string(), z.string()).optional(),
      uiMetadata: z.record(z.string(), z.any()).optional(),
    });
    const s = schema.parse(req.body);
    const created = await prisma.flowStep.create({
      data: {
        flowId: req.params.id,
        key: s.key,
        type: s.type,
        templateId: s.templateId,
        waitInput: s.waitInput ?? false,
        order: s.order,
        transitionsJson: s.transitions ?? {},
        uiMetadataJson: s.uiMetadata ?? {},
      },
    });
    res.status(201).json(created);
  });
  app.put("/flows/:id/steps/:stepId", async (req, res) => {
    const schema = z.object({
      key: z.string().optional(),
      type: z.enum(["send_template", "collect_input", "end"]).optional(),
      templateId: z.string().nullable().optional(),
      waitInput: z.boolean().optional(),
      order: z.number().int().optional(),
      transitions: z.record(z.string(), z.string()).optional(),
      uiMetadata: z.record(z.string(), z.any()).optional(),
    });
    const s = schema.parse(req.body);
    const updated = await prisma.flowStep.update({
      where: { id: req.params.stepId },
      data: {
        key: s.key,
        type: s.type,
        templateId: s.templateId ?? undefined,
        waitInput: s.waitInput ?? undefined,
        order: s.order,
        transitionsJson: s.transitions ?? undefined,
        uiMetadataJson: s.uiMetadata ?? undefined,
      },
    });
    res.json(updated);
  });
  app.delete("/flows/:id/steps/:stepId", async (req, res) => {
    await prisma.flowStep.delete({ where: { id: req.params.stepId } });
    res.status(204).send();
  });

  // Simulador
  app.post("/simulate", async (req, res) => {
    const schema = z.object({
      text: z.string().min(1),
      contactId: z.string().min(1),
    });
    const data = schema.parse(req.body);
    const match = await matchTrigger(prisma, {
      text: data.text,
      contactId: data.contactId,
    });
    if (!match) return res.json({ matched: false });
    const t = match.trigger;
    const result: any = { matched: true, trigger: t };
    if (t.flowId) {
      const firstStep = await prisma.flowStep.findFirst({
        where: { flowId: t.flowId },
        orderBy: [{ order: "asc" }, { key: "asc" }],
      });
      if (!firstStep) {
        return res.json({ matched: true, trigger: t, flowError: "Fluxo sem passos" });
      }

      // Simula instância em memória sem gravar no banco
      const fakeInstance = {
        id: `simulate_${t.flowId}`,
        contactId: data.contactId,
        flowId: t.flowId,
        currentStepKey: firstStep.key,
        stateJson: null,
        lastInteractionAt: new Date(),
        paused: false,
        lockedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      const run = await processAutoSteps(prisma, fakeInstance, {
        vars: { contactId: data.contactId },
      });
      result.flowInstance = {
        currentStepKey: run.instance.currentStepKey,
        paused: run.instance.paused,
      };
      result.actions = run.actions;
    }
    res.json(result);
  });

  // Contatos x fluxo
  app.get("/contacts/:id/flow", async (req, res) => {
    const inst = await prisma.flowInstance.findFirst({
      where: { contactId: req.params.id, paused: false },
      include: { flow: true },
    });
    res.json(inst || null);
  });
  app.post("/contacts/:id/flow/reset", async (req, res) => {
    await prisma.flowInstance.updateMany({
      where: { contactId: req.params.id, paused: false },
      data: { paused: true },
    });
    res.status(204).send();
  });
  app.post("/contacts/:id/flow/pause", async (req, res) => {
    await prisma.flowInstance.updateMany({
      where: { contactId: req.params.id, paused: false },
      data: { paused: true },
    });
    res.status(204).send();
  });

  // System Status
  app.get("/status", async (req, res) => {
    const status = await orchestrator.getStatus();
    res.json(status);
  });

  // Dashboard Metrics (aggregated counts to avoid loading full lists)
  app.get("/metrics/dashboard", async (req, res) => {
    const metrics = await getCachedDashboardMetrics(prisma);
    res.json(metrics);
  });

  app.get("/dashboard/summary", async (req, res) => {
    try {
      const [status, metrics, recentMessages] = await Promise.all([
        orchestrator.getStatus(),
        getCachedDashboardMetrics(prisma),
        prisma.message.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            content: true,
            status: true,
            direction: true,
            createdAt: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        }),
      ]);

      const currentConfig = systemConfigService.getConfig();

      const healthCards = [
        {
          id: "whatsapp",
          title: "WhatsApp",
          status: status.whatsapp.connected ? "ok" : "warning",
          message: status.whatsapp.connected
            ? "Conectado e respondendo normalmente"
            : "Desconectado - abra o QR para reconectar",
        },
        {
          id: "backend",
          title: "Robô",
          status: currentConfig.skipWhatsapp
            ? "warning"
            : status.queue.processing
              ? "ok"
              : "warning",
          message: currentConfig.skipWhatsapp
            ? "Robô pausado pelo usuário"
            : status.queue.processing
              ? "Automação ativa"
              : "Fila aguardando envio",
        },
        {
          id: "database",
          title: "Banco de Dados",
          status: "ok",
          message: "Consultas respondendo normalmente",
        },
      ] as const;

      const quickRecommendations: Array<{
        id: string;
        title: string;
        description: string;
      }> = [];
      if (!status.whatsapp.connected) {
        quickRecommendations.push({
          id: "reconnect-whatsapp",
          title: "WhatsApp desconectado",
          description:
            "Abra a tela de QR Code e pareie novamente para retomar as respostas",
        });
      }
      if (status.queue.length > 20) {
        quickRecommendations.push({
          id: "queue-high",
          title: "Fila cheia",
          description:
            "Há muitas mensagens aguardando envio. Revise gatilhos ou reduza campanhas",
        });
      }
      if (metrics.failedMessages > 0) {
        quickRecommendations.push({
          id: "failed-messages",
          title: "Falhas detectadas",
          description:
            "Veja as mensagens recentes para entender o que precisa de atenção",
        });
      }

      res.json({
        lastUpdated: new Date().toISOString(),
        status,
        metrics,
        automationPaused: currentConfig.skipWhatsapp,
        healthCards,
        quickRecommendations,
        quickStats: {
          queueLength: status.queue.length,
          automationRate: metrics.automationRate,
          failureRate: status.circuitBreaker.failureRate,
          todayMessages: metrics.todayMessages,
        },
        recentMessages: recentMessages.map((message) => ({
          id: message.id,
          content: message.content,
          status: message.status,
          direction: message.direction,
          createdAt: message.createdAt,
          contact: message.contact,
        })),
      });
    } catch (error) {
      logger.error({ error }, "Failed to build dashboard summary");
      res.status(500).json({ error: "Falha ao montar resumo do dashboard" });
    }
  });

  // Timeseries metrics for charts (last 24 hours)
  app.get("/metrics/timeseries", async (req, res) => {
    const now = new Date();
    const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const timeseries = await prisma.$queryRaw<
      Array<{ hour: Date; total: bigint; sent: bigint; received: bigint; failed: bigint }>
    >`
      SELECT
        date_trunc('hour', "createdAt") AS hour,
        COUNT(*)::bigint as total,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END)::bigint as sent,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)::bigint as received,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::bigint as failed
      FROM "Message"
      WHERE "createdAt" >= ${hoursAgo24}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const statusDistributionRaw = await prisma.$queryRaw<
      Array<{ status: string; count: bigint }>
    >`
      SELECT status, COUNT(*)::bigint as count
      FROM "Message"
      WHERE "createdAt" >= ${hoursAgo24}
      GROUP BY status
    `;

    const statusDistribution = statusDistributionRaw.reduce(
      (acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    res.json({
      timeseries: timeseries.map((row) => ({
        timestamp: row.hour.toISOString().slice(0, 19),
        total: Number(row.total ?? 0),
        sent: Number(row.sent ?? 0),
        received: Number(row.received ?? 0),
        failed: Number(row.failed ?? 0),
      })),
      statusDistribution,
    });
  });

  // Send Message
  app.post("/send", async (req, res) => {
    const schema = z.object({
      phone: z.string().min(1),
      text: z.string().min(1),
      priority: z.number().int().optional(),
    });
    const data = schema.parse(req.body);

    // Get or create contact
    let contact = await prisma.contact.findUnique({
      where: { phone: data.phone },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: { phone: data.phone },
      });
    }

    const messageId = await orchestrator.enqueueMessage(
      contact.id,
      data.phone,
      data.text,
      data.priority ?? 5,
    );

    res.json({ success: true, messageId });
  });

  // Broadcast Message (chunked to avoid loading all contacts at once)
  app.post("/broadcast", async (req, res) => {
    const schema = z.object({
      text: z.string().min(1),
      contactIds: z.array(z.string()).optional(),
      optedInOnly: z.boolean().default(true),
      chunkSize: z.number().int().min(50).max(1000).optional(),
    });
    const data = schema.parse(req.body);

    const where: any = {};
    if (data.optedInOnly) {
      where.optIn = true;
    }
    if (data.contactIds && data.contactIds.length > 0) {
      where.id = { in: data.contactIds };
    }

    const take = data.chunkSize ?? 500;
    let cursor: { id: string } | undefined = undefined;
    let processed = 0;
    const messageIds: string[] = [];

    while (true) {
      const batch = await prisma.contact.findMany({
        where,
        orderBy: { id: "asc" },
        take,
        skip: cursor ? 1 : 0,
        cursor,
      });

      if (batch.length === 0) break;

      for (const contact of batch) {
        if (!contact.phone) continue;
        const messageId = await orchestrator.enqueueMessage(
          contact.id,
          contact.phone,
          data.text,
          3, // Medium priority for broadcasts
        );
        messageIds.push(messageId);
        processed++;
      }

      cursor = batch.length > 0 ? { id: batch[batch.length - 1].id } : undefined;
      if (!cursor) break;
    }

    res.json({
      success: true,
      totalContacts: processed,
      messageIds,
    });
  });

  // Bulk reply to selected conversations
  app.post("/messages/bulk-reply", async (req, res) => {
    const schema = z
      .object({
        messageIds: z.array(z.string()).optional(),
        contactIds: z.array(z.string()).optional(),
        templateId: z.string().optional(),
        text: z.string().optional(),
        respectOptOut: z.boolean().default(true),
        priority: z.number().int().min(1).max(10).optional(),
        metadata: z
          .object({
            label: z.string().max(64).optional(),
            note: z.string().max(256).optional(),
          })
          .optional(),
        variables: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
      })
      .refine((payload) => payload.templateId || payload.text, {
        message: "Envie um template ou texto",
        path: ["templateId"],
      })
      .refine(
        (payload) =>
          (payload.messageIds && payload.messageIds.length > 0) ||
          (payload.contactIds && payload.contactIds.length > 0),
        {
          message: "Selecione pelo menos uma conversa",
          path: ["messageIds"],
        },
      );

    const data = schema.parse(req.body);
    const uniqueMessageIds = Array.from(new Set(data.messageIds ?? []));
    const uniqueContactIds = Array.from(new Set(data.contactIds ?? []));

    const contactsFromMessages = uniqueMessageIds.length
      ? await prisma.message.findMany({
        where: { id: { in: uniqueMessageIds } },
        select: {
          id: true,
          contact: {
            select: BULK_CONTACT_SELECT,
          },
        },
      })
      : [];

    const contactsFromIds = uniqueContactIds.length
      ? await prisma.contact.findMany({
        where: { id: { in: uniqueContactIds } },
        select: BULK_CONTACT_SELECT,
      })
      : [];

    const contactMap = new Map<string, BulkContactInfo>();

    for (const record of contactsFromMessages) {
      if (record.contact) {
        contactMap.set(record.contact.id, record.contact);
      }
    }

    for (const contact of contactsFromIds) {
      contactMap.set(contact.id, contact);
    }

    const selectedContacts = Array.from(contactMap.values());
    const skippedContacts: Array<{
      contactId: string;
      phone: string;
      reason: string;
    }> = [];
    const eligibleContacts: BulkContactInfo[] = [];

    for (const contact of selectedContacts) {
      if (!contact.phone) {
        skippedContacts.push({
          contactId: contact.id,
          phone: contact.phone,
          reason: "missing_phone",
        });
        continue;
      }
      if (data.respectOptOut && (!contact.optIn || contact.optedOut)) {
        skippedContacts.push({
          contactId: contact.id,
          phone: contact.phone,
          reason: "opt_out",
        });
        continue;
      }
      eligibleContacts.push(contact);
    }

    if (eligibleContacts.length === 0) {
      return res.status(400).json({
        error: "Nenhuma conversa elegível para resposta",
        skippedContacts,
        totalSelected: selectedContacts.length,
      });
    }

    const baseExtraVars: Record<string, string> = {};
    if (data.variables) {
      for (const [key, value] of Object.entries(data.variables)) {
        baseExtraVars[key] =
          value === undefined || value === null ? "" : String(value);
      }
    }

    const priority = data.priority ?? 5;
    const queuedMessageIds: string[] = [];
    const failedContacts: Array<{
      contactId: string;
      phone: string;
      reason: string;
    }> = [];

    for (const contact of eligibleContacts) {
      try {
        const vars = buildContactVariables(contact, baseExtraVars);
        const text = data.templateId
          ? await renderTemplate(prisma, data.templateId, { vars })
          : applyTextVariables(data.text ?? "", vars);

        if (!text.trim()) {
          failedContacts.push({
            contactId: contact.id,
            phone: contact.phone,
            reason: "empty_text",
          });
          continue;
        }

        const messageId = await orchestrator.enqueueMessage(
          contact.id,
          contact.phone,
          text,
          priority,
          {
            source: "bulk_reply",
            templateId: data.templateId,
            bulkLabel: data.metadata?.label,
            bulkNote: data.metadata?.note,
            originMessageIds: uniqueMessageIds,
          },
        );
        queuedMessageIds.push(messageId);
      } catch (error) {
        logger.error(
          { error, contactId: contact.id },
          "Failed to enqueue bulk reply",
        );
        failedContacts.push({
          contactId: contact.id,
          phone: contact.phone,
          reason: "enqueue_failed",
        });
      }
    }

    res.json({
      success: true,
      totalSelected: selectedContacts.length,
      targetedContacts: eligibleContacts.length,
      queuedMessages: queuedMessageIds,
      skippedContacts,
      failedContacts,
    });
  });

  // Queue Status
  app.get("/queue/status", async (req, res) => {
    const queue = orchestrator.getMessageQueue();
    const queueStatus = queue.getQueueStatus();
    const rateLimitStatus = queue.getRateLimitStatus();

    res.json({
      queue: queueStatus,
      rateLimit: rateLimitStatus,
    });
  });

  // Circuit Breaker Status
  app.get("/circuit-breaker/status", async (req, res) => {
    const cb = orchestrator.getCircuitBreaker();
    const status = cb.getStatus();
    res.json(status);
  });

  // Circuit Breaker Reset
  app.post("/circuit-breaker/reset", async (req, res) => {
    const cb = orchestrator.getCircuitBreaker();
    cb.reset();
    res.json({ success: true, message: "Circuit breaker reset" });
  });

  // Circuit Breaker Force Open
  app.post("/circuit-breaker/force-open", async (req, res) => {
    const cb = orchestrator.getCircuitBreaker();
    cb.forceOpen();
    res.json({ success: true, message: "Circuit breaker forced open" });
  });

  // Business Hours
  app.get("/business-hours", async (req, res) => {
    const rules = orchestrator.getBusinessRules();
    const hours = rules.getBusinessHours();
    res.json(hours);
  });

  app.put("/business-hours", async (req, res) => {
    const schema = z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const rules = orchestrator.getBusinessRules();
    rules.setBusinessHours(data.start, data.end, data.timezone);
    await systemConfigService.updateConfig(
      {
        businessHoursStart: data.start,
        businessHoursEnd: data.end,
        timezone: data.timezone,
      },
      req.user!.userId,
    );

    res.json({ success: true, businessHours: data });
  });

  // Contacts
  app.get("/contacts", async (req, res) => {
    const rawTake = Number(req.query.take);
    const rawSkip = Number(req.query.skip);
    const hasPagination = !Number.isNaN(rawTake);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const statusParam = req.query.status;

    const where: Prisma.ContactWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (statusParam === "optIn") {
      where.optIn = true;
    } else if (statusParam === "optOut") {
      where.optIn = false;
    }

    const take = hasPagination ? Math.max(1, rawTake) : undefined;
    const skip = hasPagination ? Math.max(0, rawSkip) : undefined;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      take,
      skip,
    });

    if (hasPagination && typeof take === "number" && typeof skip === "number") {
      const total = await prisma.contact.count({ where });
      return res.json({
        items: contacts,
        hasMore: skip + contacts.length < total,
        total,
      });
    }

    res.json(contacts);
  });

  app.get("/contacts/:id", async (req, res) => {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        flowInstances: {
          include: { flow: true },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  });

  // Messages
  app.get("/messages", async (req, res) => {
    const rawTake = Number(req.query.take);
    const rawSkip = Number(req.query.skip);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const statusParam = req.query.status;
    const directionParam = req.query.direction;

    const where: Prisma.MessageWhereInput = {};

    if (search) {
      where.OR = [
        { content: { contains: search } },
        { contact: { phone: { contains: search } } },
      ];
    }

    if (statusParam && typeof statusParam === "string") {
      const upper = statusParam.toLowerCase();
      const allowedStatuses = Object.values(MessageStatus);
      const match = allowedStatuses.includes(upper as MessageStatus);
      if (match) {
        where.status = upper as MessageStatus;
      }
    }

    if (directionParam && typeof directionParam === "string") {
      const allowedDirections = Object.values(MessageDirection);
      const lower = directionParam.toLowerCase();
      if (allowedDirections.includes(lower as MessageDirection)) {
        where.direction = lower as MessageDirection;
      }
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: true,
      },
      take,
      skip,
    });

    const total = await prisma.message.count({ where });
    return res.json({
      items: messages,
      hasMore: skip + messages.length < total,
      total,
    });
  });

  // ==================== Admin Only Endpoints ====================

  // List all users
  app.get("/admin/users", authorize(UserRole.admin), async (req, res) => {
    const users = await authService.listUsers();
    res.json(users);
  });

  // Update user role
  app.put(
    "/admin/users/:id/role",
    authorize(UserRole.admin),
    async (req, res) => {
      const schema = z.object({
        role: z.enum(["admin", "operator"]),
      });

      try {
        const data = schema.parse(req.body);
        await authService.updateUserRole(req.params.id, data.role);
        res.json({ success: true, message: "User role updated" });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    },
  );

  // Deactivate user
  app.post(
    "/admin/users/:id/deactivate",
    authorize(UserRole.admin),
    async (req, res) => {
      try {
        await authService.deactivateUser(req.params.id);
        res.json({ success: true, message: "User deactivated" });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    },
  );

  // Activate user
  app.post(
    "/admin/users/:id/activate",
    authorize(UserRole.admin),
    async (req, res) => {
      try {
        await authService.activateUser(req.params.id);
        res.json({ success: true, message: "User activated" });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    },
  );

  // Scheduled cleanup task (keep 90 days of messages)
  const runCleanup = async () => {
    try {
      const retentionDays = 90;
      const date = new Date();
      date.setDate(date.getDate() - retentionDays);

      const { count } = await prisma.message.deleteMany({
        where: { createdAt: { lt: date } }
      });

      if (count > 0) {
        logger.info({ count }, 'Cleaned up old messages');
      }
    } catch (e) {
      logger.error({ error: e }, 'Cleanup failed');
    }
  };

  // Run cleanup initially and every 24h
  void runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);

  // Error handler (keep last)
  app.use(errorHandler);

  return { app, websocketService, httpServer };
}
