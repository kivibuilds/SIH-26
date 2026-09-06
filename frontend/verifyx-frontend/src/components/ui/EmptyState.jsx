import { FolderSearch } from 'lucide-react'

export function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No records located',
  description = 'No screening records match the active query filters or parameters.',
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-console-border bg-console-panel/60 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center border border-console-border bg-console-raised text-console-muted mb-3.5">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-console-text">
        {title}
      </h4>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-console-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
