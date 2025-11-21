import { PrismaClient } from '@prisma/client';
import { readFileSync, watchFile, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { config as dotenv } from 'dotenv';
import { systemConfigService } from './systemConfigService.js';
import type { SystemConfigUpdateInput } from './systemConfigService.js';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createLogger('config-sync');

export class ConfigSyncService {
    private envPath: string;
    private lastEnvHash: string | null = null;
    private isWatching = false;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Localiza o arquivo .env
        this.envPath = resolve(__dirname, '..', '..', '.env');
    }

    /**
     * Calcula hash do arquivo .env para detectar mudanças
     */
    private getEnvFileHash(): string | null {
        try {
            if (!existsSync(this.envPath)) {
                logger.warn({ path: this.envPath }, '.env file not found');
                return null;
            }
            const content = readFileSync(this.envPath, 'utf-8');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            logger.error({ error }, 'Error reading .env file');
            return null;
        }
    }

    /**
     * Normaliza valores booleanos vindos do .env
     */
    private normalizeBooleanValue(value: string | undefined | null): string {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    }

    /**
     * Lê e parseia o arquivo .env
     */
    private parseEnvFile(): Record<string, string> {
        try {
            const envConfig = dotenv({ path: this.envPath });
            return envConfig.parsed || {};
        } catch (error) {
            logger.error({ error }, 'Error parsing .env file');
            return {};
        }
    }

    /**
     * Mapeia valores do .env para o formato do SystemConfig
     */
    private mapEnvToSystemConfig(env: Record<string, string>): Partial<SystemConfigUpdateInput> {
        const update: Partial<SystemConfigUpdateInput> = {};

        // Mapeia campos booleanos
        const booleanFields = ['SKIP_WHATSAPP', 'PUPPETEER_HEADLESS', 'WINDOWS_LONG_PATH_SUPPORT'];
        const falseLikeValues = ['false', '0', 'no', 'off', ''];
        booleanFields.forEach(field => {
            if (field in env) {
                const normalizedValue = this.normalizeBooleanValue(env[field]);
                const boolValue = !falseLikeValues.includes(normalizedValue);

                if (field === 'SKIP_WHATSAPP') {
                    update.skipWhatsapp = boolValue;
                } else if (field === 'WINDOWS_LONG_PATH_SUPPORT') {
                    update.windowsLongPathSupport = boolValue;
                }
            }
        });

        // Mapeia campos de string
        if (env.JWT_SECRET) update.jwtSecret = env.JWT_SECRET;
        if (env.DEFAULT_ADMIN_EMAIL) update.defaultAdminEmail = env.DEFAULT_ADMIN_EMAIL;
        if (env.DEFAULT_ADMIN_PASSWORD) update.defaultAdminPassword = env.DEFAULT_ADMIN_PASSWORD;
        if (env.PUPPETEER_EXECUTABLE_PATH) update.puppeteerExecutablePath = env.PUPPETEER_EXECUTABLE_PATH;
        if (env.TIMEZONE) update.timezone = env.TIMEZONE;
        if (env.WS_PATH) update.wsPath = env.WS_PATH;
        if (env.CB_WINDOW_MODE) update.cbWindowMode = env.CB_WINDOW_MODE;
        if (env.WINDOWS_TEMP_DIR) update.windowsTempDir = env.WINDOWS_TEMP_DIR;

        // Mapeia campos numéricos
        const numericFields = {
            'RATE_MAX_PER_MIN': 'rateMaxPerMin',
            'RATE_PER_CONTACT_PER_5MIN': 'ratePerContactPer5Min',
            'WS_PORT': 'wsPort',
            'HUMANIZER_MIN_DELAY_MS': 'humanizerMinDelayMs',
            'HUMANIZER_MAX_DELAY_MS': 'humanizerMaxDelayMs',
            'HUMANIZER_MIN_TYPING_MS': 'humanizerMinTypingMs',
            'HUMANIZER_MAX_TYPING_MS': 'humanizerMaxTypingMs',
            'CB_MIN_ATTEMPTS': 'cbMinAttempts',
            'CB_FAIL_RATE_OPEN': 'cbFailRateOpen',
            'CB_PROBE_INTERVAL_SEC': 'cbProbeIntervalSec',
            'CB_PROBE_SUCCESS_CLOSE': 'cbProbeSuccessClose',
            'CB_PROBE_SAMPLES': 'cbProbeSamples',
            'CB_COOLDOWN_INITIAL_SEC': 'cbCooldownInitialSec',
            'CB_COOLDOWN_MAX_SEC': 'cbCooldownMaxSec'
        };

        Object.entries(numericFields).forEach(([envKey, configKey]) => {
            if (env[envKey]) {
                (update as any)[configKey] = Number(env[envKey]);
            }
        });

        // Mapeia horário comercial
        if (env.BUSINESS_HOURS) {
            const [start, end] = env.BUSINESS_HOURS.split('-');
            if (start && end) {
                update.businessHoursStart = start.trim();
                update.businessHoursEnd = end.trim();
            }
        }

        return update;
    }

    /**
     * Sincroniza configurações do .env com o banco
     */
    async syncFromEnv(): Promise<boolean> {
        try {
            const currentHash = this.getEnvFileHash();

            // Se o hash não mudou, não precisa sincronizar
            if (currentHash === this.lastEnvHash) {
                return false;
            }

            logger.info('Detected .env file changes, synchronizing...');

            const envVars = this.parseEnvFile();
            const configUpdate = this.mapEnvToSystemConfig(envVars);

            if (Object.keys(configUpdate).length > 0) {
                await systemConfigService.updateConfig(configUpdate, 'system-sync');
                this.lastEnvHash = currentHash;
                logger.info('Configuration synchronized from .env successfully');
                return true;
            }

            this.lastEnvHash = currentHash;
            return false;
        } catch (error) {
            logger.error({ error }, 'Error synchronizing configuration');
            return false;
        }
    }

    /**
     * Inicia monitoramento automático do arquivo .env
     */
    startAutoSync(intervalMs: number = 5000): void {
        if (this.isWatching) {
            logger.warn('Auto-sync already running');
            return;
        }

        // Sincroniza imediatamente na inicialização
        this.syncFromEnv();

        // Configura verificação periódica
        this.syncInterval = setInterval(() => {
            this.syncFromEnv();
        }, intervalMs);

        // Também monitora mudanças no arquivo
        if (existsSync(this.envPath)) {
            watchFile(this.envPath, { interval: 2000 }, () => {
                logger.debug('.env file change detected by watcher');
                this.syncFromEnv();
            });
        }

        this.isWatching = true;
        logger.info(`Auto-sync started, checking every ${intervalMs}ms`);
    }

    /**
     * Para o monitoramento automático
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isWatching = false;
        logger.info('Auto-sync stopped');
    }

    /**
     * Exporta configurações atuais do banco para o .env
     */
    async exportToEnv(): Promise<void> {
        try {
            const config = systemConfigService.getConfig();
            let envContent = readFileSync(this.envPath, 'utf-8');

            // Atualiza ou adiciona cada configuração
            const updates: Record<string, string> = {
                'SKIP_WHATSAPP': String(config.skipWhatsapp),
                'RATE_MAX_PER_MIN': String(config.rateMaxPerMin),
                'RATE_PER_CONTACT_PER_5MIN': String(config.ratePerContactPer5Min),
                'BUSINESS_HOURS': `${config.businessHoursStart}-${config.businessHoursEnd}`,
                'TIMEZONE': config.timezone,
                'WS_PORT': String(config.wsPort),
                'WS_PATH': config.wsPath,
                'HUMANIZER_MIN_DELAY_MS': String(config.humanizerMinDelayMs),
                'HUMANIZER_MAX_DELAY_MS': String(config.humanizerMaxDelayMs),
                'HUMANIZER_MIN_TYPING_MS': String(config.humanizerMinTypingMs),
                'HUMANIZER_MAX_TYPING_MS': String(config.humanizerMaxTypingMs),
                'CB_WINDOW_MODE': config.cbWindowMode,
                'CB_MIN_ATTEMPTS': String(config.cbMinAttempts),
                'CB_FAIL_RATE_OPEN': String(config.cbFailRateOpen),
                'CB_PROBE_INTERVAL_SEC': String(config.cbProbeIntervalSec),
                'CB_PROBE_SUCCESS_CLOSE': String(config.cbProbeSuccessClose),
                'CB_PROBE_SAMPLES': String(config.cbProbeSamples),
                'CB_COOLDOWN_INITIAL_SEC': String(config.cbCooldownInitialSec),
                'CB_COOLDOWN_MAX_SEC': String(config.cbCooldownMaxSec),
                'WINDOWS_LONG_PATH_SUPPORT': String(config.windowsLongPathSupport)
            };

            // Campos opcionais
            if (config.puppeteerExecutablePath) {
                updates['PUPPETEER_EXECUTABLE_PATH'] = config.puppeteerExecutablePath;
            }
            if (config.windowsTempDir) {
                updates['WINDOWS_TEMP_DIR'] = config.windowsTempDir;
            }

            // Atualiza o conteúdo do .env
            Object.entries(updates).forEach(([key, value]) => {
                const regex = new RegExp(`^${key}=.*$`, 'gm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            });

            // Salva de volta (comentado por segurança - descomente se quiser usar)
            // writeFileSync(this.envPath, envContent, 'utf-8');
            // logger.info('Configuration exported to .env file');

            logger.info('Export to .env prepared (not saved for safety)');
        } catch (error) {
            logger.error({ error }, 'Error exporting to .env');
            throw error;
        }
    }
}

// Exporta instância singleton
export const configSyncService = new ConfigSyncService();
