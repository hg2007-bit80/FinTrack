import { fetchWithAuth, setAuthToken } from './api'

// Register a new client user (role: 'user')
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

// Register an administrator (simple: name, email, password)
export const registerAdminUser = async (adminData) => {
  let data
  try {
    data = await fetchWithAuth('/api/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify(adminData)
    })
  } catch (err) {
    // If backend doesn't have /api/auth/admin/register deployed yet (404 Cannot POST),
    // fall back cleanly to /api/auth/register with role: 'admin'
    if (
      err.status === 404 ||
      (err.message && err.message.toLowerCase().includes('cannot post /api/auth/admin/register'))
    ) {
      data = await fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...adminData, role: 'admin', portal: 'admin' })
      })
      if (data.user) {
        data.user.role = 'admin'
      }
    } else {
      throw err
    }
  }

  if (data.token) {
    setAuthToken(data.token)
    localStorage.setItem('fintrack_portal', 'admin')
  }

  return data
}

// Log in an existing user with portal verification
export const loginUser = async (credentials) => {
  const data = await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  })

  if (data.token) {
    setAuthToken(data.token)
    localStorage.setItem('fintrack_portal', credentials.portal || 'client')
  }

  if (data.user && !data.user.role && credentials.portal === 'admin') {
    data.user.role = 'admin'
  }

  return data
}

// Fetch current user profile
export const getCurrentUser = async () => {
  const data = await fetchWithAuth('/api/auth/me')
  const savedPortal = localStorage.getItem('fintrack_portal')
  if (data?.user && !data.user.role && savedPortal === 'admin') {
    data.user.role = 'admin'
  }
  return data
}

// Logout
export const logoutUser = () => {
  setAuthToken(null)
  localStorage.removeItem('fintrack_portal')
}
