import { execSync } from 'child_process';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load backend .env so tests use the same base credentials/host
dotenv.config({ path: resolve(process.cwd(), '.env') });

const DEFAULT_BASE_URL =
	process.env.DATABASE_URL ||
	'postgresql://postgres:postgrespassword@localhost:55432/whatsself?schema=public';

const TEST_DB_URL =
	process.env.TEST_DATABASE_URL ||
	buildUrl(DEFAULT_BASE_URL, {
		dbNameSuffix: '_test',
		schema: 'test'
	});

const TEST_API_DB_URL =
	process.env.TEST_API_DATABASE_URL ||
	buildUrl(DEFAULT_BASE_URL, {
		dbNameSuffix: '_test_api',
		schema: 'test_api'
	});

const databases = [
	{ name: 'TEST_DB', url: TEST_DB_URL },
	{ name: 'TEST_API_DB', url: TEST_API_DB_URL }
];

function buildUrl(baseUrl, { dbNameSuffix, schema }) {
	const url = new URL(baseUrl);

	// Ensure database name is suffixed to avoid clobbering dev data
	const dbName = url.pathname.replace('/', '') || 'postgres';
	url.pathname = `/${dbName}${dbNameSuffix ?? ''}`;

	// Force an isolated schema for tests to keep things tidy
	if (schema) {
		url.searchParams.set('schema', schema);
	}

	// Apply conservative pooling for tests if not set
	if (!url.searchParams.has('connection_limit')) {
		url.searchParams.set('connection_limit', '5');
	}
	if (!url.searchParams.has('pool_timeout')) {
		url.searchParams.set('pool_timeout', '5000');
	}

	return url.toString();
}

function pushSchema(databaseUrl, name) {
	console.log(`Creating test database [${name}] at ${databaseUrl}...`);
	execSync('npx prisma db push --skip-generate', {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: databaseUrl }
	});
	console.log(`[${name}] database ready!`);
}

for (const { url, name } of databases) {
	try {
		pushSchema(url, name);
	} catch (error) {
		console.error(`Failed to create test database [${name}] at ${url}:`, error);
		process.exit(1);
	}
}
