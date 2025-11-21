#!/usr/bin/env node

/**
 * Diagnóstico completo do fluxo WhatsApp ↔ Backend ↔ WebSocket.
 * Etapas:
 *  1. Verifica /health
 *  2. Obtém QR via REST
 *  3. Conecta ao WebSocket público aguardando qr_code/ready
 *  4. Faz login admin e consulta /status
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(backendRoot, '.env') });

const apiPort = Number(process.env.API_PORT || process.env.PORT || 3001);
const apiBase = process.env.API_URL || `http://localhost:${apiPort}`;
const wsPath = process.env.WS_PATH || '/socket.io';
const wsUrl = (process.env.WS_URL || apiBase.replace(/^http/i, 'ws')).replace(/\/$/, '');
const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@whatsself.local';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

const abort = (message, error) => {
	console.error('[whatsapp-diagnose] ❌', message);
	if (error) {
		console.error(error);
	}
	process.exit(1);
};

const fetchJson = async (path, options) => {
	const res = await fetch(`${apiBase}${path}`, options);
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${path} -> HTTP ${res.status}: ${text}`);
	}
	return res.json();
};

const waitForEvent = (socket, validator, timeoutMs = 15000) =>
	new Promise((resolvePromise, rejectPromise) => {
		const timeout = setTimeout(() => {
			socket.off('event', handler);
			socket.disconnect();
			rejectPromise(new Error('Timeout aguardando eventos do WebSocket.'));
		}, timeoutMs);

		const handler = (event) => {
			if (validator(event)) {
				clearTimeout(timeout);
				socket.off('event', handler);
				socket.disconnect();
				resolvePromise(event);
			}
		};

		socket.on('event', handler);
		socket.on('connect_error', (error) => {
			clearTimeout(timeout);
			socket.off('event', handler);
			rejectPromise(error);
		});
	});

const main = async () => {
	console.log('=== Diagnóstico WhatsApp/Backend ===');
	console.log('[1/4] Verificando /health em', apiBase);
	const health = await fetchJson('/health').catch((error) =>
		abort('Falha ao consultar /health', error)
	);
	if (!health?.ok) {
		abort('API respondeu /health com erro', health);
	}
	console.log('[✓] API saudável.');

	console.log('[2/4] Consultando /qr (último QR disponível)');
	const qrResponse = await fetchJson('/qr').catch((error) =>
		abort('Não foi possível obter o QR atual.', error)
	);
	if (qrResponse.qr) {
		console.log('[✓] QR disponível (tamanho:', qrResponse.qr.length, 'chars).');
	} else {
		console.log('[i] QR ainda não gerado. O diagnóstico seguirá ouvindo via WebSocket.');
	}

	console.log('[3/4] Abrindo WebSocket público para receber qr_code/ready...');
	const publicSocket = io(wsUrl, {
		path: wsPath,
		auth: { public: true },
		transports: ['websocket'],
		reconnection: false,
		timeout: 8000
	});

	publicSocket.on('connect', () => {
		console.log('[ws] Conectado (modo público). Aguardando eventos...');
	});

	await waitForEvent(
		publicSocket,
		(event) => event?.type === 'qr_code' || event?.type === 'whatsapp_ready',
		20000
	)
		.then((event) => {
			if (event.type === 'qr_code') {
				console.log('[✓] Recebido evento qr_code via WebSocket público.');
			} else {
				console.log('[✓] WhatsApp já estava pronto (whatsapp_ready recebido).');
			}
		})
		.catch((error) => abort('WebSocket público não respondeu como esperado.', error));

	console.log('[4/4] Autenticando admin e consultando /status...');
	const login = await fetchJson('/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: adminEmail, password: adminPassword })
	}).catch((error) => abort('Login admin falhou.', error));

	if (!login?.token) {
		abort('API não retornou token válido durante login admin.');
	}

	const status = await fetchJson('/status', {
		headers: { Authorization: `Bearer ${login.token}` }
	}).catch((error) => abort('Falha ao consultar /status autenticado.', error));

	console.log('[✓] /status respondeu com sucesso.');
	console.log('Resumo:');
	console.log('   WhatsApp ->', JSON.stringify(status.whatsapp));
	console.log('   Fila      ->', JSON.stringify(status.queue));
	console.log('   Circuit   ->', JSON.stringify(status.circuitBreaker));

	console.log('=== Diagnóstico concluído com sucesso ===');
};

main().catch((error) => abort('Falha inesperada durante o diagnóstico.', error));

