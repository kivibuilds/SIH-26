import { delay } from './delay'
import { db, MOCK_OFFICER } from './db'
import { SCREENING_STATUS } from '../../constants/screeningStatus'

export const mockHandlers = {
  async login({ officerId, password }) {
    await delay(350)
    const normalizedId = officerId?.trim()
    const normalizedPass = password?.trim()

    // Accept OFF-1042 / verifyx or demo test credentials
    if ((normalizedId === 'OFF-1042' && normalizedPass === 'verifyx') ||
        (normalizedId?.toUpperCase() === 'OFF-1042' && normalizedPass === 'verifyx') ||
        (normalizedId === 'admin' && normalizedPass === 'admin')) {
      return {
        token: 'mock-session-jwt-token-vx1042',
        officer: {
          ...MOCK_OFFICER,
          id: normalizedId.toUpperCase() === 'OFF-1042' ? 'OFF-1042' : normalizedId,
        },
      }
    }

    const err = new Error('Invalid Officer ID or Password / PIN. For demo use OFF-1042 / verifyx')
    err.status = 401
    throw err
  },

  async logout() {
    await delay(150)
    return { success: true }
  },

  async getDashboard() {
    await delay(250)
    return db.getDashboardMetrics()
  },

  async createScreening({ travelerRef, documentType, travelerName }) {
    await delay(300)
    const newScreening = db.createScreening({ travelerRef, documentType, travelerName })
    return newScreening
  },

  async uploadDocument(screeningId, file) {
    await delay(400)
    const screening = db.getScreeningById(screeningId)
    if (!screening) {
      const err = new Error(`Screening record ${screeningId} not found`)
      err.status = 404
      throw err
    }
    return {
      success: true,
      screeningId,
      filename: file?.name || 'document_scan.jpg',
      size: file?.size || 204800,
      mimeType: file?.type || 'image/jpeg',
      uploadedAt: new Date().toISOString(),
    }
  },

  async getScreening(id) {
    await delay(200)
    const screening = db.getScreeningById(id)
    if (!screening) {
      const err = new Error(`Screening ${id} not found`)
      err.status = 404
      throw err
    }
    return screening
  },

  async getScreeningResult(id) {
    await delay(300)
    const screening = db.getScreeningById(id)
    if (!screening) {
      const err = new Error(`Screening ${id} not found`)
      err.status = 404
      throw err
    }
    return {
      id: screening.id,
      travelerRef: screening.travelerRef,
      travelerName: screening.travelerName,
      documentType: screening.documentType,
      documentNumber: screening.documentNumber,
      createdAt: screening.createdAt,
      officerId: screening.officerId,
      officerName: screening.officerName,
      decision: screening.decision,
      overallScore: screening.overallScore,
      summary: screening.summary,
      recommendedAction: screening.recommendedAction,
      checks: screening.checks,
      metrics: screening.metrics,
      audit: screening.audit,
    }
  },

  async getScreeningAnalysis(id) {
    await delay(350)
    const screening = db.getScreeningById(id)
    if (!screening) {
      const err = new Error(`Screening ${id} not found`)
      err.status = 404
      throw err
    }
    return {
      id: screening.id,
      travelerRef: screening.travelerRef,
      travelerName: screening.travelerName,
      documentType: screening.documentType,
      documentNumber: screening.documentNumber,
      nationality: screening.nationality,
      createdAt: screening.createdAt,
      decision: screening.decision,
      overallScore: screening.overallScore,
      summary: screening.summary,
      recommendedAction: screening.recommendedAction,
      extractedFields: screening.extractedFields || [],
      findings: screening.findings || [],
      ocrAnalysis: screening.ocrAnalysis || {},
      mrzVerification: screening.mrzVerification || {},
      documentValidation: screening.documentValidation || {},
      forensics: screening.forensics || {},
      faceVerification: screening.faceVerification || {},
      watchlist: screening.watchlist || {},
      audit: screening.audit || {},
    }
  },

  async listScreenings(filters = {}) {
    await delay(250)
    let list = db.getAllScreenings()

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.travelerRef?.toLowerCase().includes(q) ||
          s.travelerName?.toLowerCase().includes(q) ||
          s.documentType?.toLowerCase().includes(q) ||
          s.documentNumber?.toLowerCase().includes(q)
      )
    }

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((s) => s.status?.toLowerCase() === filters.status.toLowerCase())
    }

    if (filters.decision && filters.decision !== 'ALL') {
      list = list.filter((s) => s.decision?.toLowerCase() === filters.decision.toLowerCase())
    }

    if (filters.documentType && filters.documentType !== 'ALL') {
      list = list.filter((s) => s.documentType?.toLowerCase() === filters.documentType.toLowerCase())
    }

    return {
      items: list,
      total: list.length,
    }
  },

  async getAnalytics({ range = '7d' } = {}) {
    await delay(300)
    return db.getAnalyticsData(range)
  },

  async updateScreeningStatus(id, status, updates = {}) {
    await delay(100)
    return db.updateScreeningStatus(id, status, updates)
  },
}

export default mockHandlers
