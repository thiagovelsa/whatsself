import pino from 'pino';
import { existsSync, mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_DIR = process.env.WHATSELF_LOG_DIR
  ? resolve(process.env.WHATSELF_LOG_DIR)
  : resolve(__dirname, '..', '..', '..', 'logs');
const MAX_BYTES = Number(process.env.WHATSELF_LOG_MAX_BYTES ?? 5 * 1024 * 1024);
const ROTATE_INTERVAL_MS = Number(process.env.WHATSELF_LOG_ROTATE_INTERVAL_MS ?? 60_000);
const MAX_FILES = Number(process.env.WHATSELF_LOG_MAX_FILES ?? 10);
const MAX_AGE_MS = Number(process.env.WHATSELF_LOG_MAX_AGE_DAYS ?? 7) * 24 * 60 * 60 * 1000;

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

async function cleanupOldLogs(filePath: string): Promise<void> {
  // If retention is disabled, skip cleanup
  if (MAX_FILES <= 0 && MAX_AGE_MS <= 0) {
    return;
  }

  try {
    const dir = dirname(filePath);
    const baseName = basename(filePath);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const rotated = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.startsWith(`${baseName}.`))
        .map(async (entry) => {
          const fullPath = join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs };
        })
    );

    const now = Date.now();
    const deletions = new Set<string>();

    if (MAX_AGE_MS > 0) {
      rotated
        .filter((entry) => now - entry.mtimeMs > MAX_AGE_MS)
        .forEach((entry) => deletions.add(entry.fullPath));
    }

    if (MAX_FILES > 0 && rotated.length > MAX_FILES) {
      const sortedByDate = rotated
        .filter((entry) => !deletions.has(entry.fullPath))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
      sortedByDate.slice(MAX_FILES).forEach((entry) => deletions.add(entry.fullPath));
    }

    for (const target of deletions) {
      try {
        await fs.rm(target);
      } catch (error) {
        console.warn('[log-rotator] Failed to clean rotated log file:', error);
      }
    }
  } catch (error) {
    console.warn('[log-rotator] Failed to enforce log retention:', error);
  }
}

function startRotation(filePath: string, reopen: () => void): void {
  setInterval(async () => {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size < MAX_BYTES) {
        return;
      }
      const rotatedPath = `${filePath}.${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await fs.rename(filePath, rotatedPath);
      reopen();
      void cleanupOldLogs(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      console.warn('[log-rotator] Failed to rotate log file:', error);
    }
  }, ROTATE_INTERVAL_MS).unref();
}

export function createLogger(name: string) {
  ensureLogDir();
  const filePath = resolve(LOG_DIR, `${name}.log`);
  const destination = pino.destination({ dest: filePath, mkdir: true, sync: false });
  startRotation(filePath, () => destination.reopen());

  return pino(
    { name },
    pino.multistream([
      { stream: process.stdout },
      { stream: destination }
    ])
  );
}
