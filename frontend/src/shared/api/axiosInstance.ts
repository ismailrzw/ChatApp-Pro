import axios from 'axios'
import { auth } from '../firebase'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach fresh Firebase token
axiosInstance.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken(/* forceRefresh */ false)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 globally
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token may be expired — Firebase SDK will refresh on next getIdToken call
      // Re-throw so individual call sites can handle UI feedback
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
