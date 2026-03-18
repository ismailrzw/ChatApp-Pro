/**
 * MessageInput — auto-growing textarea with optimistic send flow.
 */
import { useState, useRef, useCallback } from 'react'
import { useChatStore } from './chatStore'
import { useAuthStore } from '../auth/authStore'
import { getSocket } from '../../shared/hooks/useSocket'
import type { Message } from '../../types/message'

interface MessageInputProps {
  conversationId: string
}

export const MessageInput = ({ conversationId }: MessageInputProps) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentUser = useAuthStore((s) => s.user)
  // Support both UserProfile.firebase_uid and Firebase User.uid
  const currentUid: string =
    (currentUser as any)?.firebase_uid ??
    (currentUser as any)?.uid ??
    ''

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || !currentUid) return

    const socket = getSocket()
    if (!socket?.connected) {
      console.warn('[MessageInput] Socket not connected — message not sent')
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString()

    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_uid: currentUid,
      type: 'text',
      content: trimmed,
      media_url: null,
      reply_to_id: null,
      status: 'sending',
      read_by: [],
      is_deleted_for_all: false,
      deleted_for: [],
      created_at: now,
      _temp_id: tempId,
    }

    useChatStore.getState().appendMessage(conversationId, optimisticMessage)

    setInputValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    socket.emit('send_message', {
      conversation_id: conversationId,
      type: 'text',
      content: trimmed,
      temp_id: tempId,
    })
  }, [inputValue, conversationId, currentUid])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = inputValue.trim().length === 0

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 bg-white">
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition-colors overflow-hidden"
        style={{ maxHeight: '120px' }}
      />
      <button
        onClick={handleSend}
        disabled={isEmpty}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Send message"
      >
        <svg
          className={`h-4 w-4 ${isEmpty ? 'text-gray-400' : 'text-white'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </div>
  )
}