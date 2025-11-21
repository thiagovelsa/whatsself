import { PrismaClient } from "@prisma/client";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SystemConfigValues } from "./systemConfigService.js";
import { createLogger } from "./logger.js";

const logger = createLogger("message-queue");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_STATE_FILE = resolve(
  __dirname,
  "..",
  "..",
  "data",
  "message_queue_state.json",
);

export type QueuedMessage = {
  id: string;
  contactId: string;
  phone: string;
  text: string;
  priority: number;
  enqueuedAt: Date;
  metadata?: Record<string, any>;
  retryCount?: number;
  lastRetryAt?: Date;
};

export type RateLimitConfig = {
  maxPerMinute: number; // Global rate limit
  maxPerContactPer5Min: number; // Per-contact rate limit
};

type PersistedQueueState = {
  queue: Array<Omit<QueuedMessage, "enqueuedAt"> & { enqueuedAt: string }>;
  globalSentTimes: number[];
  contactSentTimes: Record<string, number[]>;
};

export class MessageQueue {
  private static readonly MAX_QUEUE_SIZE = 10000; // Limite máximo para evitar overflow
  private queue: QueuedMessage[] = [];
  private processing = false;
  private prisma: PrismaClient;
  private config: RateLimitConfig;
  private sendFunction: (message: QueuedMessage) => Promise<void>;
  private unsubscribeConfig?: () => void;
  private processingTimer: NodeJS.Timeout | null = null;
  private stateFile: string;
  private isSavingState = false;
  private pendingStateSave = false;
  private shouldPersistState = process.env.NODE_ENV !== "test";

  // Rate limiting tracking
  private globalSentTimes: number[] = []; // Timestamps of sent messages
  private contactSentTimes: Map<string, number[]> = new Map(); // Per-contact timestamps

  constructor(
    prisma: PrismaClient,
    sendFunction: (message: QueuedMessage) => Promise<void>,
    options?: {
      config?: Partial<RateLimitConfig>;
      systemConfig?: SystemConfigValues;
      subscribe?: (
        listener: (config: SystemConfigValues) => void,
      ) => () => void;
    },
  ) {
    this.prisma = prisma;
    this.sendFunction = sendFunction;
    if (options?.systemConfig) {
      this.config = {
        maxPerMinute: options.systemConfig.rateMaxPerMin,
        maxPerContactPer5Min: options.systemConfig.ratePerContactPer5Min,
      };
      if (options.subscribe) {
        this.unsubscribeConfig = options.subscribe((cfg) => {
          this.config = {
            maxPerMinute: cfg.rateMaxPerMin,
            maxPerContactPer5Min: cfg.ratePerContactPer5Min,
          };
          logger.info({ config: this.config }, "Message queue config updated");
        });
      }
    } else {
      this.config = {
        maxPerMinute: options?.config?.maxPerMinute || 12,
        maxPerContactPer5Min: options?.config?.maxPerContactPer5Min || 2,
      };
    }

    this.stateFile = process.env.MESSAGE_QUEUE_STATE_PATH
      ? resolve(process.env.MESSAGE_QUEUE_STATE_PATH)
      : DEFAULT_STATE_FILE;
    if (this.shouldPersistState) {
      this.restoreState();
    }
    logger.info(
      { config: this.config, stateFile: this.stateFile },
      "Message queue initialized",
    );
    this.scheduleProcessing();
  }

  async enqueue(
    message: Omit<QueuedMessage, "id" | "enqueuedAt"> & { id?: string },
  ): Promise<string> {
    // Verificar se a fila está no limite máximo
    if (this.queue.length >= MessageQueue.MAX_QUEUE_SIZE) {
      logger.error({
        queueLength: this.queue.length,
        maxSize: MessageQueue.MAX_QUEUE_SIZE,
        contactId: message.contactId,
      }, "Queue is full - rejecting message");
      throw new Error(`Message queue is full (${MessageQueue.MAX_QUEUE_SIZE} messages). Please wait before sending more messages.`);
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      enqueuedAt: new Date(),
    };

    this.queue.push(queuedMessage);
    this.sortQueue();

    logger.info(
      {
        messageId: queuedMessage.id,
        contactId: message.contactId,
        queueLength: this.queue.length,
        priority: message.priority,
      },
      "Message enqueued",
    );

    await this.persistState();
    this.scheduleProcessing();

    return queuedMessage.id;
  }

  private scheduleProcessing(delayMs = 0): void {
    if (this.processingTimer) return;
    if (this.queue.length === 0) return;
    this.processingTimer = setTimeout(() => {
      this.processingTimer = null;
      void this.processNext();
    }, delayMs);
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    let nextIndex = -1;
    const now = Date.now();
    const BASE_RETRY_DELAY = 5000; // 5 seconds

    // Limpar contactSentTimes de contatos inativos (mais de 5 minutos sem mensagens)
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    for (const [contactId, times] of this.contactSentTimes) {
      const activeTimes = times.filter(t => t > fiveMinutesAgo);
      if (activeTimes.length === 0) {
        this.contactSentTimes.delete(contactId);
      } else if (activeTimes.length < times.length) {
        this.contactSentTimes.set(contactId, activeTimes);
      }
    }

    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];

      // Check if message is in retry backoff period
      if (candidate.retryCount && candidate.lastRetryAt) {
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, candidate.retryCount - 1);
        const nextRetryTime = new Date(candidate.lastRetryAt).getTime() + retryDelay;
        if (now < nextRetryTime) {
          continue; // Skip this message, still in backoff
        }
      }

      const canSend = this.checkRateLimits(candidate.contactId);
      if (canSend) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex === -1) {
      this.processing = false;
      this.scheduleProcessing(2000);
      return;
    }

    const [message] = this.queue.splice(nextIndex, 1);

    // Add random delay to prevent ban risk (2-5 seconds)
    const delay = Math.floor(Math.random() * (5000 - 2000 + 1) + 2000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.sendFunction(message);
      this.recordSentMessage(message.contactId);
      await this.persistState();

      logger.info(
        {
          messageId: message.id,
          contactId: message.contactId,
          queueLength: this.queue.length,
        },
        "Message sent successfully",
      );
    } catch (error) {
      logger.error(
        {
          error,
          messageId: message.id,
          contactId: message.contactId,
        },
        "Failed to send message",
      );

      // Configure retry logic
      const MAX_RETRIES = 5;
      const BASE_RETRY_DELAY = 5000; // 5 seconds

      const retryCount = (message.retryCount || 0) + 1;

      // Check if we should retry
      if (retryCount <= MAX_RETRIES && message.priority > -10) {
        // Calculate exponential backoff (5s, 10s, 20s, 40s, 80s)
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1);

        logger.warn({
          messageId: message.id,
          contactId: message.contactId,
          retryCount,
          maxRetries: MAX_RETRIES,
          nextRetryIn: retryDelay / 1000
        }, `Message send failed, retry ${retryCount}/${MAX_RETRIES} in ${retryDelay / 1000}s`);

        // Add message back to queue with updated retry info
        this.queue.push({
          ...message,
          priority: message.priority - 1,
          retryCount,
          lastRetryAt: new Date()
        });
        this.sortQueue();

        // Schedule next processing with delay
        this.scheduleProcessing(retryDelay);
      } else {
        logger.error({
          messageId: message.id,
          contactId: message.contactId,
          retryCount,
          finalError: error
        }, "Message permanently failed after max retries");

        // You might want to save failed messages to a dead letter queue
        // or database for manual inspection/retry later
      }
      await this.persistState();
    }

    this.processing = false;
    this.scheduleProcessing();
  }

  private checkRateLimits(contactId: string): boolean {
    const now = Date.now();

    // Clean old timestamps (older than 5 minutes)
    this.globalSentTimes = this.globalSentTimes.filter(
      (t) => now - t < 5 * 60 * 1000,
    );

    // Check global rate limit (per minute)
    const oneMinuteAgo = now - 60 * 1000;
    const sentLastMinute = this.globalSentTimes.filter(
      (t) => t > oneMinuteAgo,
    ).length;

    if (sentLastMinute >= this.config.maxPerMinute) {
      logger.debug(
        { sentLastMinute, limit: this.config.maxPerMinute },
        "Global rate limit hit",
      );
      return false;
    }

    // Check per-contact rate limit (per 5 minutes)
    const contactTimes = this.contactSentTimes.get(contactId) || [];
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const contactSentLast5Min = contactTimes.filter(
      (t) => t > fiveMinutesAgo,
    ).length;

    if (contactSentLast5Min >= this.config.maxPerContactPer5Min) {
      logger.debug(
        {
          contactId,
          sentLast5Min: contactSentLast5Min,
          limit: this.config.maxPerContactPer5Min,
        },
        "Per-contact rate limit hit",
      );
      return false;
    }

    return true;
  }

  private recordSentMessage(contactId: string): void {
    const now = Date.now();

    // Record globally
    this.globalSentTimes.push(now);

    // Record per-contact
    const contactTimes = this.contactSentTimes.get(contactId) || [];
    contactTimes.push(now);
    this.contactSentTimes.set(contactId, contactTimes);

    // Clean old entries
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.contactSentTimes.set(
      contactId,
      contactTimes.filter((t) => t > fiveMinutesAgo),
    );
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority === a.priority) {
        return a.enqueuedAt.getTime() - b.enqueuedAt.getTime();
      }
      return b.priority - a.priority;
    });
  }

  private restoreState(): void {
    try {
      if (!existsSync(this.stateFile)) {
        return;
      }
      const raw = readFileSync(this.stateFile, "utf-8");
      const data = JSON.parse(raw) as PersistedQueueState;
      if (Array.isArray(data.queue)) {
        this.queue = data.queue.map((item) => ({
          ...item,
          enqueuedAt: new Date(item.enqueuedAt),
        }));
        this.sortQueue();
      }
      if (Array.isArray(data.globalSentTimes)) {
        this.globalSentTimes = data.globalSentTimes;
      }
      if (data.contactSentTimes && typeof data.contactSentTimes === "object") {
        this.contactSentTimes = new Map(
          Object.entries(data.contactSentTimes).map(
            ([contactId, timestamps]) => [
              contactId,
              Array.isArray(timestamps) ? timestamps : [],
            ],
          ),
        );
      }
      logger.info(
        { queueLength: this.queue.length },
        "Message queue state restored",
      );
    } catch (error) {
      logger.warn({ error }, "Failed to restore message queue state");
    }
  }

  private async persistState(): Promise<void> {
    if (!this.shouldPersistState) {
      return;
    }
    try {
      if (this.isSavingState) {
        this.pendingStateSave = true;
        return;
      }
      this.isSavingState = true;
      const payload: PersistedQueueState = {
        queue: this.queue.map((item) => ({
          ...item,
          enqueuedAt: item.enqueuedAt.toISOString(),
        })),
        globalSentTimes: this.globalSentTimes,
        contactSentTimes: Object.fromEntries(this.contactSentTimes.entries()),
      };
      await fs.mkdir(dirname(this.stateFile), { recursive: true });
      await fs.writeFile(this.stateFile, JSON.stringify(payload));
    } catch (error) {
      logger.warn({ error }, "Failed to persist message queue state");
    } finally {
      this.isSavingState = false;
      if (this.pendingStateSave) {
        this.pendingStateSave = false;
        void this.persistState();
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueueStatus(): {
    length: number;
    processing: boolean;
    oldestMessage: Date | null;
  } {
    return {
      length: this.queue.length,
      processing: this.processing,
      oldestMessage: this.queue.length > 0 ? this.queue[0].enqueuedAt : null,
    };
  }

  getRateLimitStatus(): {
    globalLimit: number;
    sentLastMinute: number;
    perContactLimit: number;
    activeContacts: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const sentLastMinute = this.globalSentTimes.filter(
      (t) => t > oneMinuteAgo,
    ).length;

    // Count active contacts (sent message in last 5 minutes)
    let activeContacts = 0;
    for (const times of this.contactSentTimes.values()) {
      if (times.some((t) => now - t < 5 * 60 * 1000)) {
        activeContacts++;
      }
    }

    return {
      globalLimit: this.config.maxPerMinute,
      sentLastMinute,
      perContactLimit: this.config.maxPerContactPer5Min,
      activeContacts,
    };
  }

  clear(): void {
    this.queue = [];
    void this.persistState();
    logger.info("Queue cleared");
  }
}
