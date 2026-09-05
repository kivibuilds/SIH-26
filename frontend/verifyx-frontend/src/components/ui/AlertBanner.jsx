import { AlertTriangle, ShieldAlert, Info, CheckCircle2, X } from 'lucide-react'

export function AlertBanner({
  variant = 'warning',
  title,
  message,
  children,
  onDismiss,
  className = '',
}) {
  const styles = {
    danger: {
      container: 'bg-rose-950/40 border-rose-800/80 text-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      titleColor: 'text-rose-300',
    },
    warning: {
      container: 'bg-amber-950/40 border-amber-800/80 text-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      titleColor: 'text-amber-300',
    },
    info: {
      container: 'bg-blue-950/40 border-blue-800/80 text-blue-200',
      icon: Info,
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300',
    },
    success: {
      container: 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      titleColor: 'text-emerald-300',
    },
  }

  const current = styles[variant] || styles.warning
  const Icon = current.icon

  return (
    <div className={`border p-3.5 flex items-start gap-3 ${current.container} ${className}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${current.titleColor}`}>
            {title}
          </h5>
        )}
        {message && <p className="text-xs leading-relaxed text-console-text/90 font-sans">{message}</p>}
        {children}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          className="text-console-muted hover:text-console-text shrink-0 p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default AlertBanner
