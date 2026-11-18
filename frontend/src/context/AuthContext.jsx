import { createContext, useContext, useState, useEffect } from 'react'
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser
} from '../services/authService'
import { getAuthToken } from '../services/api'

const AuthContext = createContext(null)

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
          // Token is invalid/expired
          logoutUser()
          setUser(null)
          setToken(null)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email, password) => {
    const response = await loginUser({ email, password })
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

  const logout = () => {
    logoutUser()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
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
