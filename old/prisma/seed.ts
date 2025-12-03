import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('123456', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      name: 'Administrator',
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('✅ Created admin user:', admin.username)

  // Create restaurant info
  const restaurantInfo = await prisma.restaurantInfo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Mooprompt Restaurant',
      address: '123 Restaurant Street',
      phone: '02-123-4567',
      openTime: '10:00',
      closeTime: '22:00',
    },
  })
  console.log('✅ Created restaurant info')

  // Create categories
  const category1 = await prisma.menuCategory.create({
    data: {
      name: 'เนื้อหมู',
      items: {
        create: [
          {
            name: 'หมูสไลด์',
            price: 150,
            isAvailable: true,
            isBuffetItem: true,      // ใช้ได้กับบุฟเฟ่ต์
            isALaCarteItem: true,    // ใช้ได้กับ à la carte
          },
          {
            name: 'หมูสามชั้น',
            price: 180,
            isAvailable: true,
            isBuffetItem: true,
            isALaCarteItem: true,
          },
          {
            name: 'หมูสันนอก',
            price: 200,
            isAvailable: true,
            isBuffetItem: true,
            isALaCarteItem: true,
          },
        ],
      },
    },
  })

  const category2 = await prisma.menuCategory.create({
    data: {
      name: 'เนื้อวัว',
      items: {
        create: [
          {
            name: 'เนื้อสไลด์',
            price: 250,
            isAvailable: true,
            isBuffetItem: true,
            isALaCarteItem: true,
          },
          {
            name: 'เนื้อสันใน',
            price: 300,
            isAvailable: true,
            isBuffetItem: false,     // ใช้ได้เฉพาะ à la carte (จ่ายเพิ่ม)
            isALaCarteItem: true,
          },
        ],
      },
    },
  })

  const category3 = await prisma.menuCategory.create({
    data: {
      name: 'เครื่องดื่ม',
      items: {
        create: [
          {
            name: 'น้ำอัดลม',
            price: 30,
            isAvailable: true,
            isBuffetItem: true,
            isALaCarteItem: true,
          },
          {
            name: 'น้ำเปล่า',
            price: 20,
            isAvailable: true,
            isBuffetItem: true,
            isALaCarteItem: true,
          },
        ],
      },
    },
  })

  console.log('✅ Created categories and menu items')

  // Create tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        name: `โต๊ะ ${i}`,
        status: 'AVAILABLE',
      },
    })
  }
  console.log('✅ Created 10 tables')

  // Create packages
  const package1 = await prisma.package.create({
    data: {
      name: 'บุฟเฟต์ 2 ชั่วโมง',
      pricePerPerson: 299,
      durationMinutes: 120,
    },
  })

  const package2 = await prisma.package.create({
    data: {
      name: 'บุฟเฟต์ 3 ชั่วโมง',
      pricePerPerson: 399,
      durationMinutes: 180,
    },
  })

  console.log('✅ Created packages')

  // Create extra charges
  await prisma.extraCharge.create({
    data: {
      name: 'น้ำรีฟิล',
      price: 50,
      chargeType: 'PER_SESSION',
      active: true,
    },
  })

  console.log('✅ Created extra charges')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

