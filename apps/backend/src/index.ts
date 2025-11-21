import dotenv from 'dotenv';
import { createServer } from './server.js';
import { envValidator } from './config/env.validator.js';
import pino from 'pino';
import { platform } from 'node:os';

// Load environment from .env before anything else (works on Windows/Linux)
dotenv.config();

// Validate environment first
const config = envValidator.validate();

// Configure logger based on environment
const logger = pino({
	name: 'app',
	level: config.LOG_LEVEL,
	transport: config.LOG_PRETTY
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'yyyy-mm-dd HH:MM:ss',
					ignore: 'pid,hostname'
				}
		  }
		: undefined
});

async function main() {
	try {
		// Log startup info
		logger.info('Starting WhatsSelf Backend...');
		logger.info({
			platform: platform(),
			nodeVersion: process.version,
			environment: config.NODE_ENV,
			timezone: config.TIMEZONE
		}, 'System information');

		// Create and start server
		const { httpServer, websocketService } = await createServer({
			awaitWhatsApp: false
		});

		// Graceful shutdown handlers
		const shutdown = async (signal: string) => {
			logger.info(`Received ${signal}, shutting down gracefully...`);

			// Stop accepting new connections
			httpServer.close(() => {
				logger.info('HTTP server closed');
			});

			// Close WebSocket connections
			if (websocketService) {
				websocketService.close();
				logger.info('WebSocket server closed');
			}

			// Give operations 10 seconds to complete
			setTimeout(() => {
				logger.warn('Forced shutdown after 10 seconds');
				process.exit(1);
			}, 10000);

			// Exit cleanly
			process.exit(0);
		};

		// Register shutdown handlers
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		process.on('SIGINT', () => shutdown('SIGINT'));

		// Windows specific: handle CTRL+C and CTRL+BREAK
		if (platform() === 'win32') {
			process.on('SIGBREAK', () => shutdown('SIGBREAK'));
		}

		// Handle uncaught errors
		process.on('uncaughtException', (error) => {
			logger.fatal({ error }, 'Uncaught exception');
			console.error('\n========================================');
			console.error('ERRO NÃO TRATADO (uncaughtException):');
			console.error('========================================');
			console.error(error);
			if (error.stack) {
				console.error('\nStack trace:');
				console.error(error.stack);
			}
			console.error('\n========================================');
			console.error('Pressione qualquer tecla para fechar...');
			console.error('========================================\n');
			// Aguarda um pouco para garantir que os logs sejam escritos
			setTimeout(() => process.exit(1), 5000);
		});

		process.on('unhandledRejection', (reason, promise) => {
			logger.fatal({ reason, promise }, 'Unhandled rejection');
			console.error('\n========================================');
			console.error('PROMISE REJEITADA NÃO TRATADA:');
			console.error('========================================');
			console.error('Reason:', reason);
			console.error('Promise:', promise);
			if (reason instanceof Error && reason.stack) {
				console.error('\nStack trace:');
				console.error(reason.stack);
			}
			console.error('\n========================================');
			console.error('Pressione qualquer tecla para fechar...');
			console.error('========================================\n');
			// Aguarda um pouco para garantir que os logs sejam escritos
			setTimeout(() => process.exit(1), 5000);
		});

		// Start HTTP server
		httpServer.listen(config.PORT, '0.0.0.0', () => {
			logger.info('=' .repeat(60));
			logger.info(`🚀 WhatsSelf Backend is running!`);
			logger.info(`📡 API: http://localhost:${config.PORT}`);
			logger.info(`🔌 WebSocket: ws://localhost:${config.PORT}${config.WS_PATH}`);
			logger.info(`📊 Environment: ${config.NODE_ENV}`);
			logger.info(`🕐 Timezone: ${config.TIMEZONE}`);
				logger.info(`💾 Database: ${config.DATABASE_URL.startsWith('file:') ? 'SQLite' : 'PostgreSQL'}`);
			logger.info(`📱 WhatsApp: ${config.SKIP_WHATSAPP ? 'Disabled' : 'Enabled'}`);

			if (config.NODE_ENV === 'development') {
				logger.info('=' .repeat(60));
				logger.info('📝 Default Admin Credentials:');
				logger.info(`   Email: ${config.DEFAULT_ADMIN_EMAIL}`);
				logger.info(`   Password: ${config.DEFAULT_ADMIN_PASSWORD}`);
				logger.warn('⚠️  Change these credentials after first login!');
			}

			logger.info('=' .repeat(60));
			logger.info('Press CTRL+C to stop the server');
		});

		// Error handling for server
		httpServer.on('error', (error: any) => {
			if (error.code === 'EADDRINUSE') {
				logger.fatal(`Port ${config.PORT} is already in use. Please use a different port.`);
				process.exit(1);
			} else if (error.code === 'EACCES') {
				logger.fatal(`Permission denied to bind to port ${config.PORT}. Try a port > 1024.`);
				process.exit(1);
			} else {
				logger.fatal({ error }, 'Server error');
				process.exit(1);
			}
		});

	} catch (error) {
		logger.fatal({ error }, 'Failed to start application');
		console.error('\n========================================');
		console.error('ERRO FATAL ao iniciar o backend:');
		console.error('========================================');
		console.error(error);
		if (error instanceof Error) {
			console.error('\nMensagem:', error.message);
			if (error.stack) {
				console.error('\nStack trace:');
				console.error(error.stack);
			}
			if ('cause' in error && error.cause) {
				console.error('\nCausa:', error.cause);
			}
		}
		console.error('\n========================================');
		console.error('Verifique os logs acima para mais detalhes.');
		console.error('Pressione qualquer tecla para sair...');
		console.error('========================================\n');
		process.exit(1);
	}
}

// Start the application
main().catch((err) => {
	console.error('\n========================================');
	console.error('ERRO FATAL durante inicialização:');
	console.error('========================================');
	console.error(err);
	if (err instanceof Error && err.stack) {
		console.error('\nStack trace:');
		console.error(err.stack);
	}
	console.error('\n========================================\n');
	process.exit(1);
});
