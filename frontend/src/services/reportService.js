import api from './api'

export const getMonthlyReport = (year) =>
  api.get('/reports/monthly', { params: { year } }).then((r) => r.data)

export const getYearlyReport = () =>
  api.get('/reports/yearly').then((r) => r.data)

export const getCategoryBreakdown = (month, year) =>
  api.get('/reports/category-breakdown', { params: { month, year } }).then((r) => r.data)
