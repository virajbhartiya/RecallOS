import axios from 'axios'

const baseURL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000') + '/api'

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased to 30 seconds for search requests
  withCredentials: true,
})

// No Authorization header; session handled by HttpOnly cookie

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default axiosInstance
