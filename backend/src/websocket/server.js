import logger from '../utils/logger.js';

// Store all connected WebSocket clients
const clients = new Set();

/**
 * Add WebSocket client
 */
export function addClient(ws) {
  if (!ws) {
    logger.error('WebSocket client is undefined');
    return;
  }

  clients.add(ws);
  logger.info({ clientCount: clients.size }, 'WebSocket client connected');

  // Only add event listeners if they exist
  if (typeof ws.on === 'function') {
    ws.on('close', () => {
      clients.delete(ws);
      logger.info({ clientCount: clients.size }, 'WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket client error');
      clients.delete(ws);
    });
  } else {
    logger.warn('WebSocket client does not support event listeners');
  }
}

/**
 * Broadcast message to all connected clients
 */
export function broadcastToDashboard(message) {
  if (clients.size === 0) {
    return;
  }

  const data = JSON.stringify(message);
  let sentCount = 0;

  clients.forEach((client) => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
        sentCount++;
      } else {
        // Remove closed clients
        clients.delete(client);
      }
    } catch (error) {
      logger.error({ error }, 'Error sending WebSocket message');
      clients.delete(client);
    }
  });

  if (sentCount > 0) {
    logger.debug({ sentCount, messageType: message.type }, 'Broadcasted message to dashboard');
  }
}

/**
 * Get connected clients count
 */
export function getClientCount() {
  return clients.size;
}

