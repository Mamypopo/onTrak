import { google } from 'googleapis';
import { config } from '../config/index.js';
import logger from './logger.js';
import { setTimeout } from 'timers/promises';

let androidManagementClient = null;

/**
 * Creates an authenticated Android Management API client.
 * @returns {Promise<import('googleapis').androidmanagement_v1.Androidmanagement | null>}
 */
export async function getAndroidManagementClient() {
  if (androidManagementClient) {
    return androidManagementClient;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 150;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!config.google.serviceAccountKeyPath) {
        throw new Error('SERVICE_ACCOUNT_KEY_PATH is not set in the .env file.');
      }

      if (!config.google.serviceAccountKeyPath.endsWith('.json')) {
        logger.warn(`The service account key file "${config.google.serviceAccountKeyPath}" does not end with .json. Please ensure it's correct.`);
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: config.google.serviceAccountKeyPath,
        scopes: ['https://www.googleapis.com/auth/androidmanagement'],
      });

      const client = google.androidmanagement({
        version: 'v1',
        auth: auth,
      });

      // Critical Check: Ensure the client is fully initialized before returning.
      // Sometimes the client object is created but its properties (like 'enterprises') are not yet populated.
      if (!client || !client.enterprises) {
        throw new Error('Google API client was created but is not fully initialized (missing enterprises).');
      }

      // Store the client for future use
      androidManagementClient = client;
      logger.info({ attempt }, 'Successfully created and cached Google Android Management API client.');
      return androidManagementClient;

    } catch (error) {
      const errorMessage = error.message || 'Unknown error during client creation.';
      logger.warn({ error: errorMessage, attempt }, 'Attempt to create Google API client failed. Retrying...');
      androidManagementClient = null; // Clear potentially broken client

      if (attempt === MAX_RETRIES) {
        const finalErrorMessage = 'Failed to create Google API client after multiple retries. Please check SERVICE_ACCOUNT_KEY_PATH and API permissions.';
        logger.error({ error: errorMessage }, finalErrorMessage);
        throw new Error(finalErrorMessage);
      }

      await setTimeout(RETRY_DELAY_MS * attempt); // Wait a bit longer each time
    }
  }
}

/**
 * Resets the cached Android Management API client, forcing it to be re-created on the next call.
 */
export function resetAndroidManagementClient() {
  logger.info('Resetting cached Android Management API client.');
  androidManagementClient = null;
}