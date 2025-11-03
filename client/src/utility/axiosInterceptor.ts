import axios from 'axios'

const baseURL = import.meta.env.DEV
  ? '/api'
  : `${import.meta.env.VITE_SERVER_URL || ''}/api`

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased to 30 seconds for search requests
  withCredentials: true,
})

// Add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default axiosInstance
