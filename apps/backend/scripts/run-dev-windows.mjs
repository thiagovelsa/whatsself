/**
 * Development runner optimized for Windows
 * This replaces run-dev.mjs with Windows-specific optimizations
 */
import { spawn, execSync } from 'node:child_process';
function killPortIfBusy(port) {
	if (!port) return;
	try {
		const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
		const pids = new Set(
			result
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean)
				.map((line) => {
					const parts = line.split(/\s+/);
					return parts[parts.length - 1];
				})
				.filter((pid) => /^\d+$/.test(pid))
		);

		pids.forEach((pid) => {
			try {
				execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
				console.log(`Finalizado processo que usava a porta ${port} (PID ${pid}).`);
			} catch {
				// Ignore failures (process may have exited meanwhile)
			}
		});
	} catch {
		// Nothing running on that port
	}
}
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { platform, tmpdir, homedir } from 'node:os';

// Ensure we're running on Windows
if (platform() !== 'win32') {
	console.error('ERROR: This script is optimized for Windows only.');
	console.error('If you are on Linux/Mac, use: npm run dev:unix');
	process.exit(1);
}

// Setup environment
const env = { ...process.env };

// Configure temp directory for Windows
const windowsTempDir = env.WINDOWS_TEMP_DIR ||
	join(homedir(), 'AppData', 'Local', 'Temp', 'whatsself', 'tsx');

// Ensure temp directory exists
if (!existsSync(windowsTempDir)) {
	mkdirSync(windowsTempDir, { recursive: true });
	console.log(`Created temp directory: ${windowsTempDir}`);
}

// Set temp environment variables
env.TMPDIR = windowsTempDir;
env.TMP = windowsTempDir;
env.TEMP = windowsTempDir;

// Enable long path support on Windows
env.NODE_SKIP_PLATFORM_CHECK = '1';

// Find tsx binary
const binPath = fileURLToPath(new URL('../node_modules/.bin/tsx.cmd', import.meta.url));

// Verify tsx is installed
if (!existsSync(binPath)) {
	console.error('ERROR: tsx not found. Please run: npm install');
	process.exit(1);
}

console.log('Starting WhatsSelf Backend in development mode...');
console.log(`Platform: Windows (${platform()})`);
console.log(`Temp directory: ${windowsTempDir}`);
console.log('Watching for changes...\n');

const apiPort = Number(env.PORT || 3001);
if (!Number.isNaN(apiPort)) {
	killPortIfBusy(apiPort);
}

// Spawn tsx with watch mode
const child = spawn(
	binPath,
	['watch', '--clear-screen=false', 'src/index.ts'],
	{
		stdio: 'inherit',
		env,
		shell: true,
		cwd: resolve(fileURLToPath(import.meta.url), '..', '..')
	}
);

// Handle process signals (Windows-specific)
process.on('SIGINT', () => {
	console.log('\nReceived SIGINT, shutting down gracefully...');
	child.kill('SIGINT');
});

process.on('SIGTERM', () => {
	console.log('\nReceived SIGTERM, shutting down gracefully...');
	child.kill('SIGTERM');
});

// Windows-specific: CTRL+BREAK
process.on('SIGBREAK', () => {
	console.log('\nReceived SIGBREAK, shutting down gracefully...');
	child.kill('SIGBREAK');
});

// Handle child process exit
child.on('exit', (code, signal) => {
	if (signal) {
		console.log(`\n========================================`);
		console.log(`Process exited with signal: ${signal}`);
		console.log(`========================================\n`);
		process.kill(process.pid, signal);
		return;
	}

	const exitCode = code ?? 0;
	if (exitCode !== 0) {
		console.error(`\n========================================`);
		console.error(`ERRO: Process exited with code: ${exitCode}`);
		console.error(`========================================`);
		console.error(`O backend encerrou com erro. Verifique os logs acima.`);
		console.error(`Pressione qualquer tecla para fechar...`);
		console.error(`========================================\n`);
		// Aguarda entrada do usuário antes de fechar
		setTimeout(() => {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.once('data', () => {
				process.exit(exitCode);
			});
		}, 1000);
		return;
	}

	process.exit(exitCode);
});

// Handle errors
child.on('error', (error) => {
	console.error('\n========================================');
	console.error('ERRO FATAL ao iniciar servidor de desenvolvimento:');
	console.error('========================================');
	console.error(error);
	if (error.stack) {
		console.error('\nStack trace:');
		console.error(error.stack);
	}
	console.error('\n========================================');
	console.error('Pressione qualquer tecla para fechar...');
	console.error('========================================\n');
	// Aguarda entrada do usuário antes de fechar
	setTimeout(() => {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.once('data', () => {
	process.exit(1);
		});
	}, 1000);
});