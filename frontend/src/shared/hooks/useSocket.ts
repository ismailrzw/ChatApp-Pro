import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../../features/auth/authStore'
import { useChatStore } from '../../features/chat/chatStore'
import { useContactsStore } from '../../features/contacts/contactsStore'
import type { MessageReceiveEvent } from '../../types/message'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

let socketInstance: Socket | null = null
let isInitialising = false

export function getSocket(): Socket | null {
  return socketInstance
}

export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
  isInitialising = false
}

export function useSocket(): void {
  const idToken = useAuthStore((s) => s.idToken)

  useEffect(() => {
    if (!idToken) return
    if (socketInstance || isInitialising) return
    isInitialising = true

    const socket = io(SOCKET_URL, {
      auth: { token: idToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketInstance = socket

    socket.on('connect', () => {
      isInitialising = false
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason)
      // Do NOT null socketInstance — auto-reconnect handles it
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
      isInitialising = false
    })

    /**
     * user:online — backend broadcasts this for ALL users on connect/disconnect.
     * This is the single source of truth for online status.
     * Backend sets is_online=true on connect, is_online=false on disconnect.
     */
    socket.on('user:online', (data: { firebase_uid: string; is_online: boolean }) => {
      useContactsStore.getState().setOnlineStatus(data.firebase_uid, data.is_online)
    })

    /**
     * message:receive — fires for ALL room participants including sender.
     *
     * To avoid duplicates, we check if a temp (optimistic) message from the
     * same sender with the same content exists. If so, replace it.
     * If not, append normally (receiver's path, or ack already ran).
     */
    socket.on('message:receive', (data: MessageReceiveEvent) => {
      const { message } = data
      const store = useChatStore.getState()
      const activeId = store.activeConversationId

      const existingMsgs = store.messages[message.conversation_id] ?? []

      const tempEntry = existingMsgs.find(
        (m) =>
          m._temp_id != null &&
          m.sender_uid === message.sender_uid &&
          m.content === message.content &&
          m.status === 'sending'
      )

      if (tempEntry && tempEntry._temp_id) {
        store.replaceTempMessage(
          message.conversation_id,
          tempEntry._temp_id,
          { ...message, status: 'sent' }
        )
      } else {
        store.appendMessage(message.conversation_id, message)
      }

      // Bubble to top of conversation list
      const conv = store.conversations.find((c) => c.id === message.conversation_id)
      if (conv) {
        store.upsertConversation({
          ...conv,
          last_message: {
            text: message.content,
            sender_uid: message.sender_uid,
            sent_at: message.created_at,
          },
          updated_at: message.created_at,
        })
      }

      if (activeId !== message.conversation_id) {
        store.incrementUnread(message.conversation_id)
      }
    })

    socket.on('message:ack', (data: { temp_id: string; message_id: string }) => {
      const store = useChatStore.getState()
      for (const [convId, msgs] of Object.entries(store.messages)) {
        const temp = msgs.find((m) => m._temp_id === data.temp_id)
        if (temp) {
          store.replaceTempMessage(convId, data.temp_id, {
            ...temp,
            id: data.message_id,
            status: 'sent',
            _temp_id: undefined,
          })
          break
        }
      }
    })

    socket.on('error', (data: { code: string; message: string }) => {
      console.error(`[Socket Error] ${data.code}: ${data.message}`)
    })

    return () => {
      destroySocket()
    }
  }, [idToken])
}