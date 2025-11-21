import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { envValidator } from '../config/env.validator.js';
import { systemConfigService } from './systemConfigService.js';
import crypto from 'node:crypto';
import { createLogger } from './logger.js';

const logger = createLogger('auth');

export type JWTPayload = {
	userId: string;
	email: string;
	role: UserRole;
	iat?: number;
	exp?: number;
};

export type AuthResult = {
	user: Omit<User, 'password'>;
	token: string;
	expiresIn: string;
};

export class AuthService {
    private prisma: PrismaClient;
    private jwtExpiresIn: string;
	private saltRounds = 12; // Increased from default 10

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        const env = envValidator.validate();
        this.jwtExpiresIn = env.JWT_EXPIRES_IN;
	}

	/**
	 * List users without passwords (admin use)
	 */
	async listUsers(): Promise<Array<Omit<User, 'password'>>> {
		const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
		return users.map(({ password, ...u }) => u);
	}

	/**
	 * Update user role (admin use)
	 */
	async updateUserRole(userId: string, role: UserRole): Promise<void> {
		await this.prisma.user.update({ where: { id: userId }, data: { role } });
		logger.info({ userId, role }, 'User role updated');
	}

	/**
	 * Hash password using bcrypt with strong salt
	 */
	private async hashPassword(password: string): Promise<string> {
		// Validate password strength
		this.validatePasswordStrength(password);
		return bcrypt.hash(password, this.saltRounds);
	}

	/**
	 * Verify password against hash with timing attack protection
	 */
	private async verifyPassword(password: string, hash: string): Promise<boolean> {
		return bcrypt.compare(password, hash);
	}

	/**
	 * Validate password strength
	 */
	private validatePasswordStrength(password: string): void {
		const nodeEnv = envValidator.get('NODE_ENV');
		if (nodeEnv === 'production') {
			if (password.length < 8) {
				throw new Error('Password must be at least 8 characters long');
			}
			// Stronger validation in production
			const hasUpperCase = /[A-Z]/.test(password);
			const hasLowerCase = /[a-z]/.test(password);
			const hasNumbers = /\d/.test(password);
			const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

			if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
				throw new Error(
					'Password must contain uppercase, lowercase, number, and special character'
				);
			}

			// Check for common passwords
			const commonPasswords = ['password', 'admin123', '12345678', 'qwerty'];
			if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
				throw new Error('Password is too common. Please choose a stronger password');
			}
		} else if (password.length < 4) {
			throw new Error('Password must be at least 4 characters long in development/test environments');
		}
	}

	/**
	 * Generate JWT token with additional security
	 */
	private generateToken(payload: JWTPayload): string {
		const config = systemConfigService.getConfig();
		// Add jti (JWT ID) for token invalidation support
		const tokenPayload = {
			...payload,
			jti: crypto.randomBytes(16).toString('hex')
		};

		return (jwt as any).sign(tokenPayload, config.jwtSecret, {
			expiresIn: this.jwtExpiresIn as any,
			issuer: 'whatsself',
			audience: 'whatsself-api'
		});
	}

	/**
	 * Verify and decode JWT token with security checks
	 */
	verifyToken(token: string): JWTPayload | null {
		try {
			const config = systemConfigService.getConfig();
			const decoded = (jwt as any).verify(token, config.jwtSecret, {
				issuer: 'whatsself',
				audience: 'whatsself-api'
			}) as JWTPayload;

			// Additional validation
			if (!decoded.userId || !decoded.email || !decoded.role) {
				logger.warn('Invalid token payload structure');
				return null;
			}

			return decoded;
		} catch (error: any) {
			if (error.name === 'TokenExpiredError') {
				logger.debug('Token expired');
			} else if (error.name === 'JsonWebTokenError') {
				logger.debug('Invalid token');
			} else {
				logger.debug({ error }, 'Token verification failed');
			}
			return null;
		}
	}

	/**
	 * Register a new user with validation
	 */
	async register(data: {
		email: string;
		password: string;
		name: string;
		role?: UserRole;
	}): Promise<AuthResult> {
		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(data.email)) {
			throw new Error('Invalid email format');
		}

		// Normalize email
		const normalizedEmail = data.email.toLowerCase().trim();

		// Check if user already exists
		const existing = await this.prisma.user.findUnique({
			where: { email: normalizedEmail }
		});

		if (existing) {
			throw new Error('User with this email already exists');
		}

		// Hash password
		const hashedPassword = await this.hashPassword(data.password);

		// Create user
		const user = await this.prisma.user.create({
			data: {
				email: normalizedEmail,
				password: hashedPassword,
				name: data.name.trim(),
				role: data.role || UserRole.operator
			}
		});

		// Generate token
		const token = this.generateToken({
			userId: user.id,
			email: user.email,
			role: user.role
		});

		// Remove password from response
		const { password, ...userWithoutPassword } = user;

		logger.info({ userId: user.id, email: user.email }, 'New user registered');

		return {
			user: userWithoutPassword,
			token,
			expiresIn: this.jwtExpiresIn
		};
	}

	/**
	 * Login user with rate limiting consideration
	 */
	async login(email: string, password: string): Promise<AuthResult> {
		// Normalize email
		const normalizedEmail = email.toLowerCase().trim();

		// Find user
		const user = await this.prisma.user.findUnique({
			where: { email: normalizedEmail }
		});

		if (!user) {
			// Use generic message to prevent user enumeration
			throw new Error('Invalid email or password');
		}

		// Check if user is active
		if (!user.active) {
			throw new Error('Account is deactivated. Please contact administrator');
		}

		// Verify password
		const isValid = await this.verifyPassword(password, user.password);

		if (!isValid) {
			// Log failed attempt for security monitoring
			logger.warn({ email: normalizedEmail }, 'Failed login attempt');
			throw new Error('Invalid email or password');
		}

		// Update last login
		await this.prisma.user.update({
			where: { id: user.id },
			data: { updatedAt: new Date() }
		});

		// Generate token
		const token = this.generateToken({
			userId: user.id,
			email: user.email,
			role: user.role
		});

		// Remove password from response
		const { password: _, ...userWithoutPassword } = user;

		logger.info({ userId: user.id, email: user.email }, 'User logged in');

		return {
			user: userWithoutPassword,
			token,
			expiresIn: this.jwtExpiresIn
		};
	}

	/**
	 * Issue a new token for an existing user (used for refresh flows).
	 */
	async issueTokenForUserId(userId: string): Promise<AuthResult | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.active) {
			return null;
		}

		const token = this.generateToken({
			userId: user.id,
			email: user.email,
			role: user.role
		});

		const { password, ...userWithoutPassword } = user;

		return {
			user: userWithoutPassword,
			token,
			expiresIn: this.jwtExpiresIn
		};
	}

	/**
	 * Get user by ID without password
	 */
	async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			return null;
		}

		const { password, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}

	/**
	 * Update user password with old password verification
	 */
	async updatePassword(
		userId: string,
		oldPassword: string,
		newPassword: string
	): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			throw new Error('User not found');
		}

		// Verify old password
		const isValid = await this.verifyPassword(oldPassword, user.password);
		if (!isValid) {
			throw new Error('Current password is incorrect');
		}

		// Ensure new password is different
		if (oldPassword === newPassword) {
			throw new Error('New password must be different from current password');
		}

		// Hash new password
		const hashedPassword = await this.hashPassword(newPassword);

		// Update password
		await this.prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword }
		});

		logger.info({ userId }, 'Password updated');
	}

	/**
	 * Reset user password (admin action)
	 */
	async resetPassword(userId: string, newPassword: string): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			throw new Error('User not found');
		}

		// Hash new password
		const hashedPassword = await this.hashPassword(newPassword);

		// Update password
		await this.prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword }
		});

		logger.info({ userId, adminAction: true }, 'Password reset');
	}

	/**
	 * Deactivate user
	 */
	async deactivateUser(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { active: false }
		});

		logger.info({ userId }, 'User deactivated');
	}

	/**
	 * Activate user
	 */
	async activateUser(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { active: true }
		});

		logger.info({ userId }, 'User activated');
	}

	/**
	 * Create default admin user if no users exist
	 */
	async ensureDefaultAdmin(): Promise<void> {
		const userCount = await this.prisma.user.count();

		if (userCount === 0) {
			try {
				const config = systemConfigService.getConfig();
				await this.register({
					email: config.defaultAdminEmail,
					password: config.defaultAdminPassword,
					name: 'Administrator',
					role: UserRole.admin
				});

				logger.warn('=' .repeat(60));
				logger.warn('DEFAULT ADMIN USER CREATED');
				logger.warn(`Email: ${config.defaultAdminEmail}`);

				if (envValidator.get('NODE_ENV') === 'development') {
					logger.warn(`Password: ${config.defaultAdminPassword}`);
				} else {
					logger.warn('Password: [Check DEFAULT_ADMIN_PASSWORD in .env file]');
				}

				logger.warn('PLEASE CHANGE THE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
				logger.warn('=' .repeat(60));
			} catch (error: any) {
				if (envValidator.get('NODE_ENV') === 'production' &&
					error.message.includes('Password must contain')) {
					logger.fatal(
						'DEFAULT_ADMIN_PASSWORD does not meet security requirements. ' +
						'Please set a stronger password in the .env file.'
					);
					process.exit(1);
				}
				throw error;
			}
		}
	}
}
