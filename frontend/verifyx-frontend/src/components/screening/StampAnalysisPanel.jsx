import Panel from '../ui/Panel'
import StatusChip from '../ui/StatusChip'

function formatBox(box) {
  if (!box) return 'Unavailable'
  return `${Math.round(box.x * 100)}%, ${Math.round(box.y * 100)}% | ${Math.round(box.width * 100)}% x ${Math.round(box.height * 100)}%`
}

export function StampAnalysisPanel({ analysis, documentType }) {
  if (!['PASSPORT', 'VISA'].includes(String(documentType || '').toUpperCase()) || !analysis) {
    return null
  }

  const regions = analysis.stamp_regions || []
  const ocrFindings = analysis.ocr_findings || []
  const anomalies = analysis.anomalies || []
  const limitations = analysis.limitations || []
  const status = analysis.status || 'INSUFFICIENT_EVIDENCE'
  if (status === 'NO_STAMP_DETECTED') {
    return <Panel title="Stamp Forgery Analysis"><p className="text-xs text-console-muted">No stamp detected — stamp analysis not applicable.</p></Panel>
  }
  if (status === 'UNCERTAIN' || status === 'INSUFFICIENT_EVIDENCE') {
    return <Panel title="Stamp Forgery Analysis"><p className="text-xs text-console-muted">Stamp detection inconclusive. No definitive stamp forgery conclusion is available.</p></Panel>
  }
  const flaggedRegions = regions.filter((region) => region.anomaly_indicators?.length > 0)
  const hasForgerySignals = flaggedRegions.length > 0

  return (
    <Panel
      title="Stamp Forgery Analysis"
      subtitle="Visual screening evidence for likely passport or visa stamp regions"
      badge={<StatusChip status={status} size="xs" />}
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-console-muted">
          <span>{regions.length} likely stamp regions</span>
          <span className={hasForgerySignals ? 'text-amber-300' : 'text-emerald-300'}>
            {hasForgerySignals ? `${flaggedRegions.length} with review signals` : 'no visual forgery signals'}
          </span>
          <span>{analysis.image_quality?.quality_status || 'QUALITY UNKNOWN'} image quality</span>
        </div>
        <p className="text-[11px] text-console-muted">
          {hasForgerySignals
            ? 'Visual anomalies were found. Review the marked regions with the original document.'
            : 'Stamp candidates were found, but no visual inconsistency crossed the review threshold.'}
          {' '}This is screening evidence, not a forgery verdict.
        </p>

        {regions.length > 0 && (
          <details className="border-t border-console-border pt-2">
            <summary className="cursor-pointer font-semibold uppercase tracking-wider text-console-text">Candidate evidence</summary>
            <div className="mt-2 space-y-1">
            {regions.map((region) => {
              const ocr = ocrFindings.find((item) => item.region_id === region.region_id)
              return (
                <div key={region.region_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-console-border/60 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-console-accent">{region.region_id}</span>
                    <span className="font-mono text-console-muted">Box: {formatBox(region.bounding_box)}</span>
                  </div>
                  <span className="text-console-muted">OCR: <span className="text-console-text">{ocr?.text || 'unreadable'}</span></span>
                  {region.anomaly_indicators?.length > 0 && (
                    <p className="text-amber-300">Indicators: {region.anomaly_indicators.join(', ')}</p>
                  )}
                </div>
              )
            })}
            </div>
          </details>
        )}

        {analysis.indicators?.length > 0 && (
          <details className="border-t border-console-border pt-2">
            <summary className="cursor-pointer font-semibold uppercase tracking-wider text-console-text">Review indicators ({anomalies.length})</summary>
            <ul className="list-disc pl-5 space-y-1 text-amber-200">
              {[...new Set(analysis.indicators)].map((indicator) => <li key={indicator}>{indicator}</li>)}
            </ul>
          </details>
        )}

        {limitations.length > 0 && (
          <details className="border-t border-console-border pt-2 text-console-muted">
            <summary className="cursor-pointer font-semibold uppercase tracking-wider text-console-text">Limitations ({limitations.length})</summary>
            {limitations.map((limitation, index) => <p key={`${limitation}-${index}`}>{limitation}</p>)}
          </details>
        )}
      </div>
    </Panel>
  )
}

export default StampAnalysisPanel
