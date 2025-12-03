import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@ontrak.com',
      password: hashPassword('123456'),
      fullName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Created admin user:', admin.username);

  // Create staff user
  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      email: 'staff@ontrak.com',
      password: hashPassword('123456'),
      fullName: 'Staff',
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('Created staff user:', staff.username);

  // Create test devices
  const devices = [
    {
      deviceCode: 'adffd4df3b37682a',
      name: 'Tablet 001 - ทดสอบระบบ',
      serialNumber: 'SN123456789',
      model: 'Samsung Galaxy Tab A8',
      osVersion: 'Android 13',
      battery: 85,
      wifiStatus: true,
      latitude: 13.7563,
      longitude: 100.5018,
      kioskMode: false,
      status: 'ONLINE',
    },
    {
      deviceCode: 'TAB-002',
      name: 'Tablet 002 - Reception',
      serialNumber: 'SN987654321',
      model: 'Samsung Galaxy Tab S9',
      osVersion: 'Android 14',
      battery: 92,
      wifiStatus: true,
      latitude: 13.7565,
      longitude: 100.5020,
      kioskMode: true,
      status: 'ONLINE',
    },
    {
      deviceCode: 'TAB-003',
      name: 'Tablet 003 - Warehouse',
      serialNumber: 'SN456789123',
      model: 'Lenovo Tab M10',
      osVersion: 'Android 12',
      battery: 45,
      wifiStatus: false,
      latitude: 13.7560,
      longitude: 100.5015,
      kioskMode: false,
      status: 'ONLINE',
    },
    {
      deviceCode: 'TAB-004',
      name: 'Tablet 004 - Office Floor 2',
      serialNumber: 'SN789123456',
      model: 'iPad Pro 12.9"',
      osVersion: 'iOS 17',
      battery: 78,
      wifiStatus: true,
      latitude: 13.7568,
      longitude: 100.5022,
      kioskMode: false,
      status: 'ONLINE',
    },
   
  ];

  for (const deviceData of devices) {
    const device = await prisma.device.upsert({
      where: { deviceCode: deviceData.deviceCode },
      update: {
        ...deviceData,
        lastSeen: new Date(),
      },
      create: {
        ...deviceData,
        lastSeen: new Date(),
      },
    });

    console.log(`Created/updated device: ${device.deviceCode} - ${device.name}`);

    // Create sample metrics for each device
    await prisma.deviceMetrics.create({
      data: {
        deviceId: device.id,
        cpu: Math.random() * 100,
        memoryTotal: BigInt(8192000000), // 8GB
        memoryUsed: BigInt(Math.floor(Math.random() * 4096000000)), // 0-4GB
        memoryAvailable: BigInt(Math.floor(Math.random() * 4096000000)),
        storageTotal: BigInt(128000000000), // 128GB
        storageUsed: BigInt(Math.floor(Math.random() * 64000000000)), // 0-64GB
        storageAvailable: BigInt(Math.floor(Math.random() * 64000000000)),
        networkType: deviceData.wifiStatus ? 'WiFi' : 'Mobile',
      },
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

