import { fetchWithAuth } from './api'

// GET: Fetch all transactions
export const getTransactions = async (filters = {}) => {
  const query = new URLSearchParams()
  if (filters.type) query.append('type', filters.type)
  if (filters.category) query.append('category', filters.category)
  if (filters.search) query.append('search', filters.search)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  return await fetchWithAuth(`/api/transactions${queryString}`)
}

// POST: Add a new transaction
export const addTransaction = async (transactionData) => {
  return await fetchWithAuth('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData)
  })
}

// PUT: Update an existing transaction
export const updateTransaction = async (id, transactionData) => {
  return await fetchWithAuth(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transactionData)
  })
}

// DELETE: Delete a transaction
export const deleteTransaction = async (id) => {
  return await fetchWithAuth(`/api/transactions/${id}`, {
    method: 'DELETE'
  })
}
