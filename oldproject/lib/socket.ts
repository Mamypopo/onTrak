import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io
  }

  const port = process.env.PORT || '3007'
  const origin = process.env.NEXTAUTH_URL || `http://localhost:${port}`
  
  io = new SocketIOServer(server, {
    cors: {
      origin: origin.includes('localhost') ? `http://localhost:${port}` : origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Performance optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
    perMessageDeflate: {
      threshold: 1024,
    },
  })

  io.on('connection', (socket) => {
    console.log('[Socket Server] Client connected:', socket.id)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Server] Client ${socket.id} disconnected:`, reason)
    })

    socket.on('join:work', (workId: string) => {
      if (!workId || typeof workId !== 'string') {
        console.warn('[Socket Server] Invalid workId:', workId)
        return
      }
      
      const room = `work:${workId}`
      
      // Check if already in room (prevent duplicate joins)
      const rooms = Array.from(socket.rooms)
      if (rooms.includes(room)) {
        // Silently skip - don't log to reduce noise
        return
      }
      
      socket.join(room)
      console.log(`[Socket Server] Client ${socket.id} joined ${room}`)
    })

    socket.on('leave:work', (workId: string) => {
      if (!workId || typeof workId !== 'string') return
      
      const room = `work:${workId}`
      
      // Check if in room before leaving
      const rooms = Array.from(socket.rooms)
      if (!rooms.includes(room)) {
        // Silently skip - don't log to reduce noise
        return
      }
      
      socket.leave(room)
      console.log(`[Socket Server] Client ${socket.id} left ${room}`)
    })

    socket.on('error', (error) => {
      console.error(`[Socket Server] Error for client ${socket.id}:`, error)
    })
  })

  // Store in global for fallback access
  if (typeof global !== 'undefined') {
    (global as any).io = io
  }

  return io
}

export function getSocketIO() {
  if (!io) {
    // Try to get from global as fallback
    if (typeof global !== 'undefined' && (global as any).io) {
      return (global as any).io
    }
    throw new Error('Socket.IO not initialized. Call initializeSocket() first.')
  }
  return io
}

/**
 * Emit a socket event from API routes
 * Tries to use getSocketIO() first, falls back to global.io
 */
export function emitSocketEvent(eventName: string, data?: any) {
  try {
    const socketIO = getSocketIO()
    socketIO.emit(eventName, data)
    return true
  } catch (error) {
    // Fallback to global.io
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit(eventName, data)
      return true
    }
    console.warn(`[Socket] Failed to emit ${eventName}: Socket.IO not available`)
    return false
  }
}

/**
 * Emit to specific work room
 */
export function emitToWork(workId: string, event: string, data: any) {
  try {
    const socketIO = getSocketIO()
    socketIO.to(`work:${workId}`).emit(event, data)
    return true
  } catch (error) {
    // Fallback to global.io
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.to(`work:${workId}`).emit(event, data)
      return true
    }
    console.warn(`[Socket] Failed to emit ${event} to work:${workId}`)
    return false
  }
}

/**
 * Emit to all clients
 */
export function emitToAll(event: string, data: any) {
  return emitSocketEvent(event, data)
}
