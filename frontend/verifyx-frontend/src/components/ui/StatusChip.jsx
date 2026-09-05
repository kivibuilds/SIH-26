import { CheckCircle2, AlertTriangle, ShieldAlert, Loader2, Clock, XCircle, Info } from 'lucide-react'

export function StatusChip({ status, type = 'status', className = '', showIcon = true, size = 'sm' }) {
  if (!status) return null

  const s = String(status).toLowerCase()

  let label = status
  let styleClass = 'bg-slate-900 text-slate-300 border-slate-700'
  let Icon = Info

  if (s === 'clear' || s === 'cleared' || s === 'valid' || s === 'match') {
    label = s === 'clear' ? 'CLEAR' : s.toUpperCase()
    styleClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
    Icon = CheckCircle2
  } else if (s === 'review' || s === 'needs_review' || s === 'needs review' || s === 'flagged' || s === 'inconsistent') {
    label = 'NEEDS REVIEW'
    styleClass = 'bg-amber-950/70 text-amber-300 border-amber-800/80'
    Icon = AlertTriangle
  } else if (s === 'high_risk' || s === 'high risk' || s === 'high' || s === 'failed' || s === 'invalid' || s === 'mismatch' || s === 'critical') {
    label = s === 'high_risk' || s === 'high risk' ? 'HIGH RISK' : s.toUpperCase()
    styleClass = 'bg-rose-950/70 text-rose-300 border-rose-800/80'
    Icon = ShieldAlert
  } else if (s === 'processing') {
    label = 'PROCESSING'
    styleClass = 'bg-blue-950/70 text-blue-300 border-blue-800/80'
    Icon = Loader2
  } else if (s === 'pending') {
    label = 'PENDING'
    styleClass = 'bg-slate-900 text-slate-400 border-slate-700'
    Icon = Clock
  } else if (s === 'medium') {
    label = 'MEDIUM'
    styleClass = 'bg-amber-950/60 text-amber-300 border-amber-800/70'
    Icon = AlertTriangle
  } else if (s === 'low') {
    label = 'LOW'
    styleClass = 'bg-slate-900 text-slate-300 border-slate-700'
    Icon = Info
  } else if (s === 'info') {
    label = 'INFO'
    styleClass = 'bg-blue-950/50 text-blue-300 border-blue-900/60'
    Icon = Info
  }

  const sizeClass = size === 'xs' 
    ? 'text-[10px] px-1.5 py-0.5 tracking-wider' 
    : 'text-[11px] px-2 py-0.5 tracking-wider'

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium uppercase border ${styleClass} ${sizeClass} ${className}`}
    >
      {showIcon && (
        <Icon className={`shrink-0 ${size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${s === 'processing' ? 'animate-spin' : ''}`} />
      )}
      <span>{label}</span>
    </span>
  )
}

export default StatusChip
