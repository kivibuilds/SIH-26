import { CheckCircle2 } from 'lucide-react'
import { getSeverityProps } from '../../utils/format'
import StatusChip from '../ui/StatusChip'

export function FindingList({
  findings = [],
  title = 'Inspection Findings & Observations',
  emptyMessage = 'No significant anomalies detected in document security features or biometric matching.',
  className = '',
}) {
  return (
    <div className={`border border-console-border bg-console-panel ${className}`}>
      <div className="border-b border-console-border px-4 py-3 bg-console-raised/50 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-console-text">
          {title}
        </h4>
        <span className="font-mono text-[11px] text-console-muted">
          {findings.length} {findings.length === 1 ? 'OBSERVATION' : 'OBSERVATIONS'}
        </span>
      </div>

      <div className="p-4">
        {findings.length === 0 ? (
          <div className="flex items-center gap-3 border border-emerald-800/60 bg-emerald-950/20 p-3.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {findings.map((f, idx) => {
              const sevProps = getSeverityProps(f.severity)
              return (
                <div
                  key={f.code || idx}
                  className={`border p-3.5 transition-colors ${sevProps.bg} ${sevProps.border}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <StatusChip status={f.severity} size="xs" />
                      <span className="font-semibold text-xs text-console-text uppercase tracking-wide">
                        {f.title}
                      </span>
                    </div>
                    {f.code && (
                      <span className="font-mono text-[10px] text-console-muted">
                        {f.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-console-text/90 font-sans pl-1">
                    {f.detail}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default FindingList
