import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState } from '../services/circuitBreaker.js';
import type { SystemConfigValues } from '../services/systemConfigService.js';

function buildTestConfig(): SystemConfigValues {
  return {
    jwtSecret: 'test-secret',
    defaultAdminEmail: 'admin@test.local',
    defaultAdminPassword: 'Admin!1234',
    skipWhatsapp: false,
    puppeteerExecutablePath: null,
    rateMaxPerMin: 12,
    ratePerContactPer5Min: 2,
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    timezone: 'America/Sao_Paulo',
    wsPort: 3002,
    wsPath: '/socket.io',
    humanizerMinDelayMs: 3000,
    humanizerMaxDelayMs: 7000,
    humanizerMinTypingMs: 1500,
    humanizerMaxTypingMs: 3500,
    cbWindowMode: '5m_or_50',
    cbMinAttempts: 5,
    cbFailRateOpen: 0.5,
    cbProbeIntervalSec: 1,
    cbProbeSuccessClose: 0.8,
    cbProbeSamples: 5,
    cbCooldownInitialSec: 1,
    cbCooldownMaxSec: 10,
    windowsTempDir: null,
    windowsLongPathSupport: true,
    updatedAt: new Date()
  };
}

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      initialConfig: buildTestConfig()
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitState.CLOSED);
    });

    it('should allow operations when closed', () => {
      expect(circuitBreaker.isAllowed()).toBe(true);
    });
  });

  describe('Failure Recording', () => {
    it('should record failures and update failure rate', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      const status = circuitBreaker.getStatus();
      expect(status.failureRate).toBeCloseTo(0.67, 1);
    });

    it('should open circuit when failure rate exceeds threshold', () => {
      // Record enough failures to exceed threshold (50% with min 5 attempts)
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isAllowed()).toBe(false);
    });

    it('should not open with insufficient attempts', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Manual Control', () => {
    it('should manually open circuit', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isAllowed()).toBe(false);
    });

    it('should manually close circuit', () => {
      circuitBreaker.forceOpen();
      circuitBreaker.forceClose();
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isAllowed()).toBe(true);
    });

    it('should reset circuit to initial state', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.reset();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitState.CLOSED);
      expect(status.failureRate).toBe(0);
      expect(status.totalAttempts).toBe(0);
    });
  });

  describe('Half-Open State', () => {
    it('should transition to HALF_OPEN after cooldown', async () => {
      // Force circuit open
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

      // Wait for cooldown (1 second in test config)
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('Statistics', () => {
    it('should track total attempts correctly', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      const status = circuitBreaker.getStatus();
      expect(status.totalAttempts).toBe(3);
    });

    it('should calculate failure rate correctly', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      const status = circuitBreaker.getStatus();
      expect(status.failureRate).toBe(0.5);
    });

    it('should return 0 failure rate with no attempts', () => {
      const status = circuitBreaker.getStatus();
      expect(status.failureRate).toBe(0);
    });
  });
});
