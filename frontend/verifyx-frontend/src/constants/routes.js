export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  NEW_SCREENING: '/screening/new',
  SCREENING_STATUS: (id = ':id') => `/screening/${id}/status`,
  SCREENING_RESULT: (id = ':id') => `/screening/${id}/result`,
  SCREENING_ANALYSIS: (id = ':id') => `/screening/${id}/analysis`,
  HISTORY: '/history',
  ANALYTICS: '/analytics',
}

export default ROUTES
