import * as bulkCommandService from '../services/bulkCommand.service.js';
import logger from '../utils/logger.js';

/**
 * GET /api/bulk-command/states
 * Get all bulk command states.
 */
export async function getStates(req, res) {
  try {
    const states = await bulkCommandService.getBulkCommandStates();
    res.json({ success: true, data: states });
  } catch (error) {
    logger.error({ error }, 'Failed to get bulk command states');
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bulk-command/states
 * Save bulk command states.
 */
export async function saveStates(req, res) {
  const { states } = req.body;
  if (!states) {
    return res.status(400).json({ success: false, error: 'Missing states object in request body' });
  }

  try {
    await bulkCommandService.saveBulkCommandStates(states);
    res.status(201).json({ success: true, message: 'States saved successfully' });
  } catch (error) {
    logger.error({ error }, 'Failed to save bulk command states');
    res.status(500).json({ success: false, error: error.message });
  }
}
