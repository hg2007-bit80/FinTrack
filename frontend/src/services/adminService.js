import api from './api'

export const getAdminStats = () =>
  api.get('/admin/stats').then((r) => r.data)

export const getAdminAnalytics = () =>
  api.get('/admin/analytics').then((r) => r.data)

export const getUsers = (params = {}) =>
  api.get('/admin/users', { params }).then((r) => r.data)

export const getUserDetails = (id) =>
  api.get(`/admin/users/${id}`).then((r) => r.data)

export const updateUserStatus = (id, isActive) =>
  api.patch(`/admin/users/${id}/status`, { isActive }).then((r) => r.data)

export const deleteUser = (id) =>
  api.delete(`/admin/users/${id}`).then((r) => r.data)

export const broadcastNotification = (payload) =>
  api.post('/admin/broadcast', payload).then((r) => r.data)

export const getSystemInfo = () =>
  api.get('/admin/system').then((r) => r.data)

export const getMaintenanceConfig = () =>
  api.get('/admin/maintenance').then((r) => r.data)

export const updateMaintenanceConfig = (payload) =>
  api.post('/admin/maintenance', payload).then((r) => r.data)

export const getAuditLogs = (params = {}) =>
  api.get('/admin/audit-logs', { params }).then((r) => r.data)

export const getActivityFeed = () =>
  api.get('/admin/activity').then((r) => r.data)
