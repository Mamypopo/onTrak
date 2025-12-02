import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create departments
  const dept1 = await prisma.department.upsert({
    where: { name: 'แผนก IT' },
    update: {},
    create: {
      name: 'แผนก IT',
    },
  })

  const dept2 = await prisma.department.upsert({
    where: { name: 'แผนกบัญชี' },
    update: {},
    create: {
      name: 'แผนกบัญชี',
    },
  })

  const dept3 = await prisma.department.upsert({
    where: { name: 'แผนกขาย' },
    update: {},
    create: {
      name: 'แผนกขาย',
    },
  })

  // Create admin user
  const passwordHash = await bcrypt.hash('123456', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: 'ผู้ดูแลระบบ',
      role: 'ADMIN',
    },
  })

  // Create staff users
  const staff1 = await prisma.user.upsert({
    where: { username: 'staff1' },
    update: {},
    create: {
      username: 'staff1',
      passwordHash: await bcrypt.hash('123456', 10),
      name: 'พนักงาน 1',
      role: 'STAFF',
      departmentId: dept1.id,
    },
  })

  const staff2 = await prisma.user.upsert({
    where: { username: 'staff2' },
    update: {},
    create: {
      username: 'staff2',
      passwordHash: await bcrypt.hash('123456', 10),
      name: 'พนักงาน 2',
      role: 'STAFF',
      departmentId: dept2.id,
    },
  })

  // Create template
  const template = await prisma.template.upsert({
    where: { id: 'template-1' },
    update: {},
    create: {
      id: 'template-1',
      name: 'Template งานทั่วไป',
      checkpoints: {
        create: [
          {
            order: 1,
            name: 'ตรวจสอบข้อมูล',
            ownerDeptId: dept1.id,
          },
          {
            order: 2,
            name: 'อนุมัติ',
            ownerDeptId: dept2.id,
          },
          {
            order: 3,
            name: 'ดำเนินการ',
            ownerDeptId: dept3.id,
          },
        ],
      },
    },
  })

  console.log('Seed data created:', {
    admin: admin.username,
    staff1: staff1.username,
    staff2: staff2.username,
    template: template.name,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

