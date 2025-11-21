#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

dotenv.config({ path: resolve(rootDir, '.env') });

const apiPort = Number(process.env.API_PORT || process.env.PORT || 3001);
const apiBase = process.env.API_URL || `http://localhost:${apiPort}`;
const wsPath = process.env.WS_PATH || '/socket.io';
const wsUrl = (process.env.WS_URL || apiBase.replace(/^http/i, 'ws')).replace(/\/$/, '');

const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@whatsself.local';
const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

const abort = (message, error) => {
	console.error('[ws-test] ERROR:', message);
	if (error) {
		console.error(error);
	}
	process.exit(1);
};

const main = async () => {
	console.log('[ws-test] Logging in as', email);
	const loginResponse = await fetch(`${apiBase}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	if (!loginResponse.ok) {
		const text = await loginResponse.text();
		abort(`Login failed with status ${loginResponse.status}: ${text}`);
	}

	const { token } = await loginResponse.json();
	if (!token) {
		abort('API did not return a token.');
	}

	console.log('[ws-test] Connecting to', wsUrl, 'path', wsPath);
	const socket = io(wsUrl, {
		path: wsPath,
		auth: { token },
		transports: ['websocket'],
		reconnection: false,
		timeout: 8000
	});

	await new Promise((resolvePromise, rejectPromise) => {
		const timeout = setTimeout(() => {
			socket.disconnect();
			rejectPromise(new Error('Timed out waiting for system_status event.'));
		}, 10000);

		socket.on('event', (event) => {
			if (event?.type === 'system_status') {
				clearTimeout(timeout);
				console.log('[ws-test] Received system_status event:', JSON.stringify(event.data));
				socket.disconnect();
				resolvePromise();
			}
		});

		socket.on('connect', () => console.log('[ws-test] WebSocket connected:', socket.id));
		socket.on('disconnect', (reason) => console.log('[ws-test] WebSocket disconnected:', reason));
		socket.on('connect_error', (error) => {
			clearTimeout(timeout);
			socket.disconnect();
			rejectPromise(error);
		});
	}).catch((error) => abort('WebSocket validation failed.', error));

	console.log('[ws-test] ✅ WebSocket connectivity validated successfully.');
};

main().catch((error) => abort('Unexpected failure', error));







