import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FilePlus,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Activity,
  PlayCircle,
  Loader2,
} from 'lucide-react'
import { getDashboard } from '../services/api'
import { ROUTES } from '../constants/routes'
import { formatShortDateTime, getRiskLevel } from '../utils/format'
import PageHeader from '../components/layout/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTable from '../components/ui/DataTable'
import StatusChip from '../components/ui/StatusChip'
import Button from '../components/ui/Button'
import Panel from '../components/ui/Panel'

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getDashboard()
      setData(res)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Unable to load dashboard telemetry. Click refresh to retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const queueColumns = [
    {
      key: 'id',
      header: 'Screening ID',
      render: (row) => (
        <span className="font-mono font-bold text-console-accent hover:underline">
          {row.id}
        </span>
      ),
    },
    {
      key: 'traveler',
      header: 'Subject / Ref',
      render: (row) => (
        <div>
          <p className="font-medium text-console-text truncate max-w-[140px]">
            {row.travelerName || 'Synthetic Subject'}
          </p>
          <p className="font-mono text-[10px] text-console-muted">
            {row.travelerRef || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'documentType',
      header: 'Document',
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {row.documentType}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (row) => (
        <span className="font-mono text-[11px] text-console-muted">
          {formatShortDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'overallScore',
      header: 'Risk Score',
      align: 'right',
      render: (row) => {
        const risk = getRiskLevel(row.overallScore)
        return (
          <div className="font-mono font-bold text-right">
            <span className={risk.color}>{row.overallScore}</span>
            <span className="text-[10px] text-console-muted"> / 100</span>
          </div>
        )
      },
    },
    {
      key: 'decision',
      header: 'Decision Posture',
      align: 'center',
      render: (row) => <StatusChip status={row.decision || row.status} size="xs" />,
    },
    {
      key: 'officerName',
      header: 'Officer',
      render: (row) => (
        <span className="font-mono text-[11px] text-console-muted truncate">
          {row.officerId || 'OFF-1042'}
        </span>
      ),
    },
  ]

  const kpis = data?.kpis || {
    totalScreenings: 1284,
    cleared: 963,
    needsReview: 235,
    highRisk: 86,
  }

  const activeScreenings = data?.activeScreenings || [
    {
      id: 'VX-1047',
      travelerName: 'Carlos Mendez',
      documentType: 'Passport',
      stage: 'MRZ Verification',
      status: 'PROCESSING',
      score: null,
      startedAt: '1 min ago',
    },
    {
      id: 'VX-1046',
      travelerName: 'Sophia Lin',
      documentType: 'Visa',
      stage: 'Risk Assessment',
      status: 'NEEDS REVIEW',
      score: 47,
      startedAt: '3 mins ago',
    },
    {
      id: 'VX-1045',
      travelerName: 'Liam Andersen',
      documentType: 'Passport',
      stage: 'Completed',
      status: 'CLEAR',
      score: 18,
      startedAt: '5 mins ago',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Identity screening overview &amp; active inspection telemetry"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchDashboard}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={FilePlus}
              onClick={() => navigate(ROUTES.NEW_SCREENING)}
            >
              Start New Screening
            </Button>
          </div>
        }
      />

      {error && (
        <div className="border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Screenings"
          value={kpis.totalScreenings}
          subtext="Processed in active cycle"
          icon={Layers}
          variant="neutral"
          onClick={() => navigate(ROUTES.HISTORY)}
        />
        <StatCard
          label="Cleared"
          value={kpis.cleared}
          subtext={`${((kpis.cleared / (kpis.totalScreenings || 1)) * 100).toFixed(1)}% clearance rate`}
          icon={ShieldCheck}
          variant="clear"
          onClick={() => navigate(`${ROUTES.HISTORY}?decision=clear`)}
        />
        <StatCard
          label="Needs Review"
          value={kpis.needsReview}
          subtext={`${((kpis.needsReview / (kpis.totalScreenings || 1)) * 100).toFixed(1)}% flagged for secondary check`}
          icon={AlertTriangle}
          variant="review"
          onClick={() => navigate(`${ROUTES.HISTORY}?decision=review`)}
        />
        <StatCard
          label="High Risk"
          value={kpis.highRisk}
          subtext={`${((kpis.highRisk / (kpis.totalScreenings || 1)) * 100).toFixed(1)}% critical anomaly flags`}
          icon={ShieldAlert}
          variant="high"
          onClick={() => navigate(`${ROUTES.HISTORY}?decision=high_risk`)}
        />
      </div>

      {/* Operational Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-console-border bg-console-panel p-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-console-border bg-console-raised text-console-accent shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-console-muted">Avg Processing Time</p>
            <p className="font-mono text-sm font-semibold text-console-text">3.4 seconds / doc</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-console-border/70 pt-3 md:pt-0 md:pl-4">
          <div className="flex h-9 w-9 items-center justify-center border border-emerald-800/80 bg-emerald-950/40 text-emerald-400 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-console-muted">OCR Confidence</p>
            <p className="font-mono text-sm font-semibold text-emerald-400">99.2% Mean Confidence</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-console-border/70 pt-3 md:pt-0 md:pl-4">
          <div className="flex h-9 w-9 items-center justify-center border border-amber-800/80 bg-amber-950/40 text-amber-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-console-muted">Primary Flag Class</p>
            <p className="font-mono text-sm font-semibold text-amber-300">MRZ / Text Inconsistencies</p>
          </div>
        </div>
      </div>

      {/* Compact Operational Section: ACTIVE SCREENINGS */}
      <Panel
        title="Active Screenings Pipeline"
        subtitle="In-flight and recent pipeline execution stages"
        action={
          <span className="font-mono text-[10px] text-console-muted uppercase tracking-wider">
            LIVE MONITOR
          </span>
        }
      >
        <div className="divide-y divide-console-border/60">
          {activeScreenings.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.status === 'PROCESSING') {
                  navigate(ROUTES.SCREENING_STATUS(item.id))
                } else {
                  navigate(ROUTES.SCREENING_RESULT(item.id))
                }
              }}
              className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-bold text-console-accent text-xs">
                  {item.id}
                </span>
                <span className="text-console-text font-medium truncate">
                  {item.travelerName}
                </span>
                <span className="font-mono text-[11px] text-console-muted">
                  ({item.documentType})
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-5 justify-between sm:justify-end">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-console-muted">
                  {item.status === 'PROCESSING' ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400 shrink-0" />
                  ) : (
                    <Activity className="h-3 w-3 text-console-accent shrink-0" />
                  )}
                  <span>{item.stage}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.score !== null && (
                    <span className="font-mono text-[11px] font-bold text-console-text">
                      {item.score} <span className="text-[9px] text-console-muted">/100</span>
                    </span>
                  )}
                  <StatusChip status={item.status} size="xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent Screening Queue / Table */}
      <Panel
        title="Recent Screening Queue"
        subtitle="Latest automated document screening records"
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => navigate(ROUTES.HISTORY)}
            className="text-[11px]"
          >
            View Full History
          </Button>
        }
      >
        <DataTable
          columns={queueColumns}
          data={data?.recentQueue || []}
          loading={loading}
          onRowClick={(row) => navigate(ROUTES.SCREENING_RESULT(row.id))}
          emptyMessage="No recent screenings in active queue."
        />
      </Panel>
    </div>
  )
}

export default DashboardPage
