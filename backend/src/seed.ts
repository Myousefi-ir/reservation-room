import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---- Rooms (phase 1: VIP1, VIP2) ----
  const roomNames = ['VIP1', 'VIP2'];
  for (const name of roomNames) {
    await prisma.room.upsert({
      where: { name },
      update: {},
      create: { name, description: `اتاق جلسات ${name}`, isActive: true },
    });
  }
  console.log(`✓ Rooms ensured: ${roomNames.join(', ')}`);

  // ---- Default admin ----
  const mobile = process.env.SEED_ADMIN_MOBILE || '09120000000';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || 'مدیر';
  const lastName = process.env.SEED_ADMIN_LAST_NAME || 'سیستم';

  const existing = await prisma.user.findUnique({ where: { mobile } });
  if (!existing) {
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        mobile,
        password: await bcrypt.hash(password, 10),
        role: 'admin',
        status: 'active',
      },
    });
    console.log(`✓ Admin created: ${mobile}`);
  } else {
    console.log(`• Admin already exists: ${mobile}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
