import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/services/authService.ts';

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

const admin = await prisma.user.findFirst({ where: { email: 'admin@whatsself.local' } });

if (!admin) {
  console.error('Admin user not found.');
  process.exit(1);
}

await authService.resetPassword(admin.id, 'admin');
console.log('Default admin password reset to "admin".');

await prisma.$disconnect();
process.exit(0);
