import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === 'development' ? ['error', 'info', 'query', 'warn'] : ['error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  console.log('Database is connected');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('Database is disconnected');
}
