import logger from '../utils/logger.js';
import prisma from '../db/client.js';
import { createAuditLog } from '../utils/audit.js';
import {
  onCheckoutCreated,
  onDeviceReturned,
  onMaintenanceStatusChanged,
} from '../services/device-status-realtime.service.js';

/**
 * List checkouts with filters and pagination
 * GET /api/checkouts
 */
export async function listCheckouts(request, reply) {
  try {
    const {
      status,
      search,
      limit = 20,
      offset = 0,
    } = request.query;

    const where = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { checkoutNumber: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.checkout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          borrower: {
            select: { id: true, username: true, fullName: true },
          },
          creator: {
            select: { id: true, username: true, fullName: true },
          },
          items: {
            select: { id: true },
          },
        },
      }),
      prisma.checkout.count({ where }),
    ]);

    return {
      success: true,
      data: items,
      total,
      limit: Number(limit),
      offset: Number(offset),
    };
  } catch (error) {
    logger.error({ error }, 'Error listing checkouts');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Create a new checkout
 * POST /api/checkouts
 */
export async function createCheckout(request, reply) {
  try {
    const {
      company,
      borrowerId,
      charger,
      deviceIds,
      startTime,
      endTime,
      usageNotes,
    } = request.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return reply.code(400).send({
        error: 'deviceIds is required and must be a non-empty array',
      });
    }

    // Verify devices exist
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, deviceCode: true, name: true },
    });

    if (devices.length !== deviceIds.length) {
      return reply.code(400).send({
        error: 'Some devices not found',
      });
    }

    const currentUser = request.user;

    // Generate checkout number (simple version)
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.checkout.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const checkoutNumber = `CHK-${datePart}-${String(countToday + 1).padStart(3, '0')}`;

    const checkout = await prisma.$transaction(async (tx) => {
      const created = await tx.checkout.create({
        data: {
          checkoutNumber,
          company: company || null,
          borrowerId: borrowerId || null,
          charger: charger ?? null,
          // ถ้าไม่ส่งมา จะใช้ default(now()) ตาม schema
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          usageNotes: usageNotes || null,
          createdBy: currentUser.id,
          items: {
            create: deviceIds.map((deviceId) => ({
              deviceId,
            })),
          },
          events: {
            create: [
              {
                eventType: 'CREATED',
                userId: currentUser.id,
                notes: 'Checkout created',
              },
              {
                eventType: 'CHECKED_OUT',
                userId: currentUser.id,
                notes: 'Devices checked out',
              },
            ],
          },
        },
        include: {
          items: true,
        },
      });

      // Audit log
      await createAuditLog(request, 'CHECKOUT_CREATED', 'CHECKOUT', created.id, {
        checkoutNumber: created.checkoutNumber,
        deviceIds,
      });

      return created;
    });

    // Broadcast borrow status for all devices
    await onCheckoutCreated(checkout.id, deviceIds);

    return reply.code(201).send({
      success: true,
      data: checkout,
      message: 'Checkout created successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error creating checkout');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get checkout detail
 * GET /api/checkouts/:id
 */
export async function getCheckoutById(request, reply) {
  try {
    const { id } = request.params;

    const checkout = await prisma.checkout.findUnique({
      where: { id },
      include: {
        borrower: {
          select: { id: true, username: true, fullName: true },
        },
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        items: {
          include: {
            device: {
              select: {
                id: true,
                deviceCode: true,
                name: true,
                model: true,
              },
            },
            returner: {
              select: { id: true, username: true, fullName: true },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, username: true, fullName: true },
            },
          },
        },
      },
    });

    if (!checkout || checkout.deletedAt) {
      return reply.code(404).send({
        error: 'Checkout not found',
      });
    }

    return {
      success: true,
      data: checkout,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching checkout detail');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Return devices in a checkout
 * POST /api/checkouts/:id/return
 */
export async function returnDevices(request, reply) {
  try {
    const { id } = request.params;
    const {
      itemIds,
      problem,
      solution,
      maintenanceStatus,
      returnNotes,
    } = request.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return reply.code(400).send({
        error: 'itemIds is required and must be a non-empty array',
      });
    }

    const currentUser = request.user;

    const checkout = await prisma.checkout.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!checkout || checkout.deletedAt) {
      return reply.code(404).send({
        error: 'Checkout not found',
      });
    }

    const targetItems = checkout.items.filter((item) => itemIds.includes(item.id));

    if (targetItems.length === 0) {
      return reply.code(400).send({
        error: 'No matching checkout items found',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Update each item
      const updatedItems = await Promise.all(
        targetItems.map((item) =>
          tx.checkoutItem.update({
            where: { id: item.id },
            data: {
              returnedAt: item.returnedAt || now,
              returnedBy: item.returnedBy || currentUser.id,
              problem: problem ?? item.problem,
              solution: solution ?? item.solution,
              maintenanceStatus: maintenanceStatus ?? item.maintenanceStatus,
              returnNotes: returnNotes ?? item.returnNotes,
            },
          }),
        ),
      );

      // Create event
      await tx.checkoutEvent.create({
        data: {
          checkoutId: checkout.id,
          eventType: 'ITEM_RETURNED',
          userId: currentUser.id,
          notes: `Returned ${updatedItems.length} devices`,
          newData: {
            itemIds,
            maintenanceStatus: maintenanceStatus || null,
          },
        },
      });

      // If all items are returned, set endTime
      const remaining = await tx.checkoutItem.count({
        where: {
          checkoutId: checkout.id,
          returnedAt: null,
        },
      });

      let finalCheckout = checkout;

      if (remaining === 0 && !checkout.endTime) {
        finalCheckout = await tx.checkout.update({
          where: { id: checkout.id },
          data: {
            endTime: now,
          },
        });
      }

      await createAuditLog(request, 'CHECKOUT_RETURN', 'CHECKOUT', checkout.id, {
        itemIds,
      });

      return finalCheckout;
    });

    // Broadcast borrow status for affected devices
    const deviceIds = targetItems.map((item) => item.deviceId);
    const uniqueDeviceIds = [...new Set(deviceIds)];
    await Promise.all(uniqueDeviceIds.map((deviceId) => onDeviceReturned(deviceId)));

    return {
      success: true,
      data: updated,
      message: 'Devices returned successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error returning devices');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}


