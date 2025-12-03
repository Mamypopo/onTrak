import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export function getSocketIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

/**
 * Emit a socket event from API routes
 * Tries to use getSocketIO() first, falls back to global.io
 * @param eventName - The event name to emit
 * @param data - The data to send with the event
 */
export function emitSocketEvent(eventName: string, data?: any) {
  try {
    // Try to use getSocketIO first (preferred method)
    const io = getSocketIO()
    io.emit(eventName, data)
    return true
  } catch (error) {
    // Fallback to global.io (for server.js setup)
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit(eventName, data)
      return true
    }
    console.error(`[Socket] Failed to emit ${eventName}: Socket.IO not available`)
    return false
  }
}

