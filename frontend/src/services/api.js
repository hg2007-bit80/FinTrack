// Base API helper with authorization header injection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const getAuthToken = () => localStorage.getItem('fintrack_token')

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('fintrack_token', token)
  } else {
    localStorage.removeItem('fintrack_token')
  }
}

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.errors = data.errors
    throw error
  }

  return data
}

export { API_URL }
