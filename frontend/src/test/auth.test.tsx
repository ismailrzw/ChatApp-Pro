import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import * as authHooks from '../shared/hooks/useAuth'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
}))

// Mock useAuth
vi.mock('../shared/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Sprint 1 Auth Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // FT1: LoginPage Renders email + password inputs and Login button
  it('FT1: LoginPage renders correctly', () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  // FT2: LoginPage Shows error message when Firebase throws wrong-password
  it('FT2: LoginPage shows error on wrong password', async () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/wrong-password' })
    
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument()
    })
  })

  // FT3: LoginPage Button is disabled and shows spinner during submission
  it('FT3: Login button shows spinner and is disabled during submission', async () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    // Mock a slow response
    vi.mocked(signInWithEmailAndPassword).mockReturnValue(new Promise(() => {}))
    
    const { container } = render(<BrowserRouter><LoginPage /></BrowserRouter>)
    
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  // FT4: RegisterPage Shows client-side error when passwords don't match
  it('FT4: RegisterPage shows error when passwords dont match', async () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    
    render(<BrowserRouter><RegisterPage /></BrowserRouter>)
    
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/min 8 chars/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText(/repeat/i), { target: { value: 'mismatch' } })
    fireEvent.click(screen.getByRole('button', { name: /register now/i }))
    
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })

  // FT5: RegisterPage Shows error when email already in use
  it('FT5: RegisterPage shows error when email exists', async () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue({ code: 'auth/email-already-in-use' })
    
    render(<BrowserRouter><RegisterPage /></BrowserRouter>)
    
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/min 8 chars/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText(/repeat/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register now/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/account with this email already exists/i)).toBeInTheDocument()
    })
  })

  // FT6: ProtectedRoute Renders children when isAuthenticated: true
  it('FT6: ProtectedRoute renders children when authenticated', () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: {} as any, loading: false, isAuthenticated: true, idToken: 'token', signOut: vi.fn()
    })
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div data-testid="child">Child Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  // FT7: ProtectedRoute Renders spinner when loading: true
  it('FT7: ProtectedRoute renders spinner when loading', () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: true, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    
    const { container } = render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Child Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  // FT8: ProtectedRoute Redirects to / when isAuthenticated: false, loading: false
  it('FT8: ProtectedRoute redirects when not authenticated', () => {
    vi.mocked(authHooks.useAuth).mockReturnValue({
      user: null, loading: false, isAuthenticated: false, idToken: null, signOut: vi.fn()
    })
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Child Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    // In v6, Navigate is rendered which internally calls navigate
    // Testing Navigate component effect indirectly by checking it doesn't render children
    expect(screen.queryByText(/child content/i)).not.toBeInTheDocument()
  })
})
