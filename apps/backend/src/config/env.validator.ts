import { z } from 'zod';
import { resolve, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { platform, homedir } from 'node:os';
import { createLogger } from '../services/logger.js';

const logger = createLogger('env-validator');

const booleanLike = z
	.union([z.boolean(), z.string(), z.number()])
	.transform((value) => {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'number') return value !== 0;
		const normalized = value.trim().toLowerCase();
		if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
		if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
		return Boolean(value);
	});

// Zod schema for environment validation
const envSchema = z.object({
	// Application
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().min(1).max(65535).default(3001),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
	LOG_PRETTY: booleanLike.default(true),
	HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().min(1_000).max(600_000).default(120_000),
	HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().min(5_000).max(650_000).default(125_000),
	HTTP_KEEPALIVE_TIMEOUT_MS: z.coerce.number().min(5_000).max(300_000).default(60_000),

	// Database
	DATABASE_URL: z.string().min(1),
	DB_POOL_MAX: z.coerce.number().min(1).max(100).default(10),
	DB_POOL_TIMEOUT_MS: z.coerce.number().min(1_000).max(600_000).default(10_000),

	// WhatsApp
	SKIP_WHATSAPP: booleanLike.default(false),
	WHATS_SESSION_PATH: z.string().default('../../data/whatsapp_session'),
	PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
	PUPPETEER_HEADLESS: booleanLike.default(true),

	// Rate Limiting
	RATE_MAX_PER_MIN: z.coerce.number().min(1).max(100).default(12),
	RATE_PER_CONTACT_PER_5MIN: z.coerce.number().min(1).max(20).default(2),

	// Business Rules
	BUSINESS_HOURS: z
		.string()
		.regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Format must be HH:MM-HH:MM')
		.default('09:00-18:00'),
	TIMEZONE: z.string().default('America/Sao_Paulo'),

	// Humanizer
	HUMANIZER_MIN_DELAY_MS: z.coerce.number().min(0).default(3000),
	HUMANIZER_MAX_DELAY_MS: z.coerce.number().min(0).default(7000),
	HUMANIZER_MIN_TYPING_MS: z.coerce.number().min(0).default(1500),
	HUMANIZER_MAX_TYPING_MS: z.coerce.number().min(0).default(3500),

	// Circuit Breaker
	CB_WINDOW_MODE: z.string().default('5m_or_50'),
	CB_MIN_ATTEMPTS: z.coerce.number().min(1).default(20),
	CB_FAIL_RATE_OPEN: z.coerce.number().min(0).max(1).default(0.25),
	CB_PROBE_INTERVAL_SEC: z.coerce.number().min(1).default(45),
	CB_PROBE_SUCCESS_CLOSE: z.coerce.number().min(0).max(1).default(0.9),
	CB_PROBE_SAMPLES: z.coerce.number().min(1).default(10),
	CB_COOLDOWN_INITIAL_SEC: z.coerce.number().min(1).default(300),
	CB_COOLDOWN_MAX_SEC: z.coerce.number().min(1).default(1800),

	// Security
	JWT_SECRET: z.string().min(1),
	JWT_EXPIRES_IN: z.string().default('7d'),
	DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@admin.local'),
	DEFAULT_ADMIN_PASSWORD: z.string().min(4),
	API_CORS_ORIGIN: z.string().default('http://localhost:5173'),
	CONFIG_CRYPTO_KEY: z.string().min(16),

	// WebSocket
	WS_PORT: z.coerce.number().min(1).max(65535).default(3001),
	WS_PATH: z.string().default('/socket.io'),

	// Redis (optional)
	REDIS_URL: z.string().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: z.coerce.number().min(0).max(15).optional(),

	// Development
	DEBUG: booleanLike.default(false),

	// Windows Specific
	WINDOWS_TEMP_DIR: z.string().optional(),
	WINDOWS_LONG_PATH_SUPPORT: booleanLike.default(true)
});

export type Env = z.infer<typeof envSchema>;

class EnvironmentValidator {
	private validated: Env | null = null;
	private projectRoot: string;
	private prismaDir: string;

    constructor() {
        // Determine backend root reliably in ESM (apps/backend)
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        this.projectRoot = resolve(__dirname, '..', '..');
        this.prismaDir = resolve(this.projectRoot, 'prisma');
    }

	/**
	 * Validate and process environment variables
	 */
	public validate(): Env {
		if (this.validated) {
			return this.validated;
		}

		try {
			// Parse environment with Zod
			const env = envSchema.parse(process.env);

			// Process paths to be absolute
			env.DATABASE_URL = this.processDatabaseUrl(env.DATABASE_URL);
			env.DATABASE_URL = this.applyPostgresPooling(env.DATABASE_URL, env);
			process.env.DATABASE_URL = env.DATABASE_URL;
			env.WHATS_SESSION_PATH = this.processPath(env.WHATS_SESSION_PATH);
			process.env.WHATS_SESSION_PATH = env.WHATS_SESSION_PATH;

			// Validate browser executable if provided
			if (env.PUPPETEER_EXECUTABLE_PATH) {
				env.PUPPETEER_EXECUTABLE_PATH = this.validateExecutable(
					env.PUPPETEER_EXECUTABLE_PATH
				);
			}

			// Security validations
			this.validateSecurity(env);

			// Windows specific setup
			if (platform() === 'win32') {
				this.setupWindows(env);
			}

			// Create necessary directories
			this.ensureDirectories(env);

			// Log configuration summary
			this.logConfiguration(env);

			this.validated = env;
			return env;
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.fatal('Environment validation failed:');
				error.errors.forEach((err) => {
					logger.error(`  ${err.path.join('.')}: ${err.message}`);
				});
				process.exit(1);
			}
			throw error;
		}
	}

	/**
	 * Process database URL to handle relative paths
	 */
	private processDatabaseUrl(url: string): string {
		if (url.startsWith('file:')) {
			const dbPath = url.replace('file:', '');
			let absolutePath: string;

			if (isAbsolute(dbPath)) {
				absolutePath = dbPath;
			} else {
				// For SQLite, Prisma resolve paths relative to the schema directory.
				// To avoid divergences entre CLI e runtime, também resolvemos
				// caminhos relativos a partir de `prisma/`.
				const normalized = dbPath.startsWith('./') ? dbPath.slice(2) : dbPath;
				absolutePath = resolve(this.prismaDir, normalized);
			}

			// Ensure directory exists
			const dbDir = resolve(absolutePath, '..');
			if (!existsSync(dbDir)) {
				mkdirSync(dbDir, { recursive: true });
				logger.info(`Created database directory: ${dbDir}`);
			}

			return `file:${absolutePath}`;
		}
		return url; // PostgreSQL or other URLs remain unchanged
	}

	/**
	 * Apply sane defaults for PostgreSQL connection pooling when not provided
	 */
	private applyPostgresPooling(url: string, env: Env): string {
		if (!url.startsWith('postgres')) {
			return url;
		}

		try {
			const parsed = new URL(url);
			const params = parsed.searchParams;

			if (!params.has('connection_limit')) {
				params.set('connection_limit', String(env.DB_POOL_MAX));
			}
			if (!params.has('pool_timeout')) {
				params.set('pool_timeout', String(env.DB_POOL_TIMEOUT_MS));
			}

			parsed.search = params.toString();
			return parsed.toString();
		} catch (error) {
			logger.warn({ error }, 'Failed to apply pooling settings to DATABASE_URL');
			return url;
		}
	}

	/**
	 * Process paths to be absolute
	 */
	private processPath(path: string): string {
		if (isAbsolute(path)) {
			return path;
		}
		return resolve(this.projectRoot, path);
	}

	/**
	 * Validate executable path exists
	 */
	private validateExecutable(path: string): string {
		const absolutePath = isAbsolute(path) ? path : resolve(path);
		if (!existsSync(absolutePath)) {
			logger.warn(
				`Browser executable not found at ${absolutePath}. ` +
				`Will attempt auto-detection. Install Chrome or Edge if needed.`
			);
		}
		return absolutePath;
	}

	/**
	 * Validate security settings
	 */
	private validateSecurity(env: Env): void {
		// Check JWT secret strength
		if (env.NODE_ENV === 'production') {
			if (env.JWT_SECRET.length < 32) {
				logger.fatal('JWT_SECRET must have at least 32 characters in production');
				process.exit(1);
			}
		} else if (env.JWT_SECRET.length < 16) {
			logger.warn('JWT_SECRET should have at least 16 characters; recommended to update the value.');
		}

		// Check default admin password
		if (env.DEFAULT_ADMIN_PASSWORD.length < 4) {
			logger.fatal('DEFAULT_ADMIN_PASSWORD must have at least 4 characters');
			process.exit(1);
		}

		if (env.DEFAULT_ADMIN_PASSWORD === 'ChangeMe!123' || env.DEFAULT_ADMIN_PASSWORD === 'admin123') {
			if (env.NODE_ENV === 'production') {
				logger.fatal('DEFAULT_ADMIN_PASSWORD must be changed from default in production!');
				process.exit(1);
			}
			logger.warn('Using default admin password. Change DEFAULT_ADMIN_PASSWORD for security.');
		}

		if (env.NODE_ENV === 'production') {
			// Validate password complexity in production
			const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
			if (!passwordRegex.test(env.DEFAULT_ADMIN_PASSWORD)) {
				logger.warn(
					'Admin password should contain: uppercase, lowercase, number, special character, and be 8+ chars'
				);
			}
		}

		if (env.CONFIG_CRYPTO_KEY.length < 16) {
			logger.fatal('CONFIG_CRYPTO_KEY must have at least 16 characters');
			process.exit(1);
		}
	}

	/**
	 * Windows specific setup
	 */
    private setupWindows(env: Env): void {
        // Resolve and ensure temp directory exists
        const tmpDir = env.WINDOWS_TEMP_DIR || resolve(homedir(), 'AppData', 'Local', 'Temp', 'whatsself');
        env.WINDOWS_TEMP_DIR = tmpDir;
        if (!existsSync(tmpDir)) {
            mkdirSync(tmpDir, { recursive: true });
        }

		// Set Node.js long path support
		if (env.WINDOWS_LONG_PATH_SUPPORT) {
			process.env.NODE_SKIP_PLATFORM_CHECK = '1';
		}

		logger.info(`Windows environment configured. Temp: ${env.WINDOWS_TEMP_DIR}`);
	}

	/**
	 * Ensure required directories exist
	 */
    private ensureDirectories(env: Env): void {
        const directories: string[] = [
            resolve(this.projectRoot, 'logs'),
            resolve(this.projectRoot, 'data')
        ];

        if (env.WHATS_SESSION_PATH) {
            directories.push(env.WHATS_SESSION_PATH);
        }
        if (env.WINDOWS_TEMP_DIR) {
            directories.push(env.WINDOWS_TEMP_DIR);
        }

        directories.forEach((dir) => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
                logger.debug(`Created directory: ${dir}`);
            }
        });
    }

	/**
	 * Log configuration summary
	 */
	private logConfiguration(env: Env): void {
		logger.info('Environment configuration validated successfully');
		logger.info({
			environment: env.NODE_ENV,
			port: env.PORT,
			database: env.DATABASE_URL.startsWith('file:') ? 'SQLite' : 'PostgreSQL',
			databasePoolMax: env.DATABASE_URL.startsWith('file:') ? undefined : env.DB_POOL_MAX,
			httpRequestTimeoutMs: env.HTTP_REQUEST_TIMEOUT_MS,
			whatsapp: !env.SKIP_WHATSAPP ? 'Enabled' : 'Disabled',
			platform: platform(),
			timezone: env.TIMEZONE,
			businessHours: env.BUSINESS_HOURS
		}, 'Configuration summary');
	}

	/**
	 * Get validated environment
	 */
	public get env(): Env {
		if (!this.validated) {
			throw new Error('Environment not validated. Call validate() first.');
		}
		return this.validated;
	}

	/**
	 * Get specific config value
	 */
	public get<K extends keyof Env>(key: K): Env[K] {
		if (!this.validated) {
			this.validate();
		}
		return this.validated![key];
	}
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();
export const config = envValidator;
