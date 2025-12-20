import prisma from '../db/client.js';
import logger from '../utils/logger.js';

/**
 * Get all bulk command states and format them as a key-value object.
 * @returns {Promise<Record<string, any>>}
 */
export async function getBulkCommandStates() {
  try {
    const states = await prisma.bulkCommandState.findMany();
    const formattedStates = states.reduce((acc, state) => {
      acc[state.key] = state.value;
      return acc;
    }, {});
    return formattedStates;
  } catch (error) {
    logger.error({ error }, 'Error fetching bulk command states');
    throw new Error('Could not fetch bulk command states');
  }
}

/**
 * Save or update bulk command states.
 * @param {Record<string, any>} states - The states to save, e.g., { 'security.kiosk': true }
 * @returns {Promise<void>}
 */
export async function saveBulkCommandStates(states) {
  if (!states || typeof states !== 'object' || Object.keys(states).length === 0) {
    throw new Error('Invalid states object provided');
  }

  try {
    const operations = Object.entries(states).map(([key, value]) => {
      return prisma.bulkCommandState.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    });

    await prisma.$transaction(operations);
    logger.info('Bulk command states saved successfully.');
  } catch (error) {
    logger.error({ error, states }, 'Error saving bulk command states');
    throw new Error('Could not save bulk command states');
  }
}
