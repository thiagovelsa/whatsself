import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { systemConfigService } from '../services/systemConfigService.js';

let app: any;
let httpServer: any;
let adminToken: string;

describe('Config API', () => {
	beforeAll(async () => {
		const server = await createServer();
		app = server.app;
		httpServer = server.httpServer;

		const loginRes = await request(app)
			.post('/auth/login')
			.send({
				email: systemConfigService.getConfig().defaultAdminEmail,
				password: systemConfigService.getConfig().defaultAdminPassword
			});

		expect(loginRes.status).toBe(200);
		adminToken = loginRes.body.token;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => httpServer.close(() => resolve()));
	});

	it('should return masked configuration', async () => {
		const res = await request(app)
			.get('/config')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(res.status).toBe(200);
		expect(res.body.jwtSecretMasked).toBe('••••••••');
		expect(res.body.defaultAdminPasswordMasked).toBe('••••••••');
	});

	it('should update configuration values', async () => {
		const res = await request(app)
			.put('/config')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({
				rateMaxPerMin: 15,
				ratePerContactPer5Min: 3,
				wsPath: '/custom-socket'
			});

		expect(res.status).toBe(200);
		const config = systemConfigService.getConfig();
		expect(config.rateMaxPerMin).toBe(15);
		expect(config.ratePerContactPer5Min).toBe(3);
		expect(config.wsPath).toBe('/custom-socket');
	});

	it('should reveal secrets on demand', async () => {
		const res = await request(app)
			.post('/config/secret/reveal')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ field: 'jwtSecret' });

		expect(res.status).toBe(200);
		expect(res.body.value).toBe(systemConfigService.getConfig().jwtSecret);
	});
});

