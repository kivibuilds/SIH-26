import { SCREENING_DECISION, SCREENING_STATUS, SEVERITY } from '../constants/screeningStatus'

export function formatDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString

  const datePart = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return `${datePart}, ${timePart}`
}

export function formatShortDateTime(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString

  const datePart = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${datePart} ${timePart}`
}

export function formatPercent(val) {
  if (val === null || val === undefined) return '—'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return `${num.toFixed(1)}%`
}

export function truncateHash(hash, leading = 6, trailing = 4) {
  if (!hash) return '—'
  if (hash.length <= leading + trailing) return hash
  return `${hash.slice(0, leading)}...${hash.slice(-trailing)}`
}

export function getRiskLevel(score) {
  if (score === null || score === undefined) return { label: 'UNKNOWN', key: 'unknown', color: 'text-console-muted' }
  if (score < 30) return { label: 'LOW RISK', key: 'low', color: 'text-status-clear', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' }
  if (score < 70) return { label: 'NEEDS REVIEW', key: 'review', color: 'text-status-review', bg: 'bg-amber-950/40', border: 'border-amber-800/60' }
  return { label: 'HIGH RISK', key: 'high', color: 'text-status-high', bg: 'bg-rose-950/40', border: 'border-rose-800/60' }
}

export function getDecisionBadgeProps(decision) {
  switch (decision?.toLowerCase()) {
    case SCREENING_DECISION.CLEAR:
    case 'clear':
      return {
        label: 'CLEAR',
        variant: 'clear',
        className: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80',
      }
    case SCREENING_DECISION.REVIEW:
    case 'review':
    case 'needs_review':
      return {
        label: 'NEEDS REVIEW',
        variant: 'review',
        className: 'bg-amber-950/60 text-amber-300 border border-amber-800/80',
      }
    case SCREENING_DECISION.HIGH_RISK:
    case 'high_risk':
      return {
        label: 'HIGH RISK',
        variant: 'high_risk',
        className: 'bg-rose-950/60 text-rose-300 border border-rose-800/80',
      }
    default:
      return {
        label: decision?.toUpperCase() || 'UNKNOWN',
        variant: 'neutral',
        className: 'bg-slate-900 text-slate-300 border border-slate-700',
      }
  }
}

export function getStatusBadgeProps(status) {
  switch (status?.toLowerCase()) {
    case SCREENING_STATUS.COMPLETE:
    case 'complete':
      return {
        label: 'COMPLETE',
        variant: 'complete',
        className: 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/70',
      }
    case SCREENING_STATUS.PROCESSING:
    case 'processing':
      return {
        label: 'PROCESSING',
        variant: 'processing',
        className: 'bg-blue-950/50 text-blue-400 border border-blue-800/70 animate-pulse',
      }
    case SCREENING_STATUS.PENDING:
    case 'pending':
      return {
        label: 'PENDING',
        variant: 'pending',
        className: 'bg-slate-900 text-slate-400 border border-slate-700',
      }
    case SCREENING_STATUS.FAILED:
    case 'failed':
      return {
        label: 'FAILED',
        variant: 'failed',
        className: 'bg-rose-950/50 text-rose-400 border border-rose-800/70',
      }
    default:
      return {
        label: status?.toUpperCase() || 'UNKNOWN',
        variant: 'neutral',
        className: 'bg-slate-900 text-slate-400 border border-slate-700',
      }
  }
}

export function getSeverityProps(severity) {
  switch (severity?.toLowerCase()) {
    case SEVERITY.CRITICAL:
    case 'critical':
      return {
        label: 'CRITICAL',
        color: 'text-rose-400',
        bg: 'bg-rose-950/60',
        border: 'border-rose-800',
        chipClass: 'bg-rose-950/80 text-rose-300 border border-rose-800',
      }
    case SEVERITY.HIGH:
    case 'high':
      return {
        label: 'HIGH',
        color: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-800/70',
        chipClass: 'bg-rose-950/60 text-rose-300 border border-rose-800/70',
      }
    case SEVERITY.MEDIUM:
    case 'medium':
      return {
        label: 'MEDIUM',
        color: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-800/70',
        chipClass: 'bg-amber-950/60 text-amber-300 border border-amber-800/70',
      }
    case SEVERITY.LOW:
    case 'low':
      return {
        label: 'LOW',
        color: 'text-slate-300',
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        chipClass: 'bg-slate-900 text-slate-300 border border-slate-700',
      }
    case SEVERITY.INFO:
    case 'info':
    default:
      return {
        label: 'INFO',
        color: 'text-blue-400',
        bg: 'bg-blue-950/30',
        border: 'border-blue-900/60',
        chipClass: 'bg-blue-950/50 text-blue-300 border border-blue-800/60',
      }
  }
}
