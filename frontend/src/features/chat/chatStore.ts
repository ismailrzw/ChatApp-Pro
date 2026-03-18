import { create } from 'zustand'
import type { Conversation } from '../../types/conversation'
import type { Message } from '../../types/message'

type MessageMap = Record<string, Message[]>

interface PaginationEntry {
  hasMore: boolean
  nextCursor: string | null
  loading: boolean
}

type PaginationMap = Record<string, PaginationEntry>

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: MessageMap
  pagination: PaginationMap
  conversationsLoading: boolean
  conversationsError: string | null

  setConversations: (convs: Conversation[]) => void
  upsertConversation: (conv: Conversation) => void
  setActiveConversation: (id: string | null) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
  setMessages: (conversationId: string, messages: Message[], hasMore: boolean, nextCursor: string | null) => void
  prependMessages: (conversationId: string, messages: Message[], hasMore: boolean, nextCursor: string | null) => void
  appendMessage: (conversationId: string, message: Message) => void
  replaceTempMessage: (conversationId: string, tempId: string, confirmed: Message) => void
  updateMessageStatus: (conversationId: string, messageId: string, status: Message['status']) => void
  setPaginationLoading: (conversationId: string, loading: boolean) => void
  setConversationsLoading: (loading: boolean) => void
  setConversationsError: (error: string | null) => void
  // NOTE: getMessages / getPagination are utility fns — call via getState() ONLY.
  // Never call inside useChatStore((s) => s.getMessages(...)) — causes infinite loop.
  getMessages: (conversationId: string) => Message[]
  getPagination: (conversationId: string) => PaginationEntry
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  pagination: {},
  conversationsLoading: false,
  conversationsError: null,

  setConversations: (convs) => set({ conversations: convs }),

  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id)
      if (idx !== -1) {
        const next = [...s.conversations]
        next[idx] = conv
        return { conversations: next }
      }
      return { conversations: [conv, ...s.conversations] }
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  incrementUnread: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unread_count: (c.unread_count ?? 0) + 1 }
          : c
      ),
    })),

  clearUnread: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    })),

  setMessages: (conversationId, messages, hasMore, nextCursor) =>
    set((s) => ({
      messages: { ...s.messages, [conversationId]: messages },
      pagination: {
        ...s.pagination,
        [conversationId]: { hasMore, nextCursor, loading: false },
      },
    })),

  prependMessages: (conversationId, older, hasMore, nextCursor) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? []
      const existingIds = new Set(existing.map((m) => m.id))
      const deduped = older.filter((m) => !existingIds.has(m.id))
      return {
        messages: { ...s.messages, [conversationId]: [...deduped, ...existing] },
        pagination: { ...s.pagination, [conversationId]: { hasMore, nextCursor, loading: false } },
      }
    }),

  appendMessage: (conversationId, message) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? []
      // Block duplicates by real id AND by temp_id
      const isDuplicate =
        existing.some((m) => m.id === message.id) ||
        (message._temp_id != null &&
          existing.some((m) => m._temp_id === message._temp_id))
      if (isDuplicate) return s
      return { messages: { ...s.messages, [conversationId]: [...existing, message] } }
    }),

  replaceTempMessage: (conversationId, tempId, confirmed) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? []
      const idx = existing.findIndex((m) => m._temp_id === tempId)
      if (idx === -1) return s
      const next = [...existing]
      next[idx] = confirmed
      return { messages: { ...s.messages, [conversationId]: next } }
    }),

  updateMessageStatus: (conversationId, messageId, status) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, status } : m
        ),
      },
    })),

  setPaginationLoading: (conversationId, loading) =>
    set((s) => ({
      pagination: {
        ...s.pagination,
        [conversationId]: {
          ...(s.pagination[conversationId] ?? { hasMore: true, nextCursor: null }),
          loading,
        },
      },
    })),

  setConversationsLoading: (loading) => set({ conversationsLoading: loading }),
  setConversationsError: (error) => set({ conversationsError: error }),

  getMessages: (conversationId) => get().messages[conversationId] ?? [],
  getPagination: (conversationId) =>
    get().pagination[conversationId] ?? { hasMore: true, nextCursor: null, loading: false },
}))