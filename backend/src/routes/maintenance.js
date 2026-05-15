import prisma from '../db/client.js';

async function maintenanceRoutes(fastify, options) {
  // GET /api/maintenance/history
  // Source: DeviceActionLog (PROBLEM_REPORT / PROBLEM_RESOLVED) only
  // CheckoutItem.problem is visible on the checkout detail page — using it here would cause duplicates
  fastify.get('/history', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { page = 1, limit = 50, deviceCode, status } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      action: { in: ['PROBLEM_REPORT', 'PROBLEM_RESOLVED'] },
    };

    if (deviceCode) {
      where.device = { deviceCode: { contains: deviceCode, mode: 'insensitive' } };
    }

    // status filter: map to action name
    if (status === 'RESOLVED') {
      where.action = 'PROBLEM_RESOLVED';
    } else if (status === 'PENDING') {
      where.action = 'PROBLEM_REPORT';
    }

    // Fetch all (no skip/take yet) so we can deduplicate by importId before paginating
    const logs = await prisma.deviceActionLog.findMany({
      where,
      include: {
        device: { select: { deviceCode: true, name: true } },
        userRef: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate by content — always use content key so records with/without importId match each other
    const seen = new Set();
    const unique = logs.filter((log) => {
      const p = (typeof log.payload === 'object' && log.payload !== null) ? log.payload : {};
      const problem = String(p.problem ?? '').trim();
      const company = String(p.company ?? '').trim();
      const minute = new Date(log.createdAt).toISOString().slice(0, 16);
      const key = `${log.deviceId}:${log.action}:${problem}:${company}:${minute}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const total = unique.length;
    const paginated = unique.slice(skip, skip + Number(limit));

    const data = paginated.map((log) => {
      const payload = log.payload ?? {};
      return {
        id: log.id,
        deviceCode: log.device?.deviceCode ?? '',
        deviceName: log.device?.name ?? null,
        date: log.createdAt,
        problem: payload.problem ?? null,
        solution: payload.solution ?? null,
        status: log.action === 'PROBLEM_RESOLVED' ? 'RESOLVED' : 'PENDING',
        reportedBy: log.userRef?.fullName ?? log.userRef?.username ?? log.user ?? null,
        company: payload.company ?? null,
      };
    });

    return reply.send({ success: true, data, total, page: Number(page), limit: Number(limit) });
  });
}

export default maintenanceRoutes;
