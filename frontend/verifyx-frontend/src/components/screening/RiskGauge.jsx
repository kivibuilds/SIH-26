import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function RiskGauge({
  score = 0,
  decision = 'clear',
  summary = '',
  recommendedAction = '',
  criticalFindings = [],
  className = '',
}) {
  const isHighRisk = score >= 70 || decision === 'high_risk'
  const isReview = (score >= 30 && score < 70) || decision === 'review'

  let badgeColor = 'text-emerald-400 border-emerald-800/80 bg-emerald-950/60'
  let Icon = CheckCircle2
  let title = 'LOW RISK'

  if (isHighRisk) {
    badgeColor = 'text-rose-300 border-rose-800/80 bg-rose-950/80'
    Icon = ShieldAlert
    title = 'HIGH RISK • MANUAL REVIEW REQUIRED'
  } else if (isReview) {
    badgeColor = 'text-amber-300 border-amber-800/80 bg-amber-950/80'
    Icon = AlertTriangle
    title = 'NEEDS OFFICER REVIEW'
  }

  return (
    <div
      className={`border ${
        isHighRisk
          ? 'border-rose-800/90 bg-rose-950/20'
          : isReview
          ? 'border-amber-800/80 bg-amber-950/15'
          : 'border-console-border bg-console-panel'
      } p-5 ${className}`}
    >
      {/* Top Section: Score + Posture + Visual Meter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-console-border/80 pb-4">
        {/* Score and Decision Posture */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-console-muted">
              Risk Score
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`font-mono text-4xl sm:text-5xl font-bold tracking-tight ${
                  isHighRisk ? 'text-rose-400' : isReview ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {score}
              </span>
              <span className="font-mono text-sm text-console-muted">/ 100</span>
            </div>
          </div>

          <div className="h-12 w-px bg-console-border mx-1 hidden sm:block" />

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-console-muted">
              Screening Posture
            </span>
            <div
              className={`mt-1.5 inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-mono font-bold tracking-wider ${badgeColor}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{title}</span>
            </div>
          </div>
        </div>

        {/* Visual Multi-segment Meter */}
        <div className="w-full md:w-64 space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono text-console-muted uppercase">
            <span>Risk Meter</span>
            <span className={isHighRisk ? 'text-rose-400 font-bold' : isReview ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {score < 30 ? '0-29 LOW RISK' : score < 70 ? '30-69 REVIEW' : '70-100 HIGH RISK'}
            </span>
          </div>
          <div className="relative h-3 w-full border border-console-border bg-console-raised flex overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                score < 30 ? 'bg-emerald-500' : score < 70 ? 'bg-amber-500' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(Math.max(score, 6), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-console-muted/70">
            <span>0</span>
            <span className="text-amber-500/80">| 30</span>
            <span className="text-rose-500/80">| 70</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* High-Risk Critical Findings Callout */}
      {isHighRisk && criticalFindings && criticalFindings.length > 0 && (
        <div className="mt-4 border border-rose-800/80 bg-rose-950/50 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
            <span>Critical Findings Requiring Immediate Attention:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-200/90 font-sans space-y-1 pl-1">
            {criticalFindings.map((f, idx) => (
              <li key={idx}>
                <strong className="font-semibold text-rose-100">{f.title || f}:</strong>{' '}
                {f.detail || 'Discrepancy detected during automated verification.'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* System Assessment Summary */}
      {summary && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-console-muted mb-1">
            System Assessment
          </p>
          <p className="text-xs text-console-text/90 font-sans leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {/* Recommended Officer Action Notice */}
      {recommendedAction && (
        <div
          className={`mt-3.5 border p-3.5 ${
            isHighRisk
              ? 'border-rose-800/90 bg-rose-950/60 text-rose-200'
              : isReview
              ? 'border-amber-800/80 bg-amber-950/40 text-amber-200'
              : 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold uppercase tracking-wider block font-mono text-[11px]">
                Recommended Action:
              </span>
              <p className="mt-0.5 font-sans leading-normal">
                {recommendedAction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Micro Prototype Disclaimer */}
      <div className="mt-3 pt-2.5 border-t border-console-border/40 flex items-center justify-between text-[10px] text-console-muted font-mono">
        <span>AI-ASSISTED RISK ASSESSMENT</span>
        <span>REQUIRES OFFICER EVALUATION</span>
      </div>
    </div>
  )
}

export default RiskGauge
