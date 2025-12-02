'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null

  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
    
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    })

    // Event listeners
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      if (reason === 'io server disconnect') {
        socket?.connect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// React hook for convenience
export function useSocket() {
  return getSocket()
}
