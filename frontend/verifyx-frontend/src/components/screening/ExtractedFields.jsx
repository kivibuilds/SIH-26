import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export function ExtractedFields({
  fields = [],
  title = 'Extracted Document Information',
  className = '',
}) {
  const parsedFields = fields.filter((field) => field.value !== 'Not detected')
  const missingFields = fields.filter((field) => field.value === 'Not detected')
  const getSourceBadge = (source) => {
    switch (source) {
      case 'MRZ':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/80'
      case 'CHIP':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/80'
      case 'VIZ':
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700'
    }
  }

  const getStatusIcon = (status) => {
    if (status === 'invalid') {
      return <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
    }
    if (status === 'review') {
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
    }
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
  }

  return (
    <div className={`border border-console-border bg-console-panel ${className}`}>
      <div className="border-b border-console-border px-4 py-3 bg-console-raised/50 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-console-text">
          {title}
        </h4>
        <span className="font-mono text-[11px] text-console-muted">
          {parsedFields.length} FIELDS PARSED{missingFields.length > 0 ? ` • ${missingFields.length} NEED REVIEW` : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-console-border bg-console-raised/30 text-[10px] uppercase tracking-[0.16em] text-console-muted">
              <th className="py-2 px-4 font-medium">Field Identifier</th>
              <th className="py-2 px-4 font-medium">Extracted Value</th>
              <th className="py-2 px-4 font-medium">Source</th>
              <th className="py-2 px-4 font-medium text-right">Confidence</th>
              <th className="py-2 px-4 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-console-border/60 font-mono">
            {parsedFields.map((f, idx) => {
              const confPct = typeof f.confidence === 'number' ? (f.confidence * 100).toFixed(0) : f.confidence
              return (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 text-console-muted font-sans text-xs">
                    {f.key}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-console-text">
                    <span className={f.status === 'invalid' ? 'text-rose-400' : f.status === 'review' ? 'text-amber-400' : 'text-console-text'}>
                      {f.value}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] uppercase font-mono border ${getSourceBadge(f.source)}`}>
                      {f.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`font-mono text-xs ${Number(confPct) < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {confPct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex justify-center">{getStatusIcon(f.status)}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {missingFields.length > 0 && (
        <div className="border-t border-console-border px-4 py-3 text-[11px] text-amber-300">
          Missing or uncertain: {missingFields.map((field) => field.key).join(', ')}
        </div>
      )}
    </div>
  )
}

export default ExtractedFields
