# OnTrak MDM Backend

Backend server for OnTrak MDM System - Node.js with Fastify, MQTT, PostgreSQL, and WebSocket.

## Features

- ✅ Fastify HTTP server
- ✅ MQTT client (subscribe/publish)
- ✅ PostgreSQL database with Prisma ORM
- ✅ WebSocket realtime communication
- ✅ JWT authentication
- ✅ RESTful API routes
- ✅ Logging and monitoring

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- MQTT Broker (EMQX or Mosquitto)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

4. **Start server:**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MQTT_BROKER_URL` - MQTT broker URL

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/verify` - Verify JWT token

### Devices
- `GET /api/device` - Get all devices
- `GET /api/device/:id` - Get device by ID
- `POST /api/device/:id/command` - Send command to device
- `POST /api/device/:id/borrow` - Borrow device
- `POST /api/device/:id/return` - Return device
- `GET /api/device/:id/history` - Get device history

### WebSocket
- `WS /ws` - WebSocket connection for realtime updates

### Health Check
- `GET /health` - Server health status

## MQTT Topics

### Subscribe (from Tablet):
- `tablet/{deviceId}/status` - Device status updates
- `tablet/{deviceId}/location` - GPS location updates
- `tablet/{deviceId}/metrics` - System metrics
- `tablet/{deviceId}/event` - Device events

### Publish (to Tablet):
- `tablet/{deviceId}/command` - Remote commands

## Database Schema

See `prisma/schema.prisma` for complete schema definition.

### Models:
- `Device` - Device information and status
- `DeviceMetrics` - System metrics history
- `BorrowRecord` - Device borrow/return records
- `DeviceActionLog` - Action history logs

## Development

```bash
# Watch mode
npm run dev

# Database studio
npm run db:studio

# Generate Prisma client
npm run db:generate
```

## Production

```bash
# Build
npm install --production

# Run migrations
npm run db:migrate

# Start server
npm start
```

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Check database exists

### MQTT Connection Error
- Check MQTT broker is running
- Verify `MQTT_BROKER_URL` in `.env`
- Check network connectivity

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process using port 3000

## Next Steps

- Phase 3: Dashboard (Next.js 14)
- Phase 4: User / Auth / RBAC
- Phase 5: Deployment (Docker Compose)

