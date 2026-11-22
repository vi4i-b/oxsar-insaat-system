const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bazaya ilkin məlumatlar (seed) əlavə edilir...');

  // 1. ADMIN (Müdir) yoxlanışı və yaradılması
  const adminPhone = '0500000000';
  const existingAdmin = await prisma.worker.findUnique({
    where: { phone: adminPhone },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const admin = await prisma.worker.create({
      data: {
        full_name: 'Oxşar İnşaat Müdir',
        role: 'ADMIN',
        phone: adminPhone,
        password_hash: passwordHash,
        daily_wage: 0,
        is_active: true,
      },
    });
    console.log(`✅ Müdir hesabı yaradıldı: ${admin.full_name} (${admin.phone})`);
  } else {
    console.log(`ℹ️ Müdir hesabı artıq mövcuddur: ${existingAdmin.full_name}`);
  }

  // 2. Standart İş Növləri (work_types)
  const defaultWorkTypes = [
    { name: 'Astar', daily_norm_m2: 500, default_price_m2: 3 },
    { name: 'Sürmə', daily_norm_m2: 500, default_price_m2: 5 },
    { name: 'Tol', daily_norm_m2: 150, default_price_m2: 8 },
  ];

  for (const wt of defaultWorkTypes) {
    const existing = await prisma.workType.findFirst({
      where: { name: wt.name },
    });

    if (!existing) {
      await prisma.workType.create({
        data: wt,
      });
      console.log(`✅ İş növü yaradıldı: ${wt.name} (Norma: ${wt.daily_norm_m2} m²/gün, Qiymət: ${wt.default_price_m2} AZN/m²)`);
    } else {
      console.log(`ℹ️ İş növü artıq mövcuddur: ${wt.name}`);
    }
  }

  console.log('🎉 Seed prosesi uğurla tamamlandı!');
}

main()
  .catch((e) => {
    console.error('❌ Seed xətası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
