import axiosInstance from './axiosInstance'
import type { UserProfile } from '../../types/user'

/**
 * Call backend to upsert the user profile and return the full UserProfile.
 * Called once after Firebase auth resolves with a valid user.
 */
export async function postVerifyToken(token: string): Promise<UserProfile> {
  const response = await axiosInstance.post<UserProfile>(
    '/api/auth/verify',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}