import prisma from '../db/client.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';
import { createHash } from 'crypto';

function safeDate(val) {
  if (!val || val === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// สร้าง checkoutNumber แบบ deterministic — import ซ้ำได้ค่าเดิม → ตรวจซ้ำได้
function makeCheckoutNumber(company, startTime, tabletNumbers) {
  const key = `${company}|${startTime}|${[...tabletNumbers].sort().join(',')}`;
  const hash = createHash('md5').update(key).digest('hex').slice(0, 10);
  return `CHK-IMP-${hash}`;
}

// สร้าง importId สำหรับ Problem — ใช้เช็คซ้ำ
function makeProblemImportId(deviceCode, problemDate, problem) {
  const key = `${deviceCode}|${problemDate}|${problem}`;
  return createHash('md5').update(key).digest('hex').slice(0, 10);
}

export default async function importRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])] };

  // ─── 1. Tablet_Status → Devices ───────────────────────────────────────────
  fastify.post('/tablet-status', auth, async (request, reply) => {
    const { rows } = request.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return reply.status(400).send({ error: 'rows is required' });

    const results = { created: 0, updated: 0, errors: [] };

    for (const row of rows) {
      try {
        const deviceCode = String(row.Tablet_Number ?? row.tablet_number ?? '').trim();
        if (!deviceCode) continue;

        const rawStatus = String(row.Status ?? row.status ?? '').trim().toUpperCase();
        let maintenanceStatus = 'NONE';
        if (rawStatus === 'WAIT') maintenanceStatus = 'IN_MAINTENANCE';
        // PENDING = กำลังใช้งาน → maintenanceStatus ยังคงเป็น NONE

        const existing = await prisma.device.findUnique({ where: { deviceCode } });
        if (existing) {
          await prisma.device.update({ where: { deviceCode }, data: { maintenanceStatus } });
          results.updated++;
        } else {
          await prisma.device.create({
            data: { deviceCode, name: `Tablet ${deviceCode}`, maintenanceStatus },
          });
          results.created++;
        }
      } catch (e) {
        results.errors.push({ row, error: e.message });
      }
    }

    logger.info({ results }, 'Import tablet-status done');
    return { success: true, results };
  });

  // ─── 2. Users ─────────────────────────────────────────────────────────────
  fastify.post('/users', auth, async (request, reply) => {
    const { rows } = request.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return reply.status(400).send({ error: 'rows is required' });

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const username = String(row.Username ?? row.username ?? '').trim();
        const email = String(row.Email ?? row.email ?? '').trim() || null;
        const phone = String(row.Phone ?? row.phone ?? '').trim();
        const permission = String(row.Permission ?? row.permission ?? '').trim();

        if (!username || !phone) {
          results.errors.push({ row, error: 'ต้องมี Username และ Phone' });
          continue;
        }

        const conditions = [{ username }];
        if (email) conditions.push({ email });
        const existing = await prisma.user.findFirst({ where: { OR: conditions } });
        if (existing) { results.skipped++; continue; }

        await prisma.user.create({
          data: {
            username,
            fullName: username,
            email: email || undefined,
            password: hashPassword(phone),
            role: permission.toLowerCase() === 'admin' ? 'ADMIN' : 'STAFF',
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push({ row, error: e.message });
      }
    }

    logger.info({ results }, 'Import users done');
    return { success: true, results };
  });

  // ─── 3. Problem → DeviceActionLog ─────────────────────────────────────────
  fastify.post('/problems', auth, async (request, reply) => {
    const { rows } = request.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return reply.status(400).send({ error: 'rows is required' });

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const tabletNumber = String(row.Tablet_Number ?? row.tablet_number ?? '').trim();
        const createBy = String(row.Create_By ?? row.create_by ?? '').trim();
        const status = String(row.Status ?? row.status ?? '').trim().toUpperCase();
        const problemDate = row.Problem_Date ?? row.problem_date;
        const problem = String(row.Problem ?? row.problem ?? '').trim();

        const device = await prisma.device.findUnique({ where: { deviceCode: tabletNumber } });
        if (!device) {
          results.errors.push({ row, error: `ไม่พบ Tablet ${tabletNumber} — import Tablet_Status ก่อน` });
          continue;
        }

        // เช็คซ้ำด้วย importId ใน payload
        const importId = makeProblemImportId(tabletNumber, problemDate, problem);
        const existing = await prisma.deviceActionLog.findFirst({
          where: { deviceId: device.id, payload: { string_contains: importId } },
        });
        if (existing) { results.skipped++; continue; }

        const user = createBy
          ? await prisma.user.findFirst({
              where: { OR: [{ username: createBy }, { fullName: createBy }] },
            })
          : null;

        // ถ้า status เป็น RESOLVED อัปเดต maintenanceStatus ของ device ด้วย
        if (status === 'RESOLVED') {
          await prisma.device.update({
            where: { id: device.id },
            data: { maintenanceStatus: 'NONE' },
          });
        } else {
          await prisma.device.update({
            where: { id: device.id },
            data: { maintenanceStatus: 'HAS_PROBLEM' },
          });
        }

        await prisma.deviceActionLog.create({
          data: {
            deviceId: device.id,
            userId: user?.id ?? null,
            user: createBy || null,
            action: status === 'RESOLVED' ? 'PROBLEM_RESOLVED' : 'PROBLEM_REPORT',
            payload: {
              company: row.Company ?? row.company ?? '',
              problem,
              solution: row.Solution ?? row.solution ?? '',
              status,
              importedFrom: 'google_sheets',
              importId,
            },
            createdAt: safeDate(problemDate) ?? new Date(),
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push({ row, error: e.message });
      }
    }

    logger.info({ results }, 'Import problems done');
    return { success: true, results };
  });

  // ─── 4. Tablet (Checkouts) ────────────────────────────────────────────────
  fastify.post('/checkouts', auth, async (request, reply) => {
    const { rows } = request.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return reply.status(400).send({ error: 'rows is required' });

    const firstAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!firstAdmin)
      return reply.status(400).send({ error: 'ไม่พบ Admin — import Users ก่อน' });

    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const company = String(row.Company ?? row.company ?? '').trim();
        const rawTablets = String(row.Tablet_Number ?? row.tablet_number ?? '').trim();
        // split ด้วย , หรือ / (กรณี Excel แปลง "9/12" เป็น date แล้ว formatted text กลับมาเป็น "12/9")
        const tabletNumbers = rawTablets
          .split(/[,/]/)
          .map((s) => s.trim())
          .filter((s) => s && /^\d+$/.test(s)); // เฉพาะตัวเลขล้วนเท่านั้น
        const charger = parseInt(String(row.Charger ?? row.charger ?? '0')) || 0;
        const status = String(row.Status ?? row.status ?? '').trim().toUpperCase();

        const startTime = row.Start_Time ?? row.start_time;
        const endTime = row.End_Time ?? row.end_time;
        const takeTime = row.Take_Time ?? row.take_time;
        const returnTime = row.Return_Time ?? row.return_time;
        const usageNotes = String(row.Usage_Notes ?? row.usage_notes ?? '').trim();
        const returnNotes = String(row.Return_Notes ?? row.return_notes ?? '').trim();
        const byUser = String(row.By_User ?? row.by_user ?? '').trim();
        const returnUser = String(row.Return_User ?? row.return_user ?? '').trim();

        if (tabletNumbers.length === 0) { results.skipped++; continue; }

        // Look up users
        const borrower = byUser
          ? await prisma.user.findFirst({ where: { OR: [{ username: byUser }, { fullName: byUser }] } })
          : null;
        const returner = returnUser
          ? await prisma.user.findFirst({ where: { OR: [{ username: returnUser }, { fullName: returnUser }] } })
          : null;

        // Look up devices
        const devices = [];
        for (const num of tabletNumbers) {
          const device = await prisma.device.findUnique({ where: { deviceCode: num } });
          if (device) devices.push(device);
          else results.errors.push({ row: `แถว ${i + 1}`, error: `ไม่พบ Tablet ${num}` });
        }
        if (devices.length === 0) { results.skipped++; continue; }

        const isReturned = status === 'DONE' || status === 'ALERT';
        const hasAlert = status === 'ALERT';

        // checkoutNumber แบบ deterministic → import ซ้ำได้ค่าเดิม
        const checkoutNumber = makeCheckoutNumber(company, startTime ?? '', tabletNumbers);

        // เช็คซ้ำ
        const existingCheckout = await prisma.checkout.findUnique({ where: { checkoutNumber } });
        if (existingCheckout) { results.skipped++; continue; }
        const creatorId = borrower?.id ?? firstAdmin.id;

        await prisma.checkout.create({
          data: {
            checkoutNumber,
            company: company || null,
            borrowerId: borrower?.id ?? null,
            charger,
            startTime: safeDate(startTime) ?? new Date(),
            endTime: safeDate(endTime),
            usageNotes: usageNotes || null,
            createdBy: creatorId,
            createdAt: safeDate(takeTime) ?? new Date(),
            items: {
              create: devices.map((device) => ({
                deviceId: device.id,
                returnedAt: isReturned ? (safeDate(returnTime) ?? null) : null,
                returnedBy: isReturned ? (returner?.id ?? null) : null,
                returnNotes: returnNotes || null,
                maintenanceStatus: hasAlert ? 'HAS_PROBLEM' : null,
              })),
            },
            events: {
              create: {
                eventType: 'CREATED',
                userId: creatorId,
                username: byUser || firstAdmin.username,
                newData: { importedFrom: 'google_sheets', originalStatus: status },
              },
            },
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push({ row: `แถว ${i + 1}`, error: e.message });
      }
    }

    logger.info({ results }, 'Import checkouts done');
    return { success: true, results };
  });
}
