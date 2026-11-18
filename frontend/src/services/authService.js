import { fetchWithAuth, setAuthToken } from './api'

// Register a new user
export const registerUser = async (userData) => {
  const data = await fetchWithAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  })

  if (data.token) {
    setAuthToken(data.token)
  }

  return data
}

// Log in an existing user
export const loginUser = async (credentials) => {
  const data = await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  })

  if (data.token) {
    setAuthToken(data.token)
  }

  return data
}

// Fetch current user profile
export const getCurrentUser = async () => {
  return await fetchWithAuth('/api/auth/me')
}

// Logout
export const logoutUser = () => {
  setAuthToken(null)
}
