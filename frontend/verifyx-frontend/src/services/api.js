import axios from 'axios'
import mockHandlers from './mock/handlers'

const baseURL = import.meta.env.VITE_API_BASE_URL || (
  window.location.protocol === 'https:'
    ? `${window.location.origin}/api`
    : `http://${window.location.hostname}:8000/api`
)
export const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const SYNTHETIC_BASELINE_COUNT = 1284

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
  const cleared = screenings.items.filter((item) => item.decision === 'clear').length
  const needsReview = screenings.items.filter((item) => item.decision === 'review').length
  const highRisk = screenings.items.filter((item) => item.decision === 'high_risk').length
  return {
    kpis: {
      totalScreenings: SYNTHETIC_BASELINE_COUNT + screenings.total,
      cleared,
      needsReview,
      highRisk,
      syntheticBaseline: SYNTHETIC_BASELINE_COUNT,
      liveScreenings: screenings.total,
    },
    recentQueue: screenings.items,
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
    decision: item.decision || (item.risk_level?.toLowerCase() === 'low' ? 'clear' : item.risk_level?.toLowerCase() === 'high' ? 'high_risk' : 'review'),
    createdAt: item.created_at,
    documentType: item.document_type,
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

<<<<<<< HEAD
export async function analyzeDocument(documentId) {
  const res = await api.post(`/screening/analyze/${documentId}`)
  return {
    ...res.data,
    normalized: normalizeScreening(res.data),
  }
}

export async function verifyUploadedDocument(screeningId, file) {
  if (useMock) {
    return {
      screening_id: screeningId,
      integrity: 'VERIFIED',
      verified: true,
      blockchain_status: 'MOCK_CONFIRMED',
      transaction_hash: null,
      verification_transaction_hash: null,
    }
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post(`/audit/${screeningId}/verify-upload`, formData, {
=======
export async function analyzeDocument(documentId, faceFile = null) {
  const formData = new FormData()
  if (faceFile) formData.append('face_file', faceFile)
  const res = await api.post(`/screening/analyze/${documentId}`, formData, {
>>>>>>> origin/main
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

function normalizeScreening(data) {
  const riskScore = Number(data.risk?.score || 0)
  const decision = data.risk?.level?.toLowerCase() === 'low' ? 'clear' : riskScore >= 70 ? 'high_risk' : 'review'
  const extracted = data.extracted_data || {}
  const documentValidationPassed = data.document_validation?.status === 'VALID'
  const mrzPassed = ['VALID', 'MATCH'].includes(data.mrz_verification?.status)
  const facePassed = data.face_verification?.match === true
  const findings = (data.risk?.reasons || []).map((reason, index) => ({
    code: `RISK-${index + 1}`,
    severity: riskScore >= 70 ? 'high' : 'medium',
    title: reason,
    detail: 'Backend risk assessment reported this condition during screening.',
  }))
  const checks = {
    docValidation: { passed: documentValidationPassed, status: documentValidationPassed ? 'VALID' : 'FAILED' },
    mrzVerification: { passed: mrzPassed, status: mrzPassed ? 'VALID' : 'FAILED' },
    tamperingAnalysis: { passed: !data.tampering_analysis?.detected, status: data.tampering_analysis?.detected ? 'FAILED' : 'CLEARED' },
    faceVerification: { passed: facePassed, status: facePassed ? 'MATCH' : data.face_verification?.match === false ? 'MISMATCH' : 'REVIEW' },
    watchlistCheck: { passed: !data.watchlist?.match, status: data.watchlist?.match ? 'FLAGGED' : 'CLEAR' },
  }

  return {
    id: data.screening_id,
    documentId: data.document?.document_id,
    documentUrl: data.document?.document_id
      ? `${baseURL}/documents/${data.document.document_id}/file`
      : null,
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
    extractedFields: Object.entries(extracted)
      .filter(([key, value]) => key !== 'raw_text' && key !== 'mrz' && (value == null || ['string', 'number', 'boolean'].includes(typeof value)))
      .map(([key, value]) => ({
        key,
        value: value ?? 'Not detected',
        source: key.includes('mrz') ? 'MRZ' : 'VIZ',
        status: value ? 'valid' : 'review',
      })),
    findings,
    ocrAnalysis: {
      confidence: data.ocr_analysis?.confidence,
      fieldsDetected: data.ocr_analysis?.fields_detected,
      fieldsRequiringReview: data.ocr_analysis?.fields_requiring_review,
      reviewThreshold: data.ocr_analysis?.review_threshold,
      engineVersion: 'Tesseract OCR',
    },
    mrzVerification: {
      ...data.mrz_verification,
      checkDigits: mrzPassed ? 'VALID' : data.mrz_verification?.status || 'REVIEW',
      ocrConsistency: mrzPassed ? 'VALID' : 'REVIEW',
    },
    documentValidation: {
      ...data.document_validation,
      requiredFieldsPresent: data.document_validation?.checks?.required_fields ? '100%' : '0%',
      dateValidity: data.document_validation?.expiry_status || 'UNKNOWN',
      crossFieldConsistency: data.document_validation?.checks?.consistency ? 'VALID' : 'REVIEW',
    },
    forensics: {
      ...data.tampering_analysis,
      tamperingConfidence: Number(data.tampering_analysis?.confidence || 0) * 100,
      textManipulation: data.tampering_analysis?.detected ? 'DETECTED' : 'NOT DETECTED',
    },
    faceVerification: {
      ...data.face_verification,
      similarityScore: data.face_verification?.confidence == null ? null : Number(data.face_verification.confidence) * 100,
      status: facePassed ? 'MATCH' : data.face_verification?.match === false ? 'MISMATCH' : 'NOT PERFORMED',
    },
    watchlist: {
      ...data.watchlist,
      status: data.watchlist?.match ? 'FLAGGED' : 'CLEAR',
    },
    audit: {
      ...data.blockchain,
      verificationId: data.screening_id,
      txRef: data.blockchain?.transaction_hash,
      status: data.blockchain?.status,
      blockNumber: data.blockchain?.block_number,
      documentHash: data.blockchain?.document_hash,
      error: data.blockchain?.error,
    },
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
  verifyUploadedDocument,
  useMock,
}