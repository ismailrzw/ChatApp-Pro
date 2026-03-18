/**
 * Sprint 3 Frontend Tests — written for VITEST (Vite projects use vitest, not jest)
 *
 * Run: npm test -- --run   (or: npx vitest run)
 * Expected: 12 new tests pass
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { useChatStore } from '../features/chat/chatStore'
import MessageBubble from '../features/chat/MessageBubble'
import { MessageInput } from '../features/chat/MessageInput'
import { ConversationList } from '../features/chat/ConversationList'
import type { Message } from '../types/message'
import type { Conversation } from '../types/conversation'

// ---------------------------------------------------------------------------
// Module mocks (Vitest syntax)
// ---------------------------------------------------------------------------

vi.mock('../shared/hooks/useSocket', () => ({
  getSocket: () => ({
    connected: true,
    emit: vi.fn(),
  }),
  useSocket: vi.fn(),
  destroySocket: vi.fn(),
}))

vi.mock('../features/auth/authStore', () => ({
  useAuthStore: (selector: (s: { user: { firebase_uid: string }; idToken: string; loading: boolean }) => unknown) =>
    selector({ user: { firebase_uid: 'uid-alice' }, idToken: 'token', loading: false }),
}))

vi.mock('../shared/api/conversationsApi', () => ({
  getConversations: vi.fn().mockResolvedValue([]),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_uid: 'uid-alice',
    type: 'text',
    content: 'Hello world',
    media_url: null,
    reply_to_id: null,
    status: 'sent',
    read_by: [],
    is_deleted_for_all: false,
    deleted_for: [],
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'direct',
    participants: ['uid-alice', 'uid-bob'],
    group_name: null,
    group_avatar: null,
    admin_uids: null,
    last_message: null,
    other_user: {
      firebase_uid: 'uid-bob',
      display_name: 'Bob',
      avatar_url: null,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    unread_count: 0,
    ...overrides,
  }
}

// Reset store between tests
beforeEach(() => {
  useChatStore.setState({
    conversations: [],
    activeConversationId: null,
    messages: {},
    pagination: {},
    conversationsLoading: false,
    conversationsError: null,
  })
})

// ---------------------------------------------------------------------------
// chatStore tests
// ---------------------------------------------------------------------------

describe('chatStore', () => {
  test('FT-S3-01: appendMessage adds message to correct conversation key', () => {
    const store = useChatStore.getState()
    const msg = makeMessage()
    store.appendMessage('conv-1', msg)
    expect(store.getMessages('conv-1')).toHaveLength(1)
    expect(store.getMessages('conv-2')).toHaveLength(0)
  })

  test('FT-S3-02: appendMessage duplicate guard blocks re-adding same id', () => {
    const store = useChatStore.getState()
    const msg = makeMessage()
    store.appendMessage('conv-1', msg)
    store.appendMessage('conv-1', msg)
    expect(useChatStore.getState().getMessages('conv-1')).toHaveLength(1)
  })

  test('FT-S3-03: replaceTempMessage replaces optimistic message with confirmed', () => {
    const store = useChatStore.getState()
    const temp = makeMessage({ id: 'temp-123', _temp_id: 'temp-123', status: 'sending' })
    store.appendMessage('conv-1', temp)

    const confirmed = makeMessage({ id: 'real-abc', status: 'sent' })
    store.replaceTempMessage('conv-1', 'temp-123', confirmed)

    const msgs = useChatStore.getState().getMessages('conv-1')
    expect(msgs).toHaveLength(1)
    expect(msgs[0].id).toBe('real-abc')
    expect(msgs[0].status).toBe('sent')
  })

  test('FT-S3-04: getSortedConversations returns newest-updated first', () => {
    const store = useChatStore.getState()
    const older = makeConversation({ id: 'conv-1', updated_at: '2024-01-01T00:00:00Z' })
    const newer = makeConversation({ id: 'conv-2', updated_at: '2024-06-01T00:00:00Z' })
    store.setConversations([older, newer])
    const sorted = useChatStore.getState().getSortedConversations()
    expect(sorted[0].id).toBe('conv-2')
    expect(sorted[1].id).toBe('conv-1')
  })

  test('FT-S3-05: incrementUnread and clearUnread correctly toggle badge count', () => {
    const store = useChatStore.getState()
    store.setConversations([makeConversation()])
    store.incrementUnread('conv-1')
    store.incrementUnread('conv-1')
    expect(useChatStore.getState().conversations[0].unread_count).toBe(2)
    store.clearUnread('conv-1')
    expect(useChatStore.getState().conversations[0].unread_count).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// MessageBubble tests
// ---------------------------------------------------------------------------

describe('MessageBubble', () => {
  test('FT-S3-06: own message is right-aligned; other is left-aligned', () => {
    const { rerender, container } = render(
      <MessageBubble
        message={makeMessage()}
        isOwn={true}
        currentUid="uid-alice"
      />
    )
    expect(container.firstChild).toHaveClass('justify-end')

    rerender(
      <MessageBubble
        message={makeMessage({ sender_uid: 'uid-bob' })}
        isOwn={false}
        currentUid="uid-alice"
      />
    )
    expect(container.firstChild).toHaveClass('justify-start')
  })

  test('FT-S3-07: deleted message shows "This message was deleted"', () => {
    render(
      <MessageBubble
        message={makeMessage({ is_deleted_for_all: true })}
        isOwn={true}
        currentUid="uid-alice"
      />
    )
    expect(screen.getByText('This message was deleted')).toBeInTheDocument()
  })

  test('FT-S3-08: deleted_for hides bubble entirely for that user', () => {
    const { container } = render(
      <MessageBubble
        message={makeMessage({ deleted_for: ['uid-alice'] })}
        isOwn={true}
        currentUid="uid-alice"
      />
    )
    expect(container.firstChild).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// MessageInput tests
// ---------------------------------------------------------------------------

describe('MessageInput', () => {
  test('FT-S3-09: send button disabled when input is empty', () => {
    render(<MessageInput conversationId="conv-1" />)
    const btn = screen.getByRole('button', { name: /send/i })
    expect(btn).toBeDisabled()
  })

  test('FT-S3-10: Enter key triggers send; Shift+Enter does not', () => {
    render(<MessageInput conversationId="conv-1" />)
    const textarea = screen.getByPlaceholderText(/type a message/i)

    fireEvent.change(textarea, { target: { value: 'hello' } })

    // Shift+Enter should NOT clear the input
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect((textarea as HTMLTextAreaElement).value).toBe('hello')

    // Enter alone triggers send and clears input
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// ConversationList tests
// ---------------------------------------------------------------------------

describe('ConversationList', () => {
  test('FT-S3-11: shows loading skeleton while conversationsLoading is true', () => {
    act(() => {
      useChatStore.setState({ conversationsLoading: true })
    })
    render(<ConversationList />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test('FT-S3-12: shows empty state when conversations array is empty', () => {
    act(() => {
      useChatStore.setState({ conversationsLoading: false, conversations: [] })
    })
    render(<ConversationList />)
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument()
  })
})