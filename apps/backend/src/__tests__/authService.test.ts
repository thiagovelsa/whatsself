import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../services/authService.js';
import { testPrisma } from './setup.js';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
	let authService: AuthService;

	beforeEach(async () => {
		authService = new AuthService(testPrisma);
		await testPrisma.user.deleteMany();
	});

	afterEach(async () => {
		await testPrisma.user.deleteMany();
	});

	describe('User Registration', () => {
		it('should register a new user', async () => {
			const result = await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User',
				role: UserRole.operator
			});

			expect(result.user).toBeDefined();
			expect(result.user.email).toBe('test@example.com');
			expect(result.user.name).toBe('Test User');
			expect(result.user.role).toBe(UserRole.operator);
			expect(result.token).toBeDefined();
			expect(typeof result.token).toBe('string');
		});

		it('should hash password during registration', async () => {
			await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User'
			});

			const user = await testPrisma.user.findUnique({
				where: { email: 'test@example.com' }
			});

			expect(user?.password).not.toBe('password123');
			expect(user?.password).toHaveLength(60);
		});

		it('should reject duplicate email registration', async () => {
			await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'First User'
			});

			await expect(
				authService.register({
					email: 'test@example.com',
					password: 'password456',
					name: 'Second User'
				})
			).rejects.toThrow('User with this email already exists');
		});

		it('should default to operator role', async () => {
			const result = await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User'
			});

			expect(result.user.role).toBe(UserRole.operator);
		});
	});

	describe('User Login', () => {
		beforeEach(async () => {
			await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User'
			});
		});

		it('should login with correct credentials', async () => {
			const result = await authService.login('test@example.com', 'password123');

			expect(result.user).toBeDefined();
			expect(result.user.email).toBe('test@example.com');
			expect(result.token).toBeDefined();
		});

		it('should reject invalid password', async () => {
			await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
				'Invalid email or password'
			);
		});

		it('should reject non-existent user', async () => {
			await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
				'Invalid email or password'
			);
		});

		it('should reject login for inactive user', async () => {
			await testPrisma.user.update({
				where: { email: 'test@example.com' },
				data: { active: false }
			});

			await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
				'Account is deactivated. Please contact administrator'
			);
		});
	});

	describe('Token Management', () => {
		it('should generate valid JWT token', async () => {
			const result = await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User'
			});

			const payload = authService.verifyToken(result.token);
			expect(payload).toBeDefined();
			expect(payload?.email).toBe('test@example.com');
			expect(payload?.role).toBe(UserRole.operator);
		});

		it('should reject invalid token', () => {
			const payload = authService.verifyToken('invalid.token.here');
			expect(payload).toBeNull();
		});

		it('should include userId in token payload', async () => {
			const result = await authService.register({
				email: 'test@example.com',
				password: 'password123',
				name: 'Test User'
			});

			const payload = authService.verifyToken(result.token);
			expect(payload?.userId).toBeDefined();
			expect(payload?.userId).toBe(result.user.id);
		});
	});

	describe('Password Change', () => {
		beforeEach(async () => {
			await authService.register({
				email: 'test@example.com',
				password: 'oldpassword',
				name: 'Test User'
			});
		});

		it('should change password with correct old password', async () => {
			const user = await testPrisma.user.findUnique({
				where: { email: 'test@example.com' }
			});

			await authService.updatePassword(user!.id, 'oldpassword', 'newpassword');

			const result = await authService.login('test@example.com', 'newpassword');
			expect(result.user).toBeDefined();
		});

		it('should reject password change with incorrect old password', async () => {
			const user = await testPrisma.user.findUnique({
				where: { email: 'test@example.com' }
			});

			await expect(
				authService.updatePassword(user!.id, 'wrongpassword', 'newpassword')
			).rejects.toThrow('Current password is incorrect');
		});

		it('should reject password change for non-existent user', async () => {
			await expect(
				authService.updatePassword('nonexistent-id', 'oldpassword', 'newpassword')
			).rejects.toThrow('User not found');
		});
	});

	describe('Default Admin Creation', () => {
		it('should create default admin when no users exist', async () => {
			await authService.ensureDefaultAdmin();

			const admin = await testPrisma.user.findUnique({
				where: { email: 'admin@whatsself.local' }
			});

			expect(admin).toBeDefined();
			expect(admin?.role).toBe(UserRole.admin);
			expect(admin?.active).toBe(true);
		});

		it('should not create duplicate admin', async () => {
			await authService.ensureDefaultAdmin();
			await authService.ensureDefaultAdmin();

			const adminCount = await testPrisma.user.count({
				where: { email: 'admin@whatsself.local' }
			});

			expect(adminCount).toBe(1);
		});

		it('should not create admin when users already exist', async () => {
			await authService.register({
				email: 'user@example.com',
				password: 'password123',
				name: 'User'
			});

			await authService.ensureDefaultAdmin();

			const admin = await testPrisma.user.findUnique({
				where: { email: 'admin@whatsself.local' }
			});

			expect(admin).toBeNull();
		});
	});
});
