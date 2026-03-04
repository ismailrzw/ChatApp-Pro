import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../../features/auth/authStore'
import { useContactsStore } from '../../features/contacts/contactsStore'

let socketInstance: Socket | null = null

export function useSocket() {
  const { idToken, user } = useAuthStore()
  const { setUserOnline } = useContactsStore()

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
    } else {
      // If token changed, we might need to reconnect with new auth
      // For now, let's just update the auth object if possible, 
      // or disconnect/reconnect if needed.
      // socketInstance.auth = { token: idToken };
    }

    // Presence events
    socketInstance.on('user:online', (data: { user_id: string; is_online: boolean }) => {
      setUserOnline(data.user_id, data.is_online)
    })

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })

    return () => {
      socketInstance?.off('user:online')
      socketInstance?.off('connect_error')
    }
  }, [idToken, user, setUserOnline])

  return socketInstance
}

// Export for use in Sprint 3 (messaging events)
export function getSocket(): Socket | null {
  return socketInstance
}
