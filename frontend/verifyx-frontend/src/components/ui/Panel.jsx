export function Panel({
  children,
  title,
  subtitle,
  action,
  badge,
  className = '',
  bodyClassName = 'p-4',
  headerClassName = '',
}) {
  const hasHeader = Boolean(title || subtitle || action || badge)

  return (
    <div className={`border border-console-border bg-console-panel ${className}`}>
      {hasHeader && (
        <div
          className={`flex items-center justify-between border-b border-console-border px-4 py-3 bg-console-raised/50 ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {title && (
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-console-text truncate">
                {title}
              </h3>
            )}
            {badge}
            {subtitle && (
              <span className="text-[11px] text-console-muted truncate hidden sm:inline">
                {subtitle}
              </span>
            )}
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}

export default Panel
