import mqtt from 'mqtt';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
  }

  connect() {
    const options = {
      clientId: config.mqtt.clientId,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (config.mqtt.username) {
      options.username = config.mqtt.username;
      options.password = config.mqtt.password;
    }

    this.client = mqtt.connect(config.mqtt.brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('MQTT client connected');
      this.resubscribeAll();
    });

    this.client.on('error', (error) => {
      logger.error({ error }, 'MQTT client error');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('MQTT client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      logger.info('MQTT client reconnecting...');
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    return this.client;
  }

  subscribe(topic, handler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, handler);
      
      if (this.isConnected && this.client) {
        this.client.subscribe(topic, (err) => {
          if (err) {
            logger.error({ error: err, topic }, 'Failed to subscribe to topic');
          } else {
            logger.info({ topic }, 'Subscribed to topic');
          }
        });
      }
    } else {
      // Update handler if topic already subscribed
      this.subscriptions.set(topic, handler);
    }
  }

  unsubscribe(topic) {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.delete(topic);
      
      if (this.isConnected && this.client) {
        this.client.unsubscribe(topic, (err) => {
          if (err) {
            logger.error({ error: err, topic }, 'Failed to unsubscribe from topic');
          } else {
            logger.info({ topic }, 'Unsubscribed from topic');
          }
        });
      }
    }
  }

  resubscribeAll() {
    for (const [topic] of this.subscriptions) {
      if (this.client) {
        this.client.subscribe(topic, (err) => {
          if (err) {
            logger.error({ error: err, topic }, 'Failed to resubscribe to topic');
          } else {
            logger.info({ topic }, 'Resubscribed to topic');
          }
        });
      }
    }
  }

  handleMessage(topic, message) {
    const handler = this.subscriptions.get(topic);
    if (handler) {
      try {
        const data = JSON.parse(message.toString());
        handler(topic, data);
      } catch (error) {
        logger.error({ error, topic }, 'Failed to parse MQTT message');
      }
    } else {
      logger.warn({ topic }, 'No handler found for topic');
    }
  }

  publish(topic, message, options = {}) {
    if (!this.isConnected || !this.client) {
      logger.warn({ topic }, 'MQTT client not connected, cannot publish');
      return false;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const publishOptions = {
      qos: options.qos || 1,
      retain: options.retain || false,
    };

    this.client.publish(topic, payload, publishOptions, (error) => {
      if (error) {
        logger.error({ error, topic }, 'Failed to publish message');
      } else {
        logger.debug({ topic }, 'Published message to topic');
      }
    });

    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      logger.info('MQTT client disconnected');
    }
  }

  isConnectedStatus() {
    return this.isConnected;
  }
}

// Singleton instance
const mqttClient = new MQTTClient();

export default mqttClient;

