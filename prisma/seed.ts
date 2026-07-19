import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

const SALT_ROUNDS = 10;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const phone = process.env.ADMIN_PHONE ?? '01700000000';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
  const fullName = process.env.ADMIN_NAME ?? 'Restaurant Admin';
  const email = process.env.ADMIN_EMAIL;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { phone },
    update: { role: UserRole.ADMIN },
    create: {
      fullName,
      phone,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin user ready: ${admin.fullName} (${admin.phone})`);
  console.log(
    admin.password === hashedPassword
      ? `Login with phone "${phone}" and the password you set via ADMIN_PASSWORD (default: ${password}).`
      : `This user already existed; its role is now ADMIN but its original password was kept.`,
  );

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
