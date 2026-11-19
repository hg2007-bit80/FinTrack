import api from './api'

export const getSavingsGoals = () =>
  api.get('/savings').then((r) => r.data)

export const createSavingsGoal = (data) =>
  api.post('/savings', data).then((r) => r.data)

export const contributeToGoal = (id, amount) =>
  api.patch(`/savings/${id}/contribute`, { amount }).then((r) => r.data)

export const deleteSavingsGoal = (id) =>
  api.delete(`/savings/${id}`).then((r) => r.data)
