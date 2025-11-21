import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const args = process.argv.slice(2);
const silent = args.includes('--silent') || args.includes('--quiet');

function log(message) {
	if (!silent) {
		console.log(message);
	}
}

function ensureDirectory(path) {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
		log(`[env] Criado diretório ${relative(rootDir, path)}`);
	}
}

function normalizeLines(lines) {
	const normalized = [];
	let previousBlank = false;

	for (const rawLine of lines) {
		const line = rawLine.replace(/\r/g, '');
		const isBlank = line.trim() === '';

		if (isBlank && previousBlank) {
			continue;
		}

		normalized.push(line);
		previousBlank = isBlank;
	}

	while (normalized.length && normalized[normalized.length - 1].trim() === '') {
		normalized.pop();
	}

	return normalized;
}

function readEnvLines(path) {
	if (!existsSync(path)) {
		return [];
	}
	return readFileSync(path, 'utf-8').split(/\r?\n/);
}

function dedupeKeyLines(lines) {
	const seen = new Set();
	const result = [];
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		const match = line.match(/^([A-Za-z0-9_]+)=/);
		if (match) {
			if (seen.has(match[1])) {
				continue;
			}
			seen.add(match[1]);
		}
		result.push(line);
	}
	return result.reverse();
}

function writeEnvLines(path, lines) {
	const normalized = normalizeLines(lines);
	const deduped = dedupeKeyLines(normalized);
	writeFileSync(path, `${deduped.join('\n')}\n`, 'utf-8');
}

function readEnvObject(path) {
	if (!existsSync(path)) {
		return {};
	}
	const result = {};
	const lines = readFileSync(path, 'utf-8').split(/\r?\n/);
	for (const line of lines) {
		const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
		if (match) {
			result[match[1]] = match[2];
		}
	}
	return result;
}

function generateSecret(bytes = 48) {
	return crypto.randomBytes(bytes).toString('base64url');
}

function generateAdminPassword() {
	const upper = String.fromCharCode(65 + crypto.randomInt(0, 26));
	const lower = String.fromCharCode(97 + crypto.randomInt(0, 26));
	const digit = crypto.randomInt(0, 10);
	const specials = '!@#$%^&*';
	const special = specials[crypto.randomInt(0, specials.length)];
	const tail = crypto.randomBytes(5).toString('base64url').slice(0, 7);
	return `${upper}${lower}${tail}${special}${digit}`;
}

function generateCryptoKey() {
	return crypto.randomBytes(24).toString('base64url');
}

function buildBackendTemplate(entries) {
	const sections = [
		{ title: '# Aplicação', keys: ['NODE_ENV', 'PORT', 'LOG_LEVEL', 'LOG_PRETTY', 'DEBUG'] },
		{ title: '# Banco de Dados', keys: ['DATABASE_URL'] },
		{ title: '# Segurança e Autenticação', keys: ['JWT_SECRET', 'JWT_EXPIRES_IN', 'DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_PASSWORD', 'CONFIG_CRYPTO_KEY', 'API_CORS_ORIGIN'] },
		{ title: '# WhatsApp', keys: ['SKIP_WHATSAPP', 'WHATS_SESSION_PATH', 'PUPPETEER_HEADLESS'] },
		{ title: '# Regras e Limites', keys: ['RATE_MAX_PER_MIN', 'RATE_PER_CONTACT_PER_5MIN', 'BUSINESS_HOURS', 'TIMEZONE'] },
		{ title: '# Humanizer', keys: ['HUMANIZER_MIN_DELAY_MS', 'HUMANIZER_MAX_DELAY_MS', 'HUMANIZER_MIN_TYPING_MS', 'HUMANIZER_MAX_TYPING_MS'] },
		{ title: '# Circuit Breaker', keys: ['CB_WINDOW_MODE', 'CB_MIN_ATTEMPTS', 'CB_FAIL_RATE_OPEN', 'CB_PROBE_INTERVAL_SEC', 'CB_PROBE_SUCCESS_CLOSE', 'CB_PROBE_SAMPLES', 'CB_COOLDOWN_INITIAL_SEC', 'CB_COOLDOWN_MAX_SEC'] },
		{ title: '# WebSocket', keys: ['WS_PORT', 'WS_PATH'] },
		{ title: '# Windows', keys: ['WINDOWS_TEMP_DIR', 'WINDOWS_LONG_PATH_SUPPORT'] }
	];

	const lines = [
		'# ==============================================',
		'# WhatsSelf Backend - Arquivo gerado automaticamente',
		'# scripts/ensure-env.mjs',
		'# ==============================================',
		''
	];

	for (const section of sections) {
		lines.push(section.title);
		for (const key of section.keys) {
			const entry = entries.find((item) => item.key === key);
			if (entry) {
				lines.push(`${key}=${resolveEntryValue(entry)}`);
			}
		}
		lines.push('');
	}

	lines.push('# Campos opcionais');
	lines.push('# FIRST_CONTACT_MESSAGE=Olá! Seja bem-vindo ao nosso atendimento automatizado.');

	return lines;
}

function resolveEntryValue(entry, currentValue) {
	if (typeof entry.valueFactory === 'function') {
		return entry.valueFactory(currentValue);
	}
	return entry.value;
}

function applyEntries(lines, entries) {
	const workingLines = lines.slice();
	const keyIndex = new Map();

	workingLines.forEach((line, index) => {
		const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
		if (match) {
			keyIndex.set(match[1], { index, value: match[2] });
		}
	});

	let changed = false;

	for (const entry of entries) {
		const info = keyIndex.get(entry.key);

		if (info) {
			if (entry.replaceIf && entry.replaceIf(info.value)) {
				const nextValue = resolveEntryValue(entry, info.value);
				if (nextValue !== info.value) {
					workingLines[info.index] = `${entry.key}=${nextValue}`;
					changed = true;
				}
			}
		} else {
			if (workingLines.length && workingLines[workingLines.length - 1].trim() !== '') {
				workingLines.push('');
			}
			workingLines.push(`${entry.key}=${resolveEntryValue(entry)}`);
			changed = true;
		}
	}

	return { changed, result: normalizeLines(workingLines) };
}

function getBackendEntries() {
	return [
		{ key: 'NODE_ENV', value: 'development' },
		{ key: 'PORT', value: '3001' },
		{ key: 'LOG_LEVEL', value: 'info' },
		{ key: 'LOG_PRETTY', value: 'true' },
		{ key: 'DEBUG', value: 'false' },
		{ key: 'DATABASE_URL', value: 'file:./dev.db' },
		{ key: 'JWT_SECRET', valueFactory: () => generateSecret(64), replaceIf: (current) => !current || current.length < 32 || /change|secret_key|whatsself/i.test(current) },
		{ key: 'JWT_EXPIRES_IN', value: '7d' },
		{ key: 'DEFAULT_ADMIN_EMAIL', value: 'admin@admin.local' },
		{ key: 'DEFAULT_ADMIN_PASSWORD', value: 'admin', replaceIf: (current) => !current || current !== 'admin' },
		{ key: 'CONFIG_CRYPTO_KEY', valueFactory: () => generateCryptoKey(), replaceIf: (current) => !current || current.length < 16 || /crypto_key/i.test(current) },
		{ key: 'API_CORS_ORIGIN', value: 'http://localhost:5173,http://127.0.0.1:5173' },
		{ key: 'SKIP_WHATSAPP', value: 'false' },
		{ key: 'WHATS_SESSION_PATH', value: '../../data/whatsapp_session', replaceIf: (current) => !current || current.includes('.wwebjs') || current.includes('./data/') },
		{ key: 'PUPPETEER_HEADLESS', value: 'false' },
		{ key: 'RATE_MAX_PER_MIN', value: '12' },
		{ key: 'RATE_PER_CONTACT_PER_5MIN', value: '2' },
		{ key: 'BUSINESS_HOURS', value: '09:00-18:00' },
		{ key: 'TIMEZONE', value: 'America/Sao_Paulo' },
		{ key: 'HUMANIZER_MIN_DELAY_MS', value: '3000' },
		{ key: 'HUMANIZER_MAX_DELAY_MS', value: '7000' },
		{ key: 'HUMANIZER_MIN_TYPING_MS', value: '1500' },
		{ key: 'HUMANIZER_MAX_TYPING_MS', value: '3500' },
		{ key: 'CB_WINDOW_MODE', value: '5m_or_50' },
		{ key: 'CB_MIN_ATTEMPTS', value: '20' },
		{ key: 'CB_FAIL_RATE_OPEN', value: '0.25' },
		{ key: 'CB_PROBE_INTERVAL_SEC', value: '45' },
		{ key: 'CB_PROBE_SUCCESS_CLOSE', value: '0.9' },
		{ key: 'CB_PROBE_SAMPLES', value: '10' },
		{ key: 'CB_COOLDOWN_INITIAL_SEC', value: '300' },
		{ key: 'CB_COOLDOWN_MAX_SEC', value: '1800' },
		{ key: 'WS_PORT', value: '3001' },
		{ key: 'WS_PATH', value: '/socket.io' },
		{ key: 'WINDOWS_TEMP_DIR', value: '../../temp/windows', replaceIf: (current) => !current || current.startsWith('./temp') },
		{ key: 'WINDOWS_LONG_PATH_SUPPORT', value: 'true' }
	];
}

function ensureBackendEnv() {
	const envPath = resolve(rootDir, 'apps', 'backend', '.env');
	const entries = getBackendEntries();

	if (!existsSync(envPath)) {
		const template = buildBackendTemplate(entries);
		writeFileSync(envPath, `${template.join('\n')}\n`, 'utf-8');
		log('[env] Criado apps/backend/.env com valores padrão.');
	} else {
		const lines = readEnvLines(envPath);
		const { changed, result } = applyEntries(lines, entries);
		if (changed) {
			writeEnvLines(envPath, result);
			log('[env] Atualizado apps/backend/.env com configurações obrigatórias.');
		} else {
			log('[env] apps/backend/.env já está alinhado.');
		}
	}

	return readEnvObject(envPath);
}

function ensureFrontendEnv(defaults) {
	const envPath = resolve(rootDir, 'frontend', '.env.local');
	const entries = [
		{ key: 'VITE_API_URL', value: defaults.apiUrl, replaceIf: (current) => current !== defaults.apiUrl },
		{ key: 'VITE_WS_URL', value: defaults.wsUrl, replaceIf: (current) => current !== defaults.wsUrl },
		{ key: 'VITE_WS_PATH', value: defaults.wsPath, replaceIf: (current) => current !== defaults.wsPath }
	];

	if (!existsSync(envPath)) {
		const content = entries.map((entry) => `${entry.key}=${entry.value}`).join('\n');
		writeFileSync(envPath, `${content}\n`, 'utf-8');
		log('[env] Criado frontend/.env.local com valores padrão.');
		return;
	}

	const lines = readEnvLines(envPath);
	const { changed, result } = applyEntries(lines, entries);
	if (changed) {
		writeEnvLines(envPath, result);
		log('[env] Atualizado frontend/.env.local.');
	} else {
		log('[env] frontend/.env.local já está alinhado.');
	}
}

function cleanupLegacySessionDirs() {
	const legacyDir = resolve(rootDir, 'apps', 'backend', 'data', 'whatsapp_session');
	const targetDir = resolve(rootDir, 'data', 'whatsapp_session');

	if (existsSync(legacyDir)) {
		ensureDirectory(targetDir);
		cpSync(legacyDir, targetDir, { recursive: true });
		rmSync(legacyDir, { recursive: true, force: true });
		log('[env] Migrou sessão antiga de apps/backend/data para data/whatsapp_session.');
	}
}

function main() {
	ensureDirectory(resolve(rootDir, 'data'));
	ensureDirectory(resolve(rootDir, 'data', 'whatsapp_session'));
	ensureDirectory(resolve(rootDir, 'temp', 'windows'));

	cleanupLegacySessionDirs();
	const backendEnv = ensureBackendEnv();

	const apiPort = backendEnv.PORT || '3001';
	const wsPort = backendEnv.WS_PORT || apiPort;
	const wsPath = backendEnv.WS_PATH || '/socket.io';

	const apiUrl = `http://localhost:${apiPort}`;
	const wsUrl = `ws://localhost:${wsPort}`;

	ensureFrontendEnv({
		apiUrl,
		wsUrl,
		wsPath
	});

	if (!silent) {
		console.log('[env] Arquivos de ambiente verificados com sucesso.');
	}
}

try {
	main();
} catch (error) {
	console.error('[env] Falha ao garantir arquivos de ambiente:', error);
	process.exit(1);
}

