import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../dist/generated/prisma/client.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !password || password.length < 12) {
  throw new Error('Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before provisioning.');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const passwordHash = await hash(password);
  await prisma.user.upsert({ where: { email }, create: { email, passwordHash, role: UserRole.ADMIN }, update: { passwordHash, role: UserRole.ADMIN } });
  console.info('Admin account provisioned.');
} finally {
  await prisma.$disconnect();
}
