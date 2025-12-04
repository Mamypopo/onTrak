import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import mqttClient from './mqtt/client.js';
import { setupMQTTHandlers } from './mqtt/handlers.js';
import { addClient } from './websocket/server.js';
import { startLocationHistoryCleanup } from './jobs/cleanup.js';
import { authenticate } from './middleware/auth.js';
import { requireRole } from './middleware/rbac.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import userRoutes from './routes/users.js';
import checkoutRoutes from './routes/checkouts.js';

// Create Fastify instance
const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  } : true,
});

// Register plugins
await fastify.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
});

await fastify.register(websocket);

// Register authentication middleware
fastify.decorate('authenticate', authenticate);
fastify.decorate('requireRole', requireRole);

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(deviceRoutes, { prefix: '/api/device' });
await fastify.register(userRoutes, { prefix: '/api/user' });
await fastify.register(checkoutRoutes, { prefix: '/api/checkouts' });

// WebSocket endpoint
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    logger.info('WebSocket connection attempt');
    
    // In @fastify/websocket, the connection object itself is the WebSocket
    // But it might be wrapped, so try both connection.socket and connection
    let socket = null;
    
    // Check if connection has socket property (Fastify WebSocket v11+)
    if (connection.socket && typeof connection.socket.send === 'function') {
      socket = connection.socket;
    } 
    // Check if connection itself is the socket
    else if (typeof connection.send === 'function') {
      socket = connection;
    }
    // Try to access through getSocket if available
    else if (typeof connection.getSocket === 'function') {
      socket = connection.getSocket();
    }
    
    if (!socket) {
      logger.error({ 
        connectionKeys: Object.keys(connection),
        hasSocket: !!connection.socket,
        hasSend: typeof connection.send === 'function'
      }, 'WebSocket socket is undefined - connection structure');
      return;
    }
    
    addClient(socket);
    
    // Send welcome message when ready
    const sendWelcome = () => {
      try {
        socket.send(JSON.stringify({
          type: 'connected',
          message: 'WebSocket connected successfully'
        }));
      } catch (error) {
        logger.error({ error }, 'Error sending welcome message');
      }
    };
    
    if (socket.readyState === 1) { // WebSocket.OPEN
      sendWelcome();
    } else if (typeof socket.on === 'function') {
      socket.on('open', sendWelcome);
    } else {
      // If no event listener, try sending anyway after a short delay
      setTimeout(sendWelcome, 100);
    }
  });
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mqtt: {
      connected: mqttClient.isConnectedStatus(),
    },
  };
});

// Start server
const start = async () => {
  try {
    // Connect MQTT
    mqttClient.connect();
    setupMQTTHandlers();

    // Start cron jobs
    startLocationHistoryCleanup();

    // Start server
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port }, 'Server started');
  } catch (error) {
    logger.error({ error }, 'Error starting server');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  mqttClient.disconnect();
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  mqttClient.disconnect();
  await fastify.close();
  process.exit(0);
});

start();

