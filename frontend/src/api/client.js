import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Access token lives in memory — safer than localStorage
let accessToken = null

export const setAccessToken  = (token) => { accessToken = token }
export const getAccessToken  = () => accessToken
export const clearTokens     = () => {
  accessToken = null
  localStorage.removeItem('refresh_token')
}

const client = axios.create({
  baseURL: `${BASE_URL}/`,   // trailing slash — paths must NOT start with /
})

// Attach token on every request
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Queue for concurrent requests during token refresh
let isRefreshing = false
let queue = []

const processQueue = (error, token = null) => {
  queue.forEach((p) => error ? p.reject(error) : p.resolve(token))
  queue = []
}

// Auto-refresh on 401
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue concurrent requests until refresh completes
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return client(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        isRefreshing = false
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh })
        const newToken = res.data.access
        setAccessToken(newToken)
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      } catch (err) {
        processQueue(err, null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default client