// c:\Users\Porameth.P\Documents\GitHub\onTrak\backend\src\controllers\enterprise.controller.js

import { getAndroidManagementClient, resetAndroidManagementClient } from '../utils/googleApi.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

// Step 3: Get Web Token for iFrame
export async function getManagedPlayToken(req, reply) {
  try {
    const androidManagement = await getAndroidManagementClient();
    const enterpriseId = config.google.enterpriseId;

    if (!androidManagement) {
      logger.error('Could not get Android Management client. It might not have been initialized correctly.');
      return reply.status(500).send({ message: "Internal server error: Failed to initialize Google API client." });
    }

    if (!enterpriseId) {
      return reply.status(500).send({ message: "Enterprise ID is not configured on the server." });
    }

    const { parentFrameUrl } = req.body;

    // Google API requires the parentFrameUrl to be HTTPS.
    if (!parentFrameUrl || !parentFrameUrl.startsWith('https://')) {
      return reply.status(400).send({ message: "Invalid request: 'parentFrameUrl' must be a valid HTTPS URL." });
    }

    // This structure is the most reliable way to pass parameters to the googleapis library.
    // 'parent' is a path parameter for the URL, and 'requestBody' contains the POST data.
    const response = await androidManagement.enterprises.webTokens.create({
      parent: enterpriseId,
      requestBody: {
        parentFrameUrl: parentFrameUrl, // Use the URL from the request body
        enabledFeatures: [
          'PLAY_SEARCH',
          'PRIVATE_APPS',
          'WEB_APPS',
          'STORE_BUILDER',
        ],
      },
    });

    reply.send({ webToken: response.data.value });
  } catch (error) {
    // Extract a more specific error message from the Google API response if available.
    const errorMessage = error.response?.data?.error?.message || error.message;
    logger.error({ error: error.response?.data || error.message }, 'Failed to create web token for Managed Play iFrame');
    reply.status(error.response?.status || 500).send({ message: "Failed to generate Managed Play token.", error: errorMessage });
  }
}

// Step 4: Deploy App Policy
export async function deployAppPolicy(req, reply) {
  try {
    const { policyId = 'default', policyBody } = req.body;
    const enterpriseId = config.google.enterpriseId;

    if (!enterpriseId) {
      return reply.status(500).send({ message: "Enterprise ID is not configured on the server." });
    }

    if (!policyBody || typeof policyBody !== 'object') {
      return reply.status(400).send({ message: "Request body must include a 'policyBody' object." });
    }

    const androidManagement = await getAndroidManagementClient();
    if (!androidManagement) {
      logger.error('Could not get Android Management client. It might not have been initialized correctly.');
      return reply.status(500).send({ message: "Internal server error: Failed to initialize Google API client." });
    }

    const policyName = `${enterpriseId}/policies/${policyId}`;
    // For this specific endpoint, we are only updating the 'applications' part of the policy.
    // Using a fixed updateMask is safer and clearer. If you expand this function
    // to update other policy parts, you can make the updateMask dynamic again.
    // const updateMask = Object.keys(policyBody).join(',');
    const updateMask = 'applications';

    logger.info({ policyName, policyBody, updateMask }, 'Attempting to patch policy');

    const response = await androidManagement.enterprises.policies.patch({
      name: policyName,
      updateMask: updateMask,
      requestBody: policyBody,
    });

    logger.info({ policy: response.data }, 'Policy patched successfully');
    reply.send({
      message: `Policy '${policyId}' updated successfully.`,
      updatedPolicy: response.data,
    });

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    logger.error({ error: error.response?.data || error.message }, 'Failed to deploy app policy');
    reply.status(error.response?.status || 500).send({ message: "Failed to deploy app policy.", error: errorMessage });
  }
}

// Step 5: Get Approved Apps
export async function getApprovedApps(req, reply) {
  try {
    const enterpriseId = config.google.enterpriseId;
    if (!enterpriseId) {
      return reply.status(500).send({ message: "Enterprise ID is not configured on the server." });
    }

    const androidManagement = await getAndroidManagementClient();
    if (!androidManagement) {
      // This case should now be rare because getAndroidManagementClient has its own retry logic.
      logger.error('Could not get Android Management client. It might not have been initialized correctly.');
      return reply.status(500).send({ message: "Internal server error: Google API client is not ready." });
    }

    // Defensive check: Even if the client is created, the 'products' property might be missing in rare cases.
    if (!androidManagement.enterprises.products) {
      logger.error('Android Management client is missing the "products" property.');
      return reply.status(500).send({ message: "Internal server error: Google API client is incomplete." });
    }

    let approvedApps = [];
    let nextPageToken = undefined;

    do {
      const response = await androidManagement.enterprises.products.list({
        parent: enterpriseId,
        pageSize: 100, // Fetch up to 100 apps per page
        pageToken: nextPageToken,
      });

      if (response.data && response.data.products) {
        const products = response.data.products
          .map(product => {
            // Ensure the product is a valid, fully populated app entry.
            // Sometimes the API returns products without app versions if they are still processing.
            if (!product || !product.name || !product.appVersion) {
              return null;
            }

            // The product name is in the format "enterprises/{enterpriseId}/products/app:{packageName}"
            // For web apps, it's "enterprises/{enterpriseId}/products/webApp:{packageName}"
            const appPrefix = '/products/app:';
            const webAppPrefix = '/products/webApp:';
            let packageName = null;

            if (product.name.includes(appPrefix)) {
              packageName = product.name.split(appPrefix)[1];
            } else if (product.name.includes(webAppPrefix)) {
              packageName = product.name.split(webAppPrefix)[1];
            }
            if (!packageName) return null; // Skip if we can't determine a package name

            return {
              productId: product.name,
              packageName: packageName,
              title: product.title,
              iconUrl: product.smallIconUrl,
            };
          })
          .filter(app => app !== null); // Filter out any null entries
        approvedApps.push(...products);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    reply.send(approvedApps);

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    logger.error({ error: error.response?.data || error.message }, 'Failed to get approved apps');
    reply.status(error.response?.status || 500).send({
      message: "Failed to fetch approved apps.",
      error: errorMessage
    });
  }
}
