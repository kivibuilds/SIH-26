import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout } from '../services/api'

const AuthContext = createContext(null)

const AUTH_TOKEN_KEY = 'verifyx_auth_token'
const OFFICER_INFO_KEY = 'verifyx_officer'

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize session from sessionStorage
  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem(AUTH_TOKEN_KEY)
      const storedOfficer = sessionStorage.getItem(OFFICER_INFO_KEY)

      if (storedToken && storedOfficer) {
        setToken(storedToken)
        setOfficer(JSON.parse(storedOfficer))
      }
    } catch (e) {
      console.error('Failed to parse session storage:', e)
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(OFFICER_INFO_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async ({ officerId, password }) => {
    const res = await apiLogin({ officerId, password })
    if (res?.token && res?.officer) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, res.token)
      sessionStorage.setItem(OFFICER_INFO_KEY, JSON.stringify(res.officer))
      setToken(res.token)
      setOfficer(res.officer)
      return res.officer
    }
    throw new Error('Authentication response format invalid')
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch (e) {
      console.warn('Logout error ignored:', e)
    } finally {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(OFFICER_INFO_KEY)
      setToken(null)
      setOfficer(null)
    }
  }, [])

  const value = {
    officer,
    token,
    loading,
    isAuthenticated: Boolean(token && officer),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
