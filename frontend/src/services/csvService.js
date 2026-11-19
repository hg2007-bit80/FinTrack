import api from './api'

export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post('/csv/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((r) => r.data)
}

export const exportCSV = async () => {
  const response = await api.get('/csv/export', { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `fintrack-transactions-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
