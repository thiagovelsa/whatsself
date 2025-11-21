import { promises as fs, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SystemConfigValues } from "./systemConfigService.js";

import { createLogger } from "./logger.js";

const logger = createLogger("circuit-breaker");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_CIRCUIT_STATE = resolve(
  __dirname,
  "..",
  "..",
  "data",
  "circuit_state.json",
);

export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Circuit is open, blocking operations
  HALF_OPEN = "HALF_OPEN", // Testing if system recovered
}

export type CircuitBreakerConfig = {
  windowMode: string; // e.g., "5m_or_50" - 5 minutes or 50 attempts
  minAttempts: number; // Minimum attempts before opening circuit
  failRateThreshold: number; // Failure rate to open circuit (0.0 - 1.0)
  probeIntervalSec: number; // Seconds before entering HALF_OPEN
  probeSuccessThreshold: number; // Success rate to close circuit (0.0 - 1.0)
  probeSamples: number; // Number of samples in HALF_OPEN mode
  cooldownInitialSec: number; // Initial cooldown in OPEN state
  cooldownMaxSec: number; // Maximum cooldown duration
};

type Attempt = {
  timestamp: number;
  success: boolean;
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  private attempts: Attempt[] = [];
  private openedAt: number | null = null;
  private cooldownMultiplier: number = 1;
  private halfOpenAttempts: Attempt[] = [];
  private stateChangeListener?: (
    state: CircuitState,
    failureRate: number,
  ) => void;
  private unsubscribeConfig?: () => void;
  private cooldownTimeout: NodeJS.Timeout | null = null;
  private stateFile: string = DEFAULT_CIRCUIT_STATE;
  private isSavingState = false;
  private pendingSave = false;
  private shouldPersistState = process.env.NODE_ENV !== "test";

  constructor(options?: {
    initialConfig?: SystemConfigValues;
    subscribe?: (listener: (config: SystemConfigValues) => void) => () => void;
  }) {
    if (options?.initialConfig) {
      this.config = this.mapConfig(options.initialConfig);
    } else {
      this.config = {
        windowMode: "5m_or_50",
        minAttempts: 20,
        failRateThreshold: 0.25,
        probeIntervalSec: 45,
        probeSuccessThreshold: 0.9,
        probeSamples: 10,
        cooldownInitialSec: 300,
        cooldownMaxSec: 1800,
      };
    }

    if (options?.subscribe) {
      this.unsubscribeConfig = options.subscribe((cfg) => {
        this.config = this.mapConfig(cfg);
        logger.info({ config: this.config }, "Circuit breaker config updated");
      });
    }

    if (process.env.CIRCUIT_BREAKER_STATE_PATH) {
      this.stateFile = resolve(process.env.CIRCUIT_BREAKER_STATE_PATH);
    }
    if (this.shouldPersistState) {
      this.restoreState();
    }
    logger.info(
      { config: this.config, stateFile: this.stateFile },
      "Circuit breaker initialized",
    );
  }

  private mapConfig(config: SystemConfigValues): CircuitBreakerConfig {
    return {
      windowMode: config.cbWindowMode,
      minAttempts: config.cbMinAttempts,
      failRateThreshold: config.cbFailRateOpen,
      probeIntervalSec: config.cbProbeIntervalSec,
      probeSuccessThreshold: config.cbProbeSuccessClose,
      probeSamples: config.cbProbeSamples,
      cooldownInitialSec: config.cbCooldownInitialSec,
      cooldownMaxSec: config.cbCooldownMaxSec,
    };
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.recordAttempt(true);
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.recordAttempt(false);
  }

  private recordAttempt(success: boolean): void {
    const attempt: Attempt = {
      timestamp: Date.now(),
      success,
    };

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts.push(attempt);
      this.checkHalfOpenState();
    } else {
      this.attempts.push(attempt);
      this.cleanOldAttempts();

      if (this.state === CircuitState.CLOSED) {
        this.checkShouldOpen();
      }
    }

    logger.debug(
      {
        state: this.state,
        success,
        totalAttempts: this.attempts.length,
        failureRate: this.getFailureRate(),
      },
      "Attempt recorded",
    );
    void this.persistState();
  }

  private cleanOldAttempts(): void {
    const windowMs = this.parseWindowDuration();
    const cutoff = Date.now() - windowMs;
    this.attempts = this.attempts.filter((a) => a.timestamp > cutoff);
  }

  private parseWindowDuration(): number {
    // Parse "5m_or_50" format
    const match = this.config.windowMode.match(/(\d+)m/);
    if (match) {
      return parseInt(match[1]) * 60 * 1000; // minutes to milliseconds
    }
    return 5 * 60 * 1000; // Default 5 minutes
  }

  private checkShouldOpen(): void {
    const totalAttempts = this.attempts.length;

    if (totalAttempts < this.config.minAttempts) {
      return; // Not enough data
    }

    const failureRate = this.getFailureRate();

    if (failureRate >= this.config.failRateThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();

    logger.warn(
      {
        failureRate: this.getFailureRate(),
        threshold: this.config.failRateThreshold,
        attempts: this.attempts.length,
      },
      "Circuit breaker OPENED - blocking operations",
    );

    // Schedule transition to HALF_OPEN
    const cooldown = Math.min(
      this.config.cooldownInitialSec * this.cooldownMultiplier,
      this.config.cooldownMaxSec,
    );

    this.scheduleHalfOpenTransition(cooldown * 1000);
    this.notifyStateChange();
    void this.persistState();
  }

  private enterHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenAttempts = [];

    logger.info("Circuit breaker entering HALF_OPEN - testing recovery");
    this.notifyStateChange();
    void this.persistState();
  }

  private checkHalfOpenState(): void {
    if (this.halfOpenAttempts.length < this.config.probeSamples) {
      return; // Not enough samples yet
    }

    const successCount = this.halfOpenAttempts.filter((a) => a.success).length;
    const successRate = successCount / this.halfOpenAttempts.length;

    if (successRate >= this.config.probeSuccessThreshold) {
      this.closeCircuit();
    } else {
      // Failed recovery - reopen circuit with increased cooldown
      this.cooldownMultiplier = Math.min(this.cooldownMultiplier * 2, 8);
      this.openCircuit();
    }
  }

  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = null;
    this.cooldownMultiplier = 1;
    this.attempts = [];
    this.halfOpenAttempts = [];
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
      this.cooldownTimeout = null;
    }

    logger.info("Circuit breaker CLOSED - normal operation resumed");
    this.notifyStateChange();
    void this.persistState();
  }

  /**
   * Check if operation is allowed
   */
  isAllowed(): boolean {
    if (this.state === CircuitState.OPEN) {
      return false;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      // Allow limited probes in HALF_OPEN
      return this.halfOpenAttempts.length < this.config.probeSamples;
    }

    return true; // CLOSED state
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure rate in current window
   */
  getFailureRate(): number {
    if (this.attempts.length === 0) {
      return 0;
    }

    const failures = this.attempts.filter((a) => !a.success).length;
    return failures / this.attempts.length;
  }

  /**
   * Get detailed status
   */
  getStatus(): {
    state: CircuitState;
    failureRate: number;
    totalAttempts: number;
    openedAt: number | null;
    cooldownMultiplier: number;
    isAllowed: boolean;
  } {
    return {
      state: this.state,
      failureRate: this.getFailureRate(),
      totalAttempts: this.attempts.length,
      openedAt: this.openedAt,
      cooldownMultiplier: this.cooldownMultiplier,
      isAllowed: this.isAllowed(),
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = null;
    this.cooldownMultiplier = 1;
    this.attempts = [];
    this.halfOpenAttempts = [];
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
      this.cooldownTimeout = null;
    }

    logger.info("Circuit breaker manually reset");
    this.notifyStateChange();
    void this.persistState();
  }

  /**
   * Force open the circuit (for emergency shutdown)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();
    this.scheduleHalfOpenTransition(
      Math.min(
        this.config.cooldownInitialSec * this.cooldownMultiplier,
        this.config.cooldownMaxSec,
      ) * 1000,
    );
    logger.warn("Circuit breaker FORCE OPENED");
    this.notifyStateChange();
    void this.persistState();
  }

  /**
   * Force close the circuit (manual recovery)
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = null;
    this.halfOpenAttempts = [];
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
      this.cooldownTimeout = null;
    }

    logger.info("Circuit breaker FORCE CLOSED");
    this.notifyStateChange();
    void this.persistState();
  }

  setStateChangeListener(
    listener?: (state: CircuitState, failureRate: number) => void,
  ): void {
    this.stateChangeListener = listener;
  }

  private notifyStateChange(): void {
    if (this.stateChangeListener) {
      this.stateChangeListener(this.state, this.getFailureRate());
    }
  }

  private scheduleHalfOpenTransition(delayMs: number): void {
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
    }
    this.cooldownTimeout = setTimeout(
      () => {
        this.cooldownTimeout = null;
        this.enterHalfOpen();
      },
      Math.max(delayMs, 0),
    );
  }

  private restoreState(): void {
    try {
      if (!existsSync(this.stateFile)) {
        return;
      }
      const raw = readFileSync(this.stateFile, "utf-8");
      const data = JSON.parse(raw) as {
        state?: CircuitState;
        attempts?: Attempt[];
        halfOpenAttempts?: Attempt[];
        openedAt?: number | null;
        cooldownMultiplier?: number;
      };
      if (data.state) {
        this.state = data.state;
      }
      if (Array.isArray(data.attempts)) {
        this.attempts = data.attempts;
        this.cleanOldAttempts();
      }
      if (Array.isArray(data.halfOpenAttempts)) {
        this.halfOpenAttempts = data.halfOpenAttempts;
      }
      if (typeof data.openedAt === "number") {
        this.openedAt = data.openedAt;
      }
      if (typeof data.cooldownMultiplier === "number") {
        this.cooldownMultiplier = data.cooldownMultiplier;
      }
      if (this.state === CircuitState.OPEN && this.openedAt) {
        const cooldown =
          Math.min(
            this.config.cooldownInitialSec * this.cooldownMultiplier,
            this.config.cooldownMaxSec,
          ) * 1000;
        const elapsed = Date.now() - this.openedAt;
        const remaining = Math.max(cooldown - elapsed, 0);
        this.scheduleHalfOpenTransition(remaining);
      }
      logger.info({ state: this.state }, "Circuit breaker state restored");
    } catch (error) {
      logger.warn({ error }, "Failed to restore circuit breaker state");
    }
  }

  private async persistState(): Promise<void> {
    if (!this.shouldPersistState) {
      return;
    }
    try {
      if (this.isSavingState) {
        this.pendingSave = true;
        return;
      }
      this.isSavingState = true;
      const payload = {
        state: this.state,
        attempts: this.attempts,
        halfOpenAttempts: this.halfOpenAttempts,
        openedAt: this.openedAt,
        cooldownMultiplier: this.cooldownMultiplier,
      };
      await fs.mkdir(dirname(this.stateFile), { recursive: true });
      await fs.writeFile(this.stateFile, JSON.stringify(payload));
    } catch (error) {
      logger.warn({ error }, "Failed to persist circuit breaker state");
    } finally {
      this.isSavingState = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        void this.persistState();
      }
    }
  }
}
