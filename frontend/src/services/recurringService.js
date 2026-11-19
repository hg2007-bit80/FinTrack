import api from './api'

export const getRecurring = () =>
  api.get('/recurring').then((r) => r.data)

export const createRecurring = (data) =>
  api.post('/recurring', data).then((r) => r.data)

export const toggleRecurring = (id) =>
  api.patch(`/recurring/${id}/toggle`).then((r) => r.data)

export const deleteRecurring = (id) =>
  api.delete(`/recurring/${id}`).then((r) => r.data)
