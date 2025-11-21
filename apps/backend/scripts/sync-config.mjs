#!/usr/bin/env node

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import services after dotenv is loaded
const { systemConfigService } = await import('../dist/services/systemConfigService.js');
const { configSyncService } = await import('../dist/services/configSyncService.js');
const { envValidator } = await import('../dist/config/env.validator.js');

async function syncConfig() {
    console.log('🔄 Starting configuration synchronization...\n');

    const prisma = new PrismaClient();

    try {
        // Validate environment
        const env = envValidator.validate();

        // Initialize system config service
        await systemConfigService.initialize(prisma, {
            cryptoKey: env.CONFIG_CRYPTO_KEY,
            defaults: {
                jwtSecret: env.JWT_SECRET,
                defaultAdminEmail: env.DEFAULT_ADMIN_EMAIL,
                defaultAdminPassword: env.DEFAULT_ADMIN_PASSWORD,
                skipWhatsapp: env.SKIP_WHATSAPP,
                puppeteerExecutablePath: env.PUPPETEER_EXECUTABLE_PATH || null,
                rateMaxPerMin: env.RATE_MAX_PER_MIN,
                ratePerContactPer5Min: env.RATE_PER_CONTACT_PER_5MIN,
                businessHoursStart: env.BUSINESS_HOURS.split('-')[0],
                businessHoursEnd: env.BUSINESS_HOURS.split('-')[1],
                timezone: env.TIMEZONE,
                wsPort: env.WS_PORT,
                wsPath: env.WS_PATH,
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
                updatedAt: new Date()
            }
        });

        // Sync from .env file
        console.log('📁 Reading .env file...');
        const synced = await configSyncService.syncFromEnv();

        if (synced) {
            console.log('✅ Configuration synchronized successfully!\n');

            // Show current configuration
            const config = systemConfigService.getMaskedConfig();
            console.log('Current configuration:');
            console.log('---------------------');
            console.log(`WhatsApp: ${config.skipWhatsapp ? 'Disabled' : 'Enabled'}`);
            console.log(`Rate Limits: ${config.rateMaxPerMin}/min, ${config.ratePerContactPer5Min}/5min per contact`);
            console.log(`Business Hours: ${config.businessHoursStart} - ${config.businessHoursEnd}`);
            console.log(`Timezone: ${config.timezone}`);
            console.log(`Humanizer Delays: ${config.humanizerMinDelayMs}ms - ${config.humanizerMaxDelayMs}ms`);
            console.log(`WebSocket: Port ${config.wsPort}, Path ${config.wsPath}`);
        } else {
            console.log('ℹ️ No changes detected. Configuration is already in sync.\n');
        }

    } catch (error) {
        console.error('❌ Error synchronizing configuration:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run sync
syncConfig().catch(console.error);