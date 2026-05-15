import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const logs = await prisma.deviceActionLog.findMany({
  where: { action: { in: ['PROBLEM_REPORT', 'PROBLEM_RESOLVED'] } },
  include: { device: { select: { deviceCode: true } } },
  orderBy: { createdAt: 'asc' },
});

process.stderr.write(`Total: ${logs.length}\n`);
for (const log of logs) {
  const p = log.payload ?? {};
  process.stderr.write(JSON.stringify({
    id: log.id,
    deviceCode: log.device?.deviceCode,
    action: log.action,
    problem: p.problem,
    company: p.company,
    importId: p.importId,
    createdAt: log.createdAt,
  }) + '\n');
}

await prisma.$disconnect();
