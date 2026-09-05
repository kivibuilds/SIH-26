import axios from 'axios'
import mockHandlers from './mock/handlers'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''
// Default to true if not explicitly set to 'false'
export const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('verifyx_auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function login({ officerId, password }) {
  if (useMock) {
    return mockHandlers.login({ officerId, password })
  }
  const res = await api.post('/auth/login', { officerId, password })
  return res.data
}

export async function logout() {
  if (useMock) {
    return mockHandlers.logout()
  }
  const res = await api.post('/auth/logout')
  return res.data
}

export async function getDashboard() {
  if (useMock) {
    return mockHandlers.getDashboard()
  }
  const res = await api.get('/dashboard')
  return res.data
}

export async function createScreening({ travelerRef, documentType, travelerName }) {
  if (useMock) {
    return mockHandlers.createScreening({ travelerRef, documentType, travelerName })
  }
  const res = await api.post('/screening', { travelerRef, documentType, travelerName })
  return res.data
}

export async function uploadDocument(screeningId, file) {
  if (useMock) {
    return mockHandlers.uploadDocument(screeningId, file)
  }
  const formData = new FormData()
  formData.append('document', file)
  const res = await api.post(`/screening/${screeningId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getScreening(id) {
  if (useMock) {
    return mockHandlers.getScreening(id)
  }
  const res = await api.get(`/screening/${id}`)
  return res.data
}

export async function getScreeningResult(id) {
  if (useMock) {
    return mockHandlers.getScreeningResult(id)
  }
  const res = await api.get(`/screening/${id}/result`)
  return res.data
}

export async function getScreeningAnalysis(id) {
  if (useMock) {
    return mockHandlers.getScreeningAnalysis(id)
  }
  const res = await api.get(`/screening/${id}/analysis`)
  return res.data
}

export async function listScreenings(filters = {}) {
  if (useMock) {
    return mockHandlers.listScreenings(filters)
  }
  const res = await api.get('/screening', { params: filters })
  return res.data
}

export async function getAnalytics({ range = '7d' } = {}) {
  if (useMock) {
    return mockHandlers.getAnalytics({ range })
  }
  const res = await api.get('/analytics', { params: { range } })
  return res.data
}

export async function updateScreeningStatus(id, status, updates = {}) {
  if (useMock) {
    return mockHandlers.updateScreeningStatus(id, status, updates)
  }
  const res = await api.patch(`/screening/${id}/status`, { status, ...updates })
  return res.data
}

export default {
  login,
  logout,
  getDashboard,
  createScreening,
  uploadDocument,
  getScreening,
  getScreeningResult,
  getScreeningAnalysis,
  listScreenings,
  getAnalytics,
  updateScreeningStatus,
  useMock,
}