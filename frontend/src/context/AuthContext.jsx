import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getCurrentUser,
  loginUser,
  registerUser,
  registerAdminUser,
  logoutUser
} from '../services/authService'
import { fetchWithAuth, getAuthToken } from '../services/api'

const AuthContext = createContext(null)

// A module-level navigate helper so AuthContext can redirect without a prop dependency
let _navigateFn = null
export const setNavigateFn = (fn) => { _navigateFn = fn }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(getAuthToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAuthToken()
      if (storedToken) {
        try {
          const response = await getCurrentUser()
          setUser(response.user)
          setToken(storedToken)
        } catch {
          // Token is invalid/expired — clear everything
          logoutUser()
          setUser(null)
          setToken(null)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email, password, portal = 'client') => {
    const response = await loginUser({ email, password, portal })
    setUser(response.user)
    setToken(response.token)
    return response
  }

  const register = async (name, email, password) => {
    const response = await registerUser({ name, email, password })
    setUser(response.user)
    setToken(response.token)
    return response
  }

  const registerAdmin = async (name, email, password) => {
    const response = await registerAdminUser({ name, email, password })
    setUser(response.user)
    setToken(response.token)
    return response
  }

  const logout = useCallback(async () => {
    // 1. Invalidate refresh token on the backend (best-effort)
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' })
    } catch {
      // non-blocking — still clear client state
    }

    // 2. Clear local token & user state
    logoutUser()
    setUser(null)
    setToken(null)

    // 3. Navigate to login using replaceState so Back button doesn't return to dashboard
    if (_navigateFn) {
      _navigateFn('/login', { replace: true })
    } else {
      window.history.replaceState({}, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        register,
        registerAdmin,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
