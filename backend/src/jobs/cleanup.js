import cron from 'node-cron';
import prisma from '../db/client.js';
import logger from '../utils/logger.js';

/**
 * Cleanup old location history records
 * ลบข้อมูล location history ที่เก่ากว่า 7 วัน
 * รันทุกวันเวลา 02:00 AM
 */
export function startLocationHistoryCleanup() {
  // รันทุกวันเวลา 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting location history cleanup...');
      
      const daysToKeep = 7; // เก็บข้อมูล 7 วัน
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // ลบข้อมูลเก่ากว่า 7 วัน
      const result = await prisma.deviceLocationHistory.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info({ 
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
      }, 'Location history cleanup completed');
    } catch (error) {
      logger.error({ error }, 'Error during location history cleanup');
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Bangkok', // ใช้ timezone ไทย
  });

  logger.info('Location history cleanup job scheduled (runs daily at 02:00 AM)');
}

/**
 * Manual cleanup function (for testing)
 */
export async function cleanupLocationHistory(daysToKeep = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.deviceLocationHistory.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info({ 
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
      daysToKeep,
    }, 'Manual location history cleanup completed');

    return result;
  } catch (error) {
    logger.error({ error }, 'Error during manual location history cleanup');
    throw error;
  }
}

