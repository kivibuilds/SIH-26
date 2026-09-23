import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Printer,
  Upload,
} from 'lucide-react'
import { getScreeningResult, verifyUploadedDocument } from '../services/api'
import { ROUTES } from '../constants/routes'
import { formatDateTime } from '../utils/format'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import StatusChip from '../components/ui/StatusChip'
import RiskGauge from '../components/screening/RiskGauge'
import DocumentPreview from '../components/screening/DocumentPreview'
import StampAnalysisPanel from '../components/screening/StampAnalysisPanel'

export function ScreeningResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [result, setResult] = useState(location.state?.screeningResult || null)
  const [loading, setLoading] = useState(!location.state?.screeningResult)
  const [error, setError] = useState(null)
  const [integrity, setIntegrity] = useState(null)
  const [integrityLoading, setIntegrityLoading] = useState(false)

  useEffect(() => {
    if (location.state?.screeningResult) return undefined

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
  }, [id, location.state])

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

  const highRiskCriticalFindings = isHighRisk ? result.findings || [] : []
  const audit = result.audit || {}

  const handleIntegrityCheck = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setIntegrityLoading(true)
      setIntegrity(null)
      setIntegrity(await verifyUploadedDocument(result.id, file))
    } catch (err) {
      setIntegrity({ integrity: 'FAILED', error: err.message || 'Integrity verification failed.' })
    } finally {
      setIntegrityLoading(false)
    }
  }

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

      <StampAnalysisPanel analysis={result.stampAnalysis} documentType={result.documentType} />

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
                Verification Audit Record
              </p>
              <p className="text-console-text font-bold mt-0.5">ID: {audit.verificationId || result.id}</p>
              <p className="text-[10px] text-console-muted">
                SHA-256: {audit.documentHash || 'Unavailable'}
              </p>
              <p className="text-[10px] text-console-muted break-all">TX: {audit.txRef || 'Unavailable'}</p>
              <p className="text-[10px] text-console-muted">Block: {audit.blockNumber ?? 'Unavailable'}</p>
            </div>
            <div className="border border-console-border/80 bg-console-raised px-2.5 py-1 text-[10px] text-console-accent font-semibold uppercase">
              STATUS: {audit.status || 'PENDING'}
            </div>
          </div>

          <div className="border border-console-border bg-console-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-semibold text-console-muted tracking-wider">Document Integrity</p>
              <p className={`text-xs mt-1 font-semibold ${integrity?.integrity === 'VERIFIED' ? 'text-emerald-400' : integrity?.integrity === 'FAILED' ? 'text-rose-300' : 'text-console-text'}`}>
                {integrity?.integrity || 'Not checked'}
              </p>
              {integrity && (
                <div className="mt-2 space-y-1 text-[10px] text-console-muted font-mono">
                  <p>Registered hash: <span className="break-all text-console-text">{integrity.registered_hash || integrity.expected_hash || 'Unavailable'}</span></p>
                  <p>Uploaded hash: <span className="break-all text-console-text">{integrity.uploaded_hash || 'Unavailable'}</span></p>
                  <p>Hash status: <span className={integrity.match_status === 'MATCH' ? 'text-emerald-400' : 'text-rose-300'}>{integrity.match_status || (integrity.blockchain_match ? 'MATCH' : 'MISMATCH')}</span></p>
                </div>
              )}
              {integrity?.failure_reason && <p className="text-[10px] text-rose-300 mt-2">{integrity.failure_reason}</p>}
              {integrity?.error && <p className="text-[10px] text-rose-300 mt-1">{integrity.error}</p>}
            </div>
            <label className="inline-flex items-center justify-center gap-2 h-9 px-3.5 text-xs uppercase font-medium bg-console-raised text-console-text border border-console-border hover:border-console-border-strong cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>{integrityLoading ? 'Checking...' : 'Verify Re-upload'}</span>
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleIntegrityCheck} disabled={integrityLoading} />
            </label>
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
