import { config, updateEnterpriseId } from '../config/index.js';
import logger from './logger.js';
import { getAndroidManagementClient } from './googleApi.js';
import prisma from '../db/client.js';

/**
 * Checks for the Enterprise ID in the database. If not found, it creates a new
 * one, stores it in the database, and updates the runtime config.
 */
export async function checkAndEnrollEnterprise() {
  // 1. Try to find the enterprise ID in the database
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'GOOGLE_ENTERPRISE_ID' },
  });

  if (setting) {
    logger.info(`Found Google Enterprise ID in database: ${setting.value}`);
    // Update the runtime config with the ID from the database
    updateEnterpriseId(setting.value);
    return;
  }

  // If GOOGLE_ENTERPRISE_ID is in .env (for backward compatibility or manual override),
  // use it and save to DB.
  if (config.google.enterpriseId) {
    logger.warn('Found GOOGLE_ENTERPRISE_ID in .env file but not in database. Saving to database for future use.');
    await prisma.systemSetting.create({
      data: { key: 'GOOGLE_ENTERPRISE_ID', value: config.google.enterpriseId },
    });
    return;
  }

  logger.warn('GOOGLE_ENTERPRISE_ID not found in database or .env file.');
  logger.info('Attempting to create a new enterprise...');

  if (!config.google.projectId || !config.google.serviceAccountKeyPath) {
    logger.error('Missing GOOGLE_PROJECT_ID or SERVICE_ACCOUNT_KEY_PATH in .env file. Cannot create enterprise.');
    process.exit(1);
  }

  try {
    const androidManagement = await getAndroidManagementClient();
    // If the client fails to initialize, log the error and exit.
    if (!androidManagement) {
      logger.error('❌ Failed to initialize Google API client during enterprise setup. Please check previous logs for details.');
      process.exit(1);
    }

    // The googleapis library expects query parameters at the top level
    // and the request body inside a 'requestBody' property.
    const enterprise = await androidManagement.enterprises.create({
      projectId: config.google.projectId,
      agreementAccepted: true,
      requestBody: {
        enterpriseDisplayName: 'onTrak Managed Organisation',
      },
    });

    const newEnterpriseId = enterprise.data.name;
    logger.info('✅ Enterprise created successfully!');

    // 3. Store the new ID in the database
    await prisma.systemSetting.create({
      data: {
        key: 'GOOGLE_ENTERPRISE_ID',
        value: newEnterpriseId,
      },
    });
    logger.info(`New Enterprise ID ${newEnterpriseId} has been saved to the database.`);

    // 4. Update the runtime config so the server can continue running
    updateEnterpriseId(newEnterpriseId);

  } catch (error) {
    logger.error({ error: error.response?.data || error.message }, '❌ Failed to create and save enterprise. Please check your GOOGLE_PROJECT_ID and SERVICE_ACCOUNT_KEY_PATH.');
    process.exit(1); // Exit because the setup failed
  }
}