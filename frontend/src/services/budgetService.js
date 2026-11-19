import api from './api'

export const getBudgets = (month, year) =>
  api.get('/budgets', { params: { month, year } }).then((r) => r.data)

export const createBudget = (data) =>
  api.post('/budgets', data).then((r) => r.data)

export const deleteBudget = (id) =>
  api.delete(`/budgets/${id}`).then((r) => r.data)
