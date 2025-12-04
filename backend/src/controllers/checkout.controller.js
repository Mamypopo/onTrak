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
        take: parseInt(limit) * 2, // Get more items to account for filtering
        skip: parseInt(offset),
        include: {
          borrower: {
            select: { id: true, username: true, fullName: true },
          },
          creator: {
            select: { id: true, username: true, fullName: true },
          },
          items: {
            select: { id: true, returnedAt: true },
          },
        },
      }),
      prisma.checkout.count({ where }),
    ]);

    // Calculate status for each checkout (computed field)
    let itemsWithStatus = items.map((checkout) => {
      const returnedCount = checkout.items.filter((item) => item.returnedAt !== null).length;
      const totalCount = checkout.items.length;
      
      let computedStatus = 'ACTIVE';
      if (checkout.deletedAt) {
        computedStatus = 'CANCELLED';
      } else if (returnedCount === totalCount && totalCount > 0) {
        computedStatus = 'RETURNED';
      } else if (returnedCount > 0 && returnedCount < totalCount) {
        computedStatus = 'PARTIAL_RETURN';
      }

      return {
        ...checkout,
        status: computedStatus,
      };
    });

    // Filter by status if provided (after computing status)
    let filteredTotal = total;
    if (status) {
      // If filtering by status, we need to get all items to count properly
      // For better performance, we could cache this or use a different approach
      const allItems = await prisma.checkout.findMany({
        where,
        include: {
          items: {
            select: { id: true, returnedAt: true },
          },
        },
      });

      const allItemsWithStatus = allItems.map((checkout) => {
        const returnedCount = checkout.items.filter((item) => item.returnedAt !== null).length;
        const totalCount = checkout.items.length;
        
        let computedStatus = 'ACTIVE';
        if (checkout.deletedAt) {
          computedStatus = 'CANCELLED';
        } else if (returnedCount === totalCount && totalCount > 0) {
          computedStatus = 'RETURNED';
        } else if (returnedCount > 0 && returnedCount < totalCount) {
          computedStatus = 'PARTIAL_RETURN';
        }

        return {
          ...checkout,
          status: computedStatus,
        };
      });

      filteredTotal = allItemsWithStatus.filter((item) => item.status === status).length;
      itemsWithStatus = itemsWithStatus.filter((item) => item.status === status);
      // Limit to requested limit after filtering
      itemsWithStatus = itemsWithStatus.slice(0, parseInt(limit));
    }

    return {
      success: true,
      data: itemsWithStatus,
      total: filteredTotal,
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

    // Verify devices exist and are available
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, deviceCode: true, name: true, maintenanceStatus: true },
    });

    if (devices.length !== deviceIds.length) {
      return reply.code(400).send({
        error: 'Some devices not found',
      });
    }

    // Check if any selected device is currently in use or in maintenance
    const { getDeviceBorrowStatus } = await import('../services/device-status.service.js');
    const unavailableDevices = await Promise.all(
      devices.map(async (device) => {
        const borrowStatus = await getDeviceBorrowStatus(device.id);
        if (borrowStatus !== 'AVAILABLE') {
          return { deviceCode: device.deviceCode, borrowStatus };
        }
        return null;
      }),
    );

    const problematicDevices = unavailableDevices.filter(Boolean);

    if (problematicDevices.length > 0) {
      const messages = problematicDevices.map(
        (d) => `Device ${d.deviceCode} is currently ${d.borrowStatus === 'IN_USE' ? 'in use' : 'in maintenance'}.`,
      );
      return reply.code(400).send({
        error: 'Some selected devices are not available for checkout.',
        details: messages,
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
          charger: charger || null,
          startTime: startTime ? new Date(startTime) : new Date(),
          endTime: endTime ? new Date(endTime) : null,
          usageNotes: usageNotes || null,
          createdBy: currentUser.id,
          items: {
            create: deviceIds.map((deviceId) => ({
              deviceId,
            })),
          },
          events: {
            create: {
              eventType: 'CREATED',
              userId: currentUser.id,
              notes: `Checkout ${checkoutNumber} created by ${currentUser.username}`,
              newData: {
                company,
                borrowerId,
                deviceIds,
              },
            },
          },
        },
      });

      // Broadcast borrow status for affected devices
      await onCheckoutCreated(created.id, deviceIds);

      return created;
    });

    return {
      success: true,
      data: checkout,
      message: 'Checkout created successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error creating checkout');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get checkout by ID
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

    // Calculate status (computed field)
    const returnedCount = checkout.items.filter((item) => item.returnedAt !== null).length;
    const totalCount = checkout.items.length;
    
    let status = 'ACTIVE';
    if (checkout.deletedAt) {
      status = 'CANCELLED';
    } else if (returnedCount === totalCount && totalCount > 0) {
      status = 'RETURNED';
    } else if (returnedCount > 0 && returnedCount < totalCount) {
      status = 'PARTIAL_RETURN';
    }

    return {
      success: true,
      data: {
        ...checkout,
        status,
      },
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
      items, // Array of { itemId, problem?, solution?, maintenanceStatus?, returnNotes? }
      // Backward compatibility
      itemIds,
      problem,
      solution,
      maintenanceStatus,
      returnNotes,
    } = request.body;

    // Support both new format (items array) and old format (itemIds array)
    let itemsToReturn = [];
    if (items && Array.isArray(items) && items.length > 0) {
      // New format: items array with per-item data
      itemsToReturn = items;
    } else if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      // Old format: itemIds array with single problem/solution
      itemsToReturn = itemIds.map((itemId) => ({
        itemId,
        problem: problem || null,
        solution: solution || null,
        maintenanceStatus: maintenanceStatus || null,
        returnNotes: returnNotes || null,
      }));
    } else {
      return reply.code(400).send({
        error: 'items or itemIds is required and must be a non-empty array',
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

    const itemIdMap = new Map(itemsToReturn.map((item) => [item.itemId, item]));
    const targetItems = checkout.items.filter((item) => itemIdMap.has(item.id));

    if (targetItems.length === 0) {
      return reply.code(400).send({
        error: 'No matching checkout items found',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Update each item with its specific data
      const updatedItems = await Promise.all(
        targetItems.map(async (item) => {
          const itemData = itemIdMap.get(item.id);
          const maintenanceStatus = itemData.maintenanceStatus ?? item.maintenanceStatus ?? null;

          // Update CheckoutItem
          const updatedItem = await tx.checkoutItem.update({
            where: { id: item.id },
            data: {
              returnedAt: item.returnedAt || now,
              returnedBy: item.returnedBy || currentUser.id,
              problem: itemData.problem ?? item.problem ?? null,
              solution: itemData.solution ?? item.solution ?? null,
              maintenanceStatus: maintenanceStatus,
              returnNotes: itemData.returnNotes ?? returnNotes ?? item.returnNotes ?? null,
            },
          });

          // Update Device maintenanceStatus if maintenance status is set
          if (maintenanceStatus && maintenanceStatus !== 'NONE') {
            await tx.device.update({
              where: { id: item.deviceId },
              data: {
                maintenanceStatus: maintenanceStatus,
              },
            });
          } else if (maintenanceStatus === null || maintenanceStatus === 'NONE') {
            // ถ้าไม่มีปัญหา → ตั้งเป็น NONE
            await tx.device.update({
              where: { id: item.deviceId },
              data: {
                maintenanceStatus: 'NONE',
              },
            });
          }

          return updatedItem;
        }),
      );

      // Create event
      await tx.checkoutEvent.create({
        data: {
          checkoutId: checkout.id,
          eventType: 'ITEM_RETURNED',
          userId: currentUser.id,
          notes: `Returned ${updatedItems.length} devices`,
          newData: {
            itemIds: targetItems.map((item) => item.id),
            items: updatedItems.map((item) => ({
              itemId: item.id,
              deviceId: item.deviceId,
              problem: item.problem,
              maintenanceStatus: item.maintenanceStatus,
            })),
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
        itemIds: targetItems.map((item) => item.id),
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

/**
 * Cancel a checkout
 * POST /api/checkouts/:id/cancel
 */
export async function cancelCheckout(request, reply) {
  try {
    const { id } = request.params;
    const { reason } = request.body; // Optional cancellation reason

    const currentUser = request.user;

    const checkout = await prisma.checkout.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            deviceId: true,
            returnedAt: true,
          },
        },
      },
    });

    if (!checkout) {
      return reply.code(404).send({
        error: 'Checkout not found',
      });
    }

    if (checkout.deletedAt) {
      return reply.code(400).send({
        error: 'Checkout is already cancelled',
      });
    }

    // Check if all items are already returned
    const returnedCount = checkout.items.filter((item) => item.returnedAt !== null).length;
    const totalCount = checkout.items.length;

    if (returnedCount === totalCount && totalCount > 0) {
      return reply.code(400).send({
        error: 'Cannot cancel checkout that is already fully returned',
      });
    }

    // Cancel checkout (soft delete)
    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.checkout.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Create cancellation event
      await tx.checkoutEvent.create({
        data: {
          checkoutId: checkout.id,
          eventType: 'CANCELLED',
          userId: currentUser.id,
          notes: reason || `Checkout cancelled by ${currentUser.username}`,
          newData: {
            cancelledAt: updated.deletedAt,
            reason: reason || null,
          },
        },
      });

      return updated;
    });

    // Broadcast borrow status for affected devices
    const deviceIds = checkout.items
      .filter((item) => item.returnedAt === null) // Only active items
      .map((item) => item.deviceId);
    
    const uniqueDeviceIds = [...new Set(deviceIds)];
    await Promise.all(
      uniqueDeviceIds.map((deviceId) => onDeviceReturned(deviceId))
    );

    await createAuditLog(request, 'CHECKOUT_CANCEL', 'CHECKOUT', checkout.id, {
      checkoutNumber: checkout.checkoutNumber,
      reason: reason || null,
    });

    return {
      success: true,
      data: cancelled,
      message: 'Checkout cancelled successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Error cancelling checkout');
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
