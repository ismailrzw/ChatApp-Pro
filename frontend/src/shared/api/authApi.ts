import axiosInstance from './axiosInstance'
import type { UserProfile } from '../../types/user'

export async function postVerifyToken(token: string): Promise<UserProfile> {
  // axiosInstance interceptor will add the header; pass token explicitly
  // to allow calling this before the store is set (e.g., on first auth)
  const response = await axiosInstance.post<UserProfile>('/api/auth/verify', {}, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
