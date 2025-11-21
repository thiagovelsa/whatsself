import { PrismaClient } from '@prisma/client';
import { systemConfigService } from '../src/services/systemConfigService.ts';
import { envValidator } from '../src/config/env.validator.ts';

const prisma = new PrismaClient();
const env = envValidator.validate();
await systemConfigService.initialize(prisma, {
  cryptoKey: env.CONFIG_CRYPTO_KEY,
  defaults: {
    jwtSecret: env.JWT_SECRET,
    defaultAdminEmail: env.DEFAULT_ADMIN_EMAIL,
    defaultAdminPassword: env.DEFAULT_ADMIN_PASSWORD,
    skipWhatsapp: false,
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

await systemConfigService.updateConfig({ skipWhatsapp: false });
console.log('skipWhatsapp set to false.');
await prisma.$disconnect();
process.exit(0);
