import axios from 'axios'
import mockHandlers from './mock/handlers'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
export const useMock = import.meta.env.VITE_USE_MOCK === 'true'

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
  return {
    token: 'backend-session',
    officer: { id: officerId, name: officerId },
  }
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
  const screenings = await listScreenings()
  return {
    totalScreenings: screenings.total,
    pendingReview: screenings.items.filter((item) => item.risk_level !== 'LOW').length,
    highRisk: screenings.items.filter((item) => item.risk_level === 'HIGH').length,
    cleared: screenings.items.filter((item) => item.risk_level === 'LOW').length,
    recentScreenings: screenings.items,
  }
}

export async function createScreening({ travelerRef, documentType, travelerName }) {
  if (useMock) {
    return mockHandlers.createScreening({ travelerRef, documentType, travelerName })
  }
  return { travelerRef, documentType, travelerName }
}

export async function uploadDocument(screeningId, file) {
  if (useMock) {
    return mockHandlers.uploadDocument(screeningId, file)
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', screeningId)
  const res = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getScreening(id) {
  if (useMock) {
    return mockHandlers.getScreening(id)
  }
  const res = await api.get(`/screening/${id}`)
  return normalizeScreening(res.data)
}

export async function getScreeningResult(id) {
  if (useMock) {
    return mockHandlers.getScreeningResult(id)
  }
  const res = await api.get(`/screening/${id}`)
  return normalizeScreening(res.data)
}

export async function getScreeningAnalysis(id) {
  if (useMock) {
    return mockHandlers.getScreeningAnalysis(id)
  }
  const res = await api.get(`/screening/${id}`)
  return normalizeScreening(res.data)
}

export async function listScreenings(filters = {}) {
  if (useMock) {
    return mockHandlers.listScreenings(filters)
  }
  const res = await api.get('/screenings')
  const items = res.data.map((item) => ({
    ...item,
    id: item.screening_id,
    overallScore: item.risk_score,
    decision: item.risk_level?.toLowerCase() === 'low' ? 'clear' : 'review',
    createdAt: item.created_at,
  }))
  return { items, total: items.length }
}

export async function getAnalytics({ range = '7d' } = {}) {
  if (useMock) {
    return mockHandlers.getAnalytics({ range })
  }
  const screenings = await listScreenings()
  return { range, total: screenings.total, items: screenings.items }
}

export async function updateScreeningStatus(id, status, updates = {}) {
  if (useMock) {
    return mockHandlers.updateScreeningStatus(id, status, updates)
  }
  return { id, status, ...updates }
}

export async function analyzeDocument(documentId) {
  const res = await api.post(`/screening/analyze/${documentId}`)
  return res.data
}

function normalizeScreening(data) {
  const riskScore = Number(data.risk?.score || 0)
  const decision = data.risk?.level?.toLowerCase() === 'low' ? 'clear' : riskScore >= 70 ? 'high_risk' : 'review'
  const extracted = data.extracted_data || {}
  const checks = {
    docValidation: { passed: data.document_validation?.valid !== false, status: data.document_validation?.valid === false ? 'FAILED' : 'VALID' },
    mrzVerification: { passed: data.mrz_verification?.valid !== false, status: data.mrz_verification?.valid === false ? 'FAILED' : 'VALID' },
    tamperingAnalysis: { passed: !data.tampering_analysis?.detected, status: data.tampering_analysis?.detected ? 'FAILED' : 'CLEARED' },
    faceVerification: { passed: data.face_verification?.match !== false, status: data.face_verification?.match === false ? 'MISMATCH' : 'MATCH' },
    watchlistCheck: { passed: !data.watchlist?.match, status: data.watchlist?.match ? 'FLAGGED' : 'CLEAR' },
  }

  return {
    id: data.screening_id,
    documentType: data.document?.type,
    travelerName: extracted.full_name || extracted.name,
    documentNumber: extracted.passport_number || extracted.visa_number,
    nationality: extracted.nationality,
    createdAt: data.created_at || new Date().toISOString(),
    decision,
    overallScore: riskScore,
    summary: `Screening completed with ${data.risk?.level || 'UNKNOWN'} risk classification.`,
    recommendedAction: decision === 'clear' ? 'Clear for processing' : 'Review document and supporting evidence',
    checks,
    extractedFields: Object.entries(extracted).map(([label, value]) => ({ label, value, source: 'OCR' })),
    findings: [],
    ocrAnalysis: {},
    mrzVerification: data.mrz_verification,
    documentValidation: data.document_validation,
    forensics: data.tampering_analysis,
    faceVerification: data.face_verification,
    watchlist: data.watchlist,
    audit: data.blockchain,
    status: 'complete',
  }
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