export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'neutral',
  className = '',
  onClick,
}) {
  const variantBorders = {
    neutral: 'border-console-border hover:border-console-border-strong',
    clear: 'border-console-border border-l-2 border-l-emerald-500',
    review: 'border-console-border border-l-2 border-l-amber-500',
    high: 'border-console-border border-l-2 border-l-rose-500',
    processing: 'border-console-border border-l-2 border-l-blue-500',
    accent: 'border-console-border border-l-2 border-l-console-accent',
  }

  const variantValues = {
    neutral: 'text-console-text',
    clear: 'text-emerald-400',
    review: 'text-amber-400',
    high: 'text-rose-400',
    processing: 'text-blue-400',
    accent: 'text-console-accent',
  }

  const borderClass = variantBorders[variant] || variantBorders.neutral
  const valueColor = variantValues[variant] || variantValues.neutral

  return (
    <div
      onClick={onClick}
      className={`border bg-console-panel p-4 transition-colors ${borderClass} ${onClick ? 'cursor-pointer hover:bg-console-raised/50' : ''} ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-console-muted truncate">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-console-muted shrink-0" />}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <span className={`font-mono text-2xl sm:text-3xl font-semibold tracking-tight ${valueColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] text-console-muted font-sans truncate">
          {subtext}
        </p>
      )}
    </div>
  )
}

export default StatCard
