import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Avatar from '../shared/components/Avatar'
import Modal from '../shared/components/Modal'
import ProfileSettings from '../features/profile/ProfileSettings'
import ContactList from '../features/contacts/ContactList'
import ContactSearch from '../features/contacts/ContactSearch'
import * as usersApi from '../shared/api/usersApi'
import * as contactsApi from '../shared/api/contactsApi'
import { useAuthStore } from '../features/auth/authStore'
import { useContactsStore } from '../features/contacts/contactsStore'

// Mock APIs
vi.mock('../shared/api/usersApi')
vi.mock('../shared/api/contactsApi')

// Mock useAuthStore
vi.mock('../features/auth/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/chat' }),
  }
})

describe('Sprint 2 Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for useAuthStore
    ;(useAuthStore as any).mockReturnValue({
      user: { firebase_uid: 'uid-123', display_name: 'Test User' },
      setUser: vi.fn(),
    })
  })

  // FT-S2-01: Avatar Renders image when valid src provided
  it('FT-S2-01: Avatar renders image when valid src provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" name="Alice" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  // FT-S2-02: Avatar Renders initials fallback when src is null
  it('FT-S2-02: Avatar renders initials fallback when src is null', () => {
    render(<Avatar src={null} name="Alice Smith" />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  // FT-S2-04: Avatar Shows green dot when isOnline=true
  it('FT-S2-04: Avatar shows green dot when isOnline=true', () => {
    const { container } = render(<Avatar name="Alice" isOnline={true} />)
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })

  // FT-S2-05: ProfileSettings Pre-fills form with current user data on mount
  it('FT-S2-05: ProfileSettings pre-fills form on mount', async () => {
    vi.mocked(usersApi.getMe).mockResolvedValue({
      firebase_uid: 'uid-123',
      display_name: 'Alice',
      status_message: 'Hello',
      avatar_url: null,
      email: 'alice@test.com',
      role: 'user',
      is_banned: false,
      last_seen: '',
      visibility: { last_seen: 'everyone' },
      created_at: '',
    })

    render(<BrowserRouter><ProfileSettings /></BrowserRouter>)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
    })
  })

  // FT-S2-10: ContactSearch Does not search when query < 2 chars
  it('FT-S2-10: ContactSearch does not search when query < 2 chars', async () => {
    render(<BrowserRouter><ContactSearch /></BrowserRouter>)
    const input = screen.getByPlaceholderText(/search by name/i)
    
    fireEvent.change(input, { target: { value: 'a' } })
    
    await new Promise(r => setTimeout(r, 500)) // Wait for debounce
    expect(usersApi.searchUsers).not.toHaveBeenCalled()
  })

  // FT-S2-11: ContactSearch Calls searchUsers after 300ms debounce
  it('FT-S2-11: ContactSearch calls searchUsers after debounce', async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([])
    render(<BrowserRouter><ContactSearch /></BrowserRouter>)
    const input = screen.getByPlaceholderText(/search by name/i)
    
    fireEvent.change(input, { target: { value: 'alice' } })
    
    await waitFor(() => {
      expect(usersApi.searchUsers).toHaveBeenCalledWith('alice')
    }, { timeout: 1000 })
  })

  // FT-S2-12: Modal Closes on Escape key press
  it('FT-S2-12: Modal closes on Escape key press', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
