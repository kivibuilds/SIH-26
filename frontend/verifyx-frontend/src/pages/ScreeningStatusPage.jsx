import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Terminal,
} from 'lucide-react'
import { getScreening, updateScreeningStatus } from '../services/api'
import { ROUTES } from '../constants/routes'
import { PIPELINE_STEPS, STEP_STATUS, SCREENING_STATUS } from '../constants/screeningStatus'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import StatusChip from '../components/ui/StatusChip'

export function ScreeningStatusPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [screening, setScreening] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // Fetch initial screening record
  useEffect(() => {
    let mounted = true

    const fetchInitial = async () => {
      try {
        setLoading(true)
        setError(null)
        const record = await getScreening(id)
        if (!mounted) return
        setScreening(record)

        if (record.status === SCREENING_STATUS.COMPLETE) {
          setCurrentStepIndex(PIPELINE_STEPS.length)
          setIsCompleted(true)
        }
      } catch (err) {
        if (!mounted) return
        console.error('Failed to load screening:', err)
        setError(err.message || 'Screening record not found')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchInitial()

    return () => {
      mounted = false
    }
  }, [id])

  // Pipeline execution simulation
  useEffect(() => {
    if (loading || error || isCompleted) return

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PIPELINE_STEPS.length - 1) {
          return prev + 1
        } else {
          clearInterval(interval)
          setIsCompleted(true)
          updateScreeningStatus(id, SCREENING_STATUS.COMPLETE).catch(console.warn)
          return PIPELINE_STEPS.length
        }
      })
    }, 450)

    return () => clearInterval(interval)
  }, [loading, error, isCompleted, id])

  // Auto navigate countdown when finished
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        navigate(ROUTES.SCREENING_RESULT(id))
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [isCompleted, id, navigate])

  const getStepStatus = (index) => {
    if (index < currentStepIndex) return STEP_STATUS.COMPLETE
    if (index === currentStepIndex && !isCompleted) return STEP_STATUS.PROCESSING
    return STEP_STATUS.PENDING
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Screening Pipeline: ${id}`}
        subtitle="Simulating automated document integrity, text extraction, and photo comparison checks"
        badge={
          isCompleted ? (
            <StatusChip status="COMPLETE" />
          ) : (
            <StatusChip status="PROCESSING" />
          )
        }
        backUrl={ROUTES.DASHBOARD}
        backLabel="Return to Dashboard"
      />

      {error ? (
        <div className="border border-rose-800/80 bg-rose-950/40 p-4 text-xs text-rose-300 space-y-3">
          <p className="font-semibold uppercase tracking-wider">{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Pipeline Progress */}
          <div className="lg:col-span-8 space-y-5">
            <Panel
              title="Verification Pipeline Execution"
              subtitle="8-stage modular screening process"
              action={
                <span className="font-mono text-xs text-console-accent font-semibold">
                  {Math.min(currentStepIndex, PIPELINE_STEPS.length)} / {PIPELINE_STEPS.length} STAGES
                </span>
              }
            >
              <div className="divide-y divide-console-border/70">
                {PIPELINE_STEPS.map((step, idx) => {
                  const status = getStepStatus(idx)
                  const isCurrent = status === STEP_STATUS.PROCESSING
                  const isDone = status === STEP_STATUS.COMPLETE

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start justify-between p-3.5 transition-colors ${
                        isCurrent
                          ? 'bg-blue-950/30 border-l-2 border-l-blue-400'
                          : isDone
                          ? 'bg-console-panel/40'
                          : 'opacity-55'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 text-console-muted" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-console-muted">
                              0{idx + 1}
                            </span>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-console-text">
                              {step.label}
                            </h4>
                          </div>
                          <p className="mt-0.5 text-[11px] text-console-muted font-sans truncate">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3">
                        <StatusChip status={status} size="xs" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>

            {/* Completion Transition Notice */}
            {isCompleted && (
              <div className="border border-emerald-800/80 bg-emerald-950/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase font-mono text-emerald-300">
                      Pipeline Execution Complete
                    </p>
                    <p className="text-[11px] text-console-muted">
                      Redirecting to consolidated screening result...
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => navigate(ROUTES.SCREENING_RESULT(id))}
                >
                  View Screening Result
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Ingest Session Metadata */}
          <div className="lg:col-span-4 space-y-5">
            <Panel
              title="Inspection Target"
              subtitle="Active screening parameters"
            >
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-console-border/60 pb-2">
                  <span className="text-console-muted font-sans text-xs">Screening Ref:</span>
                  <span className="font-bold text-console-accent">{screening?.id || id}</span>
                </div>
                <div className="flex justify-between border-b border-console-border/60 pb-2">
                  <span className="text-console-muted font-sans text-xs">Document Type:</span>
                  <span className="text-console-text">{screening?.documentType || 'Passport'}</span>
                </div>
                <div className="flex justify-between border-b border-console-border/60 pb-2">
                  <span className="text-console-muted font-sans text-xs">Subject Name:</span>
                  <span className="text-console-text truncate max-w-[150px]">
                    {screening?.travelerName || 'Alex Rivera'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-console-border/60 pb-2">
                  <span className="text-console-muted font-sans text-xs">Traveler Ref:</span>
                  <span className="text-console-text">{screening?.travelerRef || 'TRV-88219'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-console-muted font-sans text-xs">Officer ID:</span>
                  <span className="text-console-text">{screening?.officerId || 'OFF-1042'}</span>
                </div>
              </div>
            </Panel>

            <div className="border border-console-border bg-console-panel p-4 space-y-2 text-xs text-console-muted font-sans">
              <div className="flex items-center gap-2 text-console-text font-semibold uppercase text-[11px] font-mono">
                <Terminal className="h-3.5 w-3.5 text-console-accent" />
                <span>Simulated Pipeline Environment</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Verification steps simulate ICAO Doc 9303 checksum checks, OCR field extraction, typography alignment inspection, and synthetic photo similarity matching.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreeningStatusPage
