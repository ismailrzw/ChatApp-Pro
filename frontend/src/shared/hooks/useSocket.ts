import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../../features/auth/authStore'

let socketInstance: Socket | null = null

export function useSocket() {
  const { idToken, user } = useAuthStore()

  useEffect(() => {
    if (!idToken || !user) {
      if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
      }
      return
    }

    // Create singleton socket connection
    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token: idToken },   // passed to backend connect handler
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
      
      socketInstance.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message)
      })
    }

    return () => {
      // Do not disconnect on unmount of hook, only on auth change
      // or explicit disconnect. 
      // We rely on singleton pattern.
    }
  }, [idToken, user])

  return socketInstance
}

// Export for use in Sprint 3 (messaging events)
export function getSocket(): Socket | null {
  return socketInstance
}
