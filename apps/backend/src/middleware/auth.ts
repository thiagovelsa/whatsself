import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { PrismaClient, UserRole } from '@prisma/client';
import { createLogger } from '../services/logger.js';

const logger = createLogger('auth-middleware');

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				email: string;
				role: UserRole;
			};
		}
	}
}

/**
 * Extract JWT token from Authorization header or HttpOnly cookie.
 */
export function extractTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization;

	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	const cookieHeader = req.headers.cookie;
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(';').map((c) => c.trim());
	const authCookie = cookies.find((c) => c.startsWith('auth_token='));
	if (!authCookie) return null;

	const value = authCookie.substring('auth_token='.length);
	return value || null;
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(authService: AuthService) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = extractTokenFromRequest(req);

			if (!token) {
				return res.status(401).json({
					error: 'Unauthorized',
					message: 'Missing or invalid authentication token'
				});
			}

			// Verify token
			const payload = authService.verifyToken(token);

			if (!payload) {
				return res.status(401).json({
					error: 'Unauthorized',
					message: 'Invalid or expired token'
				});
			}

			// Check if user still exists and is active
			const user = await authService.getUserById(payload.userId);

			if (!user || !user.active) {
				return res.status(401).json({
					error: 'Unauthorized',
					message: 'User not found or inactive'
				});
			}

			// Attach user to request
			req.user = {
				userId: payload.userId,
				email: payload.email,
				role: payload.role
			};

			next();
		} catch (error) {
			logger.error({ error }, 'Authentication error');
			res.status(401).json({
				error: 'Unauthorized',
				message: 'Authentication failed'
			});
		}
	};
}

/**
 * Middleware to authorize requests based on user roles
 */
export function authorize(...allowedRoles: UserRole[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({
				error: 'Unauthorized',
				message: 'Authentication required'
			});
		}

		if (!allowedRoles.includes(req.user.role)) {
			logger.warn({
				userId: req.user.userId,
				role: req.user.role,
				requiredRoles: allowedRoles
			}, 'Authorization denied');

			return res.status(403).json({
				error: 'Forbidden',
				message: 'Insufficient permissions'
			});
		}

		next();
	};
}

/**
 * Optional authentication - attach user if token is present, but don't require it
 */
export function optionalAuth(authService: AuthService) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = extractTokenFromRequest(req);

			if (token) {
				const payload = authService.verifyToken(token);

				if (payload) {
					const user = await authService.getUserById(payload.userId);

					if (user && user.active) {
						req.user = {
							userId: payload.userId,
							email: payload.email,
							role: payload.role
						};
					}
				}
			}

			next();
		} catch (error) {
			// Don't fail on error - just continue without user
			next();
		}
	};
}
