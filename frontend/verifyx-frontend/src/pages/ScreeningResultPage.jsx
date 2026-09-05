import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Printer,
  FileCheck,
  UserCheck,
  Layers,
  Database,
  Search,
} from 'lucide-react'
import { getScreeningResult } from '../services/api'
import { ROUTES } from '../constants/routes'
import { formatDateTime } from '../utils/format'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import StatusChip from '../components/ui/StatusChip'
import RiskGauge from '../components/screening/RiskGauge'
import DocumentPreview from '../components/screening/DocumentPreview'

export function ScreeningResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchResult = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await getScreeningResult(id)
        if (!mounted) return
        setResult(res)
      } catch (err) {
        if (!mounted) return
        console.error('Failed to load result:', err)
        setError(err.message || 'Screening result record not found')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchResult()

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="h-6 w-6 text-console-accent animate-spin" />
        <p className="font-mono text-xs uppercase tracking-wider text-console-muted">
          Loading consolidated screening record {id}...
        </p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12">
        <div className="border border-rose-800 bg-rose-950/40 p-4 text-xs text-rose-300">
          <p className="font-semibold uppercase mb-1">Unable to Load Record</p>
          <p>{error || 'Screening data could not be retrieved.'}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const checks = result.checks || {}
  const isHighRisk = result.decision === 'high_risk' || result.overallScore >= 70

  const highRiskCriticalFindings = isHighRisk
    ? [
        { title: 'Date of Birth Mismatch', detail: 'Visible document birth date does not match the machine-readable zone.' },
        { title: 'MRZ Inconsistency', detail: 'Machine-readable zone check digit calculation failed.' },
        { title: 'Possible Text Manipulation', detail: 'Tampering confidence: 87% in numeric date field typography.' },
        { title: 'Face Mismatch', detail: 'Presented face similarity score (34.2%) is below threshold.' },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Screening Result: ${result.id}`}
        subtitle={`Processed on ${formatDateTime(result.createdAt)} by Officer ${result.officerId || 'OFF-1042'}`}
        badge={<StatusChip status={result.decision} />}
        backUrl={ROUTES.DASHBOARD}
        backLabel="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="hidden sm:inline-flex text-[11px]"
            >
              Print Record
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate(ROUTES.SCREENING_ANALYSIS(result.id))}
            >
              View Detailed Analysis
            </Button>
          </div>
        }
      />

      {/* Primary Risk & Decision Assessment Banner */}
      <RiskGauge
        score={result.overallScore}
        decision={result.decision}
        summary={result.summary}
        recommendedAction={result.recommendedAction}
        criticalFindings={highRiskCriticalFindings}
      />

      {/* Main Grid: Verification Modules & Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5 Core Verification Cards */}
        <div className="lg:col-span-7 space-y-4">
          <Panel
            title="Core Verification Checks"
            subtitle="Automated subsystem validation status"
            action={
              <span className="font-mono text-[11px] text-console-muted">
                PROTOTYPE VALIDATION
              </span>
            }
          >
            <div className="space-y-3">
              {/* 1. Document Validation */}
              <div
                className={`border p-3.5 flex items-start justify-between gap-3 ${
                  checks.docValidation?.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : isHighRisk
                    ? 'border-rose-900/70 bg-rose-950/30'
                    : 'border-amber-900/70 bg-amber-950/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {checks.docValidation?.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                      Document Validation
                    </h4>
                    <p className="text-[11px] text-console-muted mt-0.5">
                      {checks.docValidation?.officerNote || (checks.docValidation?.passed ? 'Format and expiration parameters are valid.' : 'Discrepancy detected in document field formats.')}
                    </p>
                  </div>
                </div>
                <StatusChip status={checks.docValidation?.status || (checks.docValidation?.passed ? 'VALID' : 'FAILED')} size="xs" />
              </div>

              {/* 2. MRZ Verification */}
              <div
                className={`border p-3.5 flex items-start justify-between gap-3 ${
                  checks.mrzVerification?.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-rose-900/70 bg-rose-950/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {checks.mrzVerification?.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                      MRZ Verification
                    </h4>
                    <p className="text-[11px] text-console-muted mt-0.5">
                      {checks.mrzVerification?.officerNote || (checks.mrzVerification?.passed ? 'Machine-readable zone checksums match document information.' : 'Machine-readable zone does not match visible document text.')}
                    </p>
                  </div>
                </div>
                <StatusChip status={checks.mrzVerification?.status || (checks.mrzVerification?.passed ? 'VALID' : 'FAILED')} size="xs" />
              </div>

              {/* 3. Tampering Analysis */}
              <div
                className={`border p-3.5 flex items-start justify-between gap-3 ${
                  checks.tamperingAnalysis?.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-rose-900/70 bg-rose-950/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {checks.tamperingAnalysis?.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                      Tampering Analysis
                    </h4>
                    <p className="text-[11px] text-console-muted mt-0.5">
                      {checks.tamperingAnalysis?.officerNote || (checks.tamperingAnalysis?.passed ? 'No significant tampering indicators or font alterations detected.' : 'Possible text or font alteration detected.')}
                    </p>
                  </div>
                </div>
                <StatusChip status={checks.tamperingAnalysis?.status || (checks.tamperingAnalysis?.passed ? 'CLEARED' : 'FAILED')} size="xs" />
              </div>

              {/* 4. Face Verification */}
              <div
                className={`border p-3.5 flex items-start justify-between gap-3 ${
                  checks.faceVerification?.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-rose-900/70 bg-rose-950/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {checks.faceVerification?.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                      Face Verification
                    </h4>
                    <p className="text-[11px] text-console-muted mt-0.5">
                      {checks.faceVerification?.officerNote || (checks.faceVerification?.passed ? 'Presented face matches document photo within acceptable threshold.' : 'Presented face does not sufficiently match the document photo.')}
                    </p>
                  </div>
                </div>
                <StatusChip status={checks.faceVerification?.status || (checks.faceVerification?.passed ? 'MATCH' : 'MISMATCH')} size="xs" />
              </div>

              {/* 5. Watchlist Check */}
              <div
                className={`border p-3.5 flex items-start justify-between gap-3 ${
                  checks.watchlistCheck?.passed
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-rose-900/70 bg-rose-950/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {checks.watchlistCheck?.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                      Simulated Watchlist Check
                    </h4>
                    <p className="text-[11px] text-console-muted mt-0.5">
                      {checks.watchlistCheck?.officerNote || (checks.watchlistCheck?.passed ? 'No flags found in simulated alert registry.' : 'Simulated alert flag detected.')}
                    </p>
                  </div>
                </div>
                <StatusChip status={checks.watchlistCheck?.status || (checks.watchlistCheck?.passed ? 'CLEAR' : 'FLAGGED')} size="xs" />
              </div>
            </div>
          </Panel>

          {/* Prototype Audit Record */}
          <div className="border border-console-border bg-console-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div>
              <p className="text-[10px] uppercase font-semibold text-console-muted tracking-wider">
                Prototype Audit Record
              </p>
              <p className="text-console-text font-bold mt-0.5">
                Ref: {result.audit?.txRef || '0x7a91...c42e'}
              </p>
              <p className="text-[10px] text-console-muted">
                Timestamp: {result.audit?.timestamp || '02 Sep 2026, 01:42 UTC'}
              </p>
            </div>
            <div className="border border-console-border/80 bg-console-raised px-2.5 py-1 text-[10px] text-console-accent font-semibold uppercase">
              STATUS: RECORDED (DEMO AUDIT)
            </div>
          </div>
        </div>

        {/* Right: Document Scan Inspection Visualizer */}
        <div className="lg:col-span-5 space-y-4">
          <DocumentPreview
            screening={result}
            showControls={true}
          />

          <div className="border border-console-border bg-console-panel p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text font-mono">
              Action Next Steps
            </h4>
            <div className="space-y-2 text-xs">
              <Button
                variant="primary"
                size="md"
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => navigate(ROUTES.SCREENING_ANALYSIS(result.id))}
                className="w-full justify-between"
              >
                <span>Inspect Field Analysis</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(ROUTES.NEW_SCREENING)}
                className="w-full justify-between"
              >
                <span>Start Another Screening</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScreeningResultPage
