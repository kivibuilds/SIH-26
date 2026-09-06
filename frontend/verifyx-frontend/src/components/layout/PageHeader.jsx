import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '../ui/Button'

export function PageHeader({
  title,
  subtitle,
  badge,
  backUrl,
  backLabel = 'Back',
  actions,
  className = '',
}) {
  const navigate = useNavigate()

  return (
    <div className={`border-b border-console-border pb-4 mb-6 ${className}`}>
      {backUrl && (
        <button
          onClick={() => navigate(backUrl)}
          className="mb-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-console-muted hover:text-console-accent transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>{backLabel}</span>
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-lg sm:text-xl font-bold uppercase tracking-wider text-console-text truncate">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-console-muted font-sans max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

export default PageHeader
