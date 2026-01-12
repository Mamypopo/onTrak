import * as enterpriseController from "../controllers/enterprise.controller.js";

async function enterpriseRoutes(fastify, options) {
  // Step 3: Get Web Token for Managed Play iFrame
  fastify.post(
    "/managed-play-token",
    {
      preHandler: [fastify.authenticate, fastify.requireRole(["ADMIN", "STAFF"])],
    },
    enterpriseController.getManagedPlayToken
  );

  // Step 4: Update App Policy for devices
  fastify.post(
    "/deploy-app-policy",
    {
      preHandler: [fastify.authenticate, fastify.requireRole(["ADMIN", "STAFF"])],
    },
    enterpriseController.deployAppPolicy
  );

  // Step 5: Get list of approved apps
  fastify.get(
    "/approved-apps",
    {
      preHandler: [fastify.authenticate, fastify.requireRole(["ADMIN", "STAFF"])],
    },
    enterpriseController.getApprovedApps
  );
}

export default enterpriseRoutes;