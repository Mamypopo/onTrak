import { Router } from 'express';
import * as bulkCommandController from '../controllers/bulkCommand.controller.js';
import { protect, authorize } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = Router();

// You might want to protect these routes so only logged-in users can access them.
// Using authorize('ADMIN', 'STAFF') to allow both roles.
router.route('/states')
  .get(protect, authorize('ADMIN', 'STAFF'), bulkCommandController.getStates)
  .post(protect, authorize('ADMIN', 'STAFF'), bulkCommandController.saveStates);

export default router;
