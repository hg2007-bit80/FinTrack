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

  // Handle FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  // Handle blob response (e.g., CSV export)
  if (options.responseType === 'blob') {
    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`)
    }
    const blob = await response.blob()
    return { data: blob }
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.errors = data.errors
    error.response = { data, status: response.status }
    throw error
  }

  return data
}

// Axios-compatible interface wrapper for cleaner service definitions
export const api = {
  get: (endpoint, config = {}) => {
    let url = endpoint
    if (config.params) {
      const query = new URLSearchParams()
      Object.entries(config.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val)
        }
      })
      const qs = query.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }
    return fetchWithAuth(url.startsWith('/api') ? url : `/api${url}`, {
      method: 'GET',
      responseType: config.responseType
    }).then((data) => (config.responseType === 'blob' ? data : { data }))
  },
  post: (endpoint, body, config = {}) =>
    fetchWithAuth(endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: config.headers
    }).then((data) => ({ data })),
  put: (endpoint, body) =>
    fetchWithAuth(endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }).then((data) => ({ data })),
  patch: (endpoint, body) =>
    fetchWithAuth(endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    }).then((data) => ({ data })),
  delete: (endpoint) =>
    fetchWithAuth(endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`, {
      method: 'DELETE'
    }).then((data) => ({ data }))
}

export default api
export { API_URL }
