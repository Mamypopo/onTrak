import * as checkoutController from '../controllers/checkout.controller.js';

async function checkoutRoutes(fastify, options) {
  // List checkouts
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    checkoutController.listCheckouts,
  );

  // Create checkout
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    checkoutController.createCheckout,
  );

  // Get checkout detail
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    checkoutController.getCheckoutById,
  );

  // Return devices in a checkout
  fastify.post(
    '/:id/return',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    checkoutController.returnDevices,
  );

  // Cancel a checkout
  fastify.post(
    '/:id/cancel',
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    checkoutController.cancelCheckout,
  );
}

export default checkoutRoutes;


