import axios from 'axios'
import { auth } from '../firebase'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  timeout: 10000,
})

// Attach a fresh Firebase ID token to every request
axiosInstance.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      const token = await currentUser.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    console.error('[axiosInstance] Failed to get token:', err)
  }
  return config
})

// Log response errors for easier debugging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      '[axiosInstance] Request failed:',
      error.config?.url,
      error.response?.status,
      error.response?.data
    )
    return Promise.reject(error)
  }
)

export default axiosInstance