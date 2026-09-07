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

  const kpis = data?.kpis || { totalScreenings: 0, cleared: 0, needsReview: 0, highRisk: 0 }

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
          subtext={`${kpis.syntheticBaseline || 0} synthetic baseline + ${kpis.liveScreenings || 0} uploaded`}
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
