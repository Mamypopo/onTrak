'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    const url = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3001'
    socket = io(url, {
      transports: ['websocket'],
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

