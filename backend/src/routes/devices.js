import * as deviceController from "../controllers/device.controller.js";

async function deviceRoutes(fastify, options) {
  // Create a new device
  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'STAFF'])],
    },
    deviceController.createDevice
  );

  // Get all devices
  fastify.get(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.getAllDevices
  );

  // Get device by ID
  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.getDeviceById
  );

  // Get device location history
  fastify.get(
    "/:id/location-history",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.getDeviceLocationHistory
  );

  // Calculate route for device location history
  fastify.get(
    "/:id/route",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.calculateDeviceRoute
  );

  // Send command to device
  fastify.post(
    "/:id/command",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.sendCommand
  );

  // Get device history
  fastify.get(
    "/:id/history",
    {
      preHandler: [fastify.authenticate],
    },
    deviceController.getDeviceHistory
  );

  
}

export default deviceRoutes;
