import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';

if (platform() !== 'win32') {
	console.error('ERROR: Este script é específico para Windows. Use o comando padrão em outros sistemas.');
	process.exit(1);
}

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
				// Processo já pode ter sido encerrado
			}
		});
	} catch {
		// Nenhum processo utilizando a porta
	}
}

const port = Number(process.env.VITE_PORT || process.env.PORT || 5173);
if (!Number.isNaN(port)) {
	killPortIfBusy(port);
}

const viteBin = fileURLToPath(new URL('../node_modules/.bin/vite.cmd', import.meta.url));

// Verificar se o Vite existe
if (!existsSync(viteBin)) {
	console.error('========================================');
	console.error('ERRO: Vite nao encontrado!');
	console.error('========================================');
	console.error(`Caminho esperado: ${viteBin}`);
	console.error('Execute: npm install');
	console.error('========================================\n');
	process.exit(1);
}

console.log('Iniciando servidor Vite...');
console.log(`Porta: ${port}`);
console.log(`Diretorio: ${resolve(fileURLToPath(import.meta.url), '..', '..')}`);
console.log('');

const child = spawn(viteBin, [], {
	stdio: 'inherit',
	shell: true,
	cwd: resolve(fileURLToPath(import.meta.url), '..', '..'),
	env: { ...process.env }
});

const shutdown = (signal) => {
	console.log(`\nRecebido ${signal}, encerrando Vite...`);
	child.kill(signal);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGBREAK', () => shutdown('SIGBREAK'));

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
		console.error(`ERRO: Frontend encerrou com codigo: ${exitCode}`);
		console.error(`========================================`);
		console.error(`Verifique os logs acima para identificar o problema.`);
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

child.on('error', (error) => {
	console.error('\n========================================');
	console.error('ERRO FATAL ao iniciar servidor Vite:');
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

