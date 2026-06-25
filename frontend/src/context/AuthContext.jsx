import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth'
import { BASE_URL, setAccessToken, clearTokens } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from stored refresh token on app load
  useEffect(() => {
    const initAuth = async () => {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) { setLoading(false); return }

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh })
        setAccessToken(res.data.access)
        const me = await getMe()
        setUser(me.data)
      } catch {
        clearTokens()  // refresh expired — force re-login
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async (username, password) => {
    const res  = await apiLogin(username, password)
    const data = res.data
    setAccessToken(data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser({
      id:               data.user_id,
      email:            data.email,
      full_name:        data.full_name,
      is_administrator: data.is_administrator,
      is_manager:       data.is_manager,
    })
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)