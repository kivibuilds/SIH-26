import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Printer,
  RefreshCw,
} from 'lucide-react'
import { getScreeningAnalysis } from '../services/api'
import { ROUTES } from '../constants/routes'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import StatusChip from '../components/ui/StatusChip'
import FindingList from '../components/screening/FindingList'
import ExtractedFields from '../components/screening/ExtractedFields'
import StampAnalysisPanel from '../components/screening/StampAnalysisPanel'

export function ScreeningAnalysisPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchAnalysis = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await getScreeningAnalysis(id)
        if (!mounted) return
        setAnalysis(res)
      } catch (err) {
        if (!mounted) return
        console.error('Failed to load analysis:', err)
        setError(err.message || 'Analysis record not found')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAnalysis()

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="h-6 w-6 text-console-accent animate-spin" />
        <p className="font-mono text-xs uppercase tracking-wider text-console-muted">
          Compiling analysis for {id}...
        </p>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12">
        <div className="border border-rose-800 bg-rose-950/40 p-4 text-xs text-rose-300">
          <p className="font-semibold uppercase mb-1">Unable to Load Analysis</p>
          <p>{error || 'Detailed analysis payload could not be retrieved.'}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(ROUTES.SCREENING_RESULT(id))}>
          Back to Result
        </Button>
      </div>
    )
  }

  const ocr = analysis.ocrAnalysis || {}
  const mrz = analysis.mrzVerification || {}
  const docVal = analysis.documentValidation || {}
  const forensics = analysis.forensics || {}
  const face = analysis.faceVerification || {}
  const watchlist = analysis.watchlist || {}
  const audit = analysis.audit || {}

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detailed Analysis: ${analysis.id}`}
        subtitle={`Document Analysis • Prototype breakdown • ${analysis.documentType} • ${analysis.travelerName || 'Synthetic Subject'}`}
        badge={<StatusChip status={analysis.decision} />}
        backUrl={ROUTES.SCREENING_RESULT(analysis.id)}
        backLabel="Return to Result"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="text-[11px]"
            >
              Print Report
            </Button>
          </div>
        }
      />

      {/* Findings Section */}
      <FindingList findings={analysis.findings || []} />

      <StampAnalysisPanel analysis={analysis.stampAnalysis} documentType={analysis.documentType} />

      {/* Extracted Fields Table */}
      <ExtractedFields fields={analysis.extractedFields || []} />

      {/* Deep Subsystem Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. OCR Analysis */}
        <Panel
          title="Optical Character Recognition (OCR)"
          subtitle="Text extracted from visible document areas"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">OCR Confidence:</span>
              <span className={`font-bold ${Number(ocr.confidence) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ocr.confidence == null ? 'NOT AVAILABLE' : `${ocr.confidence}%`}
              </span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">OCR Tokens Detected:</span>
              <span className="text-console-text font-bold">{ocr.tokensDetected ?? ocr.fieldsDetected ?? 0}</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">OCR Tokens Requiring Review:</span>
              <span className={(ocr.tokensRequiringReview ?? ocr.fieldsRequiringReview ?? 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {ocr.tokensRequiringReview ?? ocr.fieldsRequiringReview ?? 0}
              </span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Structured Fields Parsed:</span>
              <span className="text-console-text font-bold">{ocr.structuredFieldsDetected ?? analysis.extractedFields?.length ?? 0}</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Structured Fields Requiring Review:</span>
              <span className="text-amber-400 font-bold">{ocr.structuredFieldsRequiringReview ?? 0}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-console-muted font-sans text-xs">OCR Engine Model:</span>
                <span className="text-console-muted">{ocr.engineVersion || 'Tesseract OCR'}</span>
            </div>
          </div>
        </Panel>

        {/* 2. MRZ Verification */}
        <Panel
          title="MRZ Verification"
          subtitle="Machine-readable zone checksums and lines"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">MRZ Format:</span>
              <span className="text-console-text font-semibold">{mrz.format || (mrz.checkDigits === 'VALID' ? 'ICAO 9303 TD3' : 'NOT AVAILABLE')}</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Check Digits:</span>
              <StatusChip status={mrz.checkDigits || 'NOT_FOUND'} size="xs" />
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">OCR ↔ MRZ Consistency:</span>
              <StatusChip status={mrz.ocrConsistency || 'NOT_FOUND'} size="xs" />
            </div>
            {mrz.rawLine1 && (
              <div className="mt-2 bg-black/60 p-2 border border-console-border text-[10px] space-y-1">
                <p className="text-slate-400 truncate">L1: {mrz.rawLine1}</p>
                {mrz.rawLine2 && <p className="text-slate-400 truncate">L2: {mrz.rawLine2}</p>}
                {mrz.rawLine3 && <p className="text-slate-400 truncate">L3: {mrz.rawLine3}</p>}
              </div>
            )}
          </div>
        </Panel>

        {/* 3. Document Validation */}
        <Panel
          title="Document Structural Validation"
          subtitle="Required fields and date validity checks"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Required Fields Present:</span>
              <span className="text-emerald-400 font-bold">{docVal.requiredFieldsPresent || '100%'}</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Date Validity &amp; Expiry:</span>
              <StatusChip status={docVal.dateValidity || 'VALID'} size="xs" />
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Cross-Field Consistency:</span>
              <span className={docVal.crossFieldConsistency === 'VALID' ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                {docVal.crossFieldConsistency || 'VALID'}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-console-muted font-sans text-xs">Template Match Score:</span>
              <span className="text-console-text font-bold">{docVal.templateMatchScore || 'NOT AVAILABLE'}</span>
            </div>
          </div>
        </Panel>

        {/* 4. Document Forensics */}
        <Panel
          title="Document Forensics &amp; Tamper Analysis"
          subtitle="Check for potential text alterations and anomalies"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Tampering Confidence:</span>
              <span className={`font-bold ${Number(forensics.tamperingConfidence) > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {forensics.tamperingConfidence == null ? 'NOT AVAILABLE' : `${Number(forensics.tamperingConfidence).toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Text Manipulation:</span>
              <span className={forensics.textManipulation === 'DETECTED' ? 'text-rose-400 font-bold' : forensics.textManipulation === 'POSSIBLE_INCONSISTENCY' ? 'text-amber-400' : 'text-emerald-400'}>
                {forensics.textManipulation || 'NOT DETECTED'}
              </span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Photo Anomaly:</span>
              <span className={forensics.photoAnomaly !== 'NONE' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {forensics.photoAnomaly || 'NONE'}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-console-muted font-sans text-xs">Noise Residual Check:</span>
              <span className="text-console-text">{forensics.elaResult || 'NOT AVAILABLE'}</span>
            </div>
          </div>
        </Panel>

        {/* 5. Face Verification */}
        <Panel
          title="Face Verification (Biometric Similarity)"
          subtitle="Document photo vs presented face photo comparison"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Document Photo Detected:</span>
              <span className="text-console-muted font-bold">NOT CHECKED</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Presented Face Detected:</span>
              <span className="text-console-muted font-bold">NOT PROVIDED</span>
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Face Similarity:</span>
              <span className="text-console-muted font-bold text-sm">
                {face.similarityScore == null ? 'NOT AVAILABLE' : `${face.similarityScore}%`}
              </span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-console-muted font-sans text-xs">Verification Status:</span>
              <StatusChip status={face.status || 'NOT PERFORMED'} size="xs" />
            </div>
            {face.reason && (
              <p className="pt-1 text-[11px] text-console-muted font-sans">{face.reason}</p>
            )}
          </div>
        </Panel>

        {/* 6. Simulated Watchlist */}
        <Panel
          title="Simulated Watchlist Query"
          subtitle="Comparison against synthetic test alert registry"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Watchlist Status:</span>
              <StatusChip status={watchlist.status || 'CLEAR'} size="xs" />
            </div>
            <div className="flex justify-between border-b border-console-border/60 pb-2">
              <span className="text-console-muted font-sans text-xs">Target Index:</span>
              <span className="text-console-text">{watchlist.database || 'Simulated Watchlist (Synthetic DB)'}</span>
            </div>
            <div className="pt-1">
              <p className="text-[11px] text-console-muted font-sans leading-relaxed">
                {watchlist.notes || 'No matches against synthetic alert database or stolen document registries.'}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Prototype Audit Record */}
      <Panel
        title="Prototype Audit Record"
        subtitle="Simulated tamper-evident screening receipt"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-console-border/80 bg-console-raised p-3 space-y-1">
              <span className="text-[10px] uppercase text-console-muted">Audit Status</span>
              <p className="font-bold text-emerald-400 uppercase">{audit.status || 'Recorded'}</p>
            </div>
            <div className="border border-console-border/80 bg-console-raised p-3 space-y-1">
              <span className="text-[10px] uppercase text-console-muted">Synthetic Reference</span>
              <p className="font-bold text-console-text truncate">{audit.txRef || 'Unavailable'}</p>
            </div>
            <div className="border border-console-border/80 bg-console-raised p-3 space-y-1">
              <span className="text-[10px] uppercase text-console-muted">Sequence ID</span>
              <p className="font-bold text-console-accent">{audit.blockNumber ?? 'Unavailable'}</p>
            </div>
          </div>

          <div className="border border-console-border/80 bg-black/50 p-3">
            <p className="text-[10px] uppercase text-console-muted mb-1">Document Digest (SHA-256):</p>
            <p className="text-slate-300 break-all text-[11px]">
              {audit.documentHash || audit.hash || 'Unavailable'}
            </p>
          </div>

          <p className="text-[10px] text-console-muted/80 font-sans">
            * Prototype Audit Record: Demonstrates how screening records can be stamped with a hash and timestamp for integrity without exposing personal identity data.
          </p>
        </div>
      </Panel>
    </div>
  )
}

export default ScreeningAnalysisPage
