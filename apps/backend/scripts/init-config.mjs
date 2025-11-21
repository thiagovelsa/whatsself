import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { envValidator } from '../src/config/env.validator.ts';
import { systemConfigService } from '../src/services/systemConfigService.ts';

dotenv.config();

const prisma = new PrismaClient();

function buildDefaults(env) {
	const [businessHoursStart, businessHoursEnd] = env.BUSINESS_HOURS.split('-');
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
	};
}

async function main() {
	try {
		const env = envValidator.validate();
		const defaults = buildDefaults(env);
		await systemConfigService.initialize(prisma, {
			cryptoKey: env.CONFIG_CRYPTO_KEY,
			defaults
		});
		console.log('System configuration initialized successfully.');
		process.exit(0);
	} catch (error) {
		console.error('Failed to initialize configuration:', error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

