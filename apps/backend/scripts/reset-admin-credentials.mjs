/**
 * Script para resetar credenciais do admin para admin@whatsself.local / admin
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Email padrão que o backend usa
const ADMIN_EMAIL = 'admin@whatsself.local';
const ADMIN_PASSWORD = 'admin';

try {
	console.log('Procurando usuario admin...');
	
	// Procurar por qualquer usuário admin (por role, não por email específico)
	const admin = await prisma.user.findFirst({ 
		where: { 
			role: 'admin',
			active: true
		} 
	});

	// Hash da senha "admin"
	const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
	
	if (!admin) {
		console.log('Usuario admin nao encontrado. Criando novo usuario...');
		// Criar novo admin diretamente no banco
		await prisma.user.create({
			data: {
				email: ADMIN_EMAIL,
				password: hashedPassword,
				name: 'Administrator',
				role: 'admin',
				active: true
			}
		});
		console.log('Usuario admin criado com sucesso!');
		console.log(`Email: ${ADMIN_EMAIL}`);
		console.log(`Senha: ${ADMIN_PASSWORD}`);
	} else {
		console.log(`Usuario admin encontrado: ${admin.email}`);
		
		// Atualizar email e senha
		await prisma.user.update({
			where: { id: admin.id },
			data: { 
				email: ADMIN_EMAIL,
				password: hashedPassword
			}
		});
		console.log(`Email atualizado para: ${ADMIN_EMAIL}`);
		console.log(`Senha resetada para: ${ADMIN_PASSWORD}`);
		console.log('');
		console.log('Credenciais atualizadas:');
		console.log(`Email: ${ADMIN_EMAIL}`);
		console.log(`Senha: ${ADMIN_PASSWORD}`);
	}
	
	console.log('');
	console.log('Credenciais resetadas com sucesso!');
} catch (error) {
	console.error('Erro ao resetar credenciais:', error);
	process.exit(1);
} finally {
	await prisma.$disconnect();
}

