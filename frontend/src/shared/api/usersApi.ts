import axiosInstance from './axiosInstance'
import type { UserProfile, UserSearchResult } from '../../types/user'

/**
 * Fetch current user profile.
 */
export async function getMe(): Promise<UserProfile> {
  const res = await axiosInstance.get<UserProfile>('/api/users/me')
  return res.data
}

/**
 * Update current user profile fields.
 */
export async function updateMe(
  payload: Partial<Pick<UserProfile, 'display_name' | 'status_message'>>
): Promise<UserProfile> {
  const res = await axiosInstance.put<UserProfile>('/api/users/me', payload)
  return res.data
}

/**
 * Upload a new avatar image.
 */
export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axiosInstance.post<{ avatar_url: string }>(
    '/api/users/me/avatar',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}

/**
 * Search for users by display name or email.
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (query.length < 2) return []
  const res = await axiosInstance.get<UserSearchResult[]>('/api/users/search', {
    params: { q: query }
  })
  return res.data
}
