import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { getAnalytics } from '../services/api'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import StatCard from '../components/ui/StatCard'
import StatusChip from '../components/ui/StatusChip'
import Button from '../components/ui/Button'

export function AnalyticsPage() {
  const [range, setRange] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAnalytics({ range })
      setData(res)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Unable to load analytics telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [range])

  const overview = data?.overview || {
    total: 1284,
    cleared: 963,
    needsReview: 235,
    highRisk: 86,
    avgProcessingTimeSec: 3.4,
    passRate: 75.0,
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="border border-console-border bg-console-panel p-2.5 shadow-xl font-mono text-xs">
          <p className="font-semibold text-console-text uppercase text-[10px] border-b border-console-border pb-1 mb-1.5">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="flex items-center justify-between gap-3 text-[11px]" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const decisionDist = data?.decisionDistribution || [
    { name: 'Cleared', count: 963, percentage: 75.0, color: '#3d9b6e' },
    { name: 'Needs Review', count: 235, percentage: 18.3, color: '#c9a227' },
    { name: 'High Risk', count: 86, percentage: 6.7, color: '#c44c3a' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Analytics"
        subtitle="System throughput, risk classification distributions, and anomaly telemetry"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-console-border bg-console-panel text-xs font-mono">
              {['24h', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 uppercase transition-colors cursor-pointer ${
                    range === r
                      ? 'bg-console-accent text-slate-950 font-bold'
                      : 'text-console-muted hover:text-console-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchAnalytics}
              loading={loading}
              className="text-[11px]"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300 flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchAnalytics}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Screenings"
          value={overview.total}
          subtext="Volume across all checkpoints"
          icon={Layers}
          variant="neutral"
        />
        <StatCard
          label="Clearance Rate"
          value={`${overview.passRate}%`}
          subtext={`${overview.cleared} passed`}
          icon={ShieldCheck}
          variant="clear"
        />
        <StatCard
          label="Needs Review"
          value={overview.needsReview}
          subtext={`${((overview.needsReview / overview.total) * 100).toFixed(1)}% flagged`}
          icon={AlertTriangle}
          variant="review"
        />
        <StatCard
          label="High Risk"
          value={overview.highRisk}
          subtext={`${((overview.highRisk / overview.total) * 100).toFixed(1)}% critical`}
          icon={ShieldAlert}
          variant="high"
        />
        <StatCard
          label="Avg Pipeline Latency"
          value={`${overview.avgProcessingTimeSec}s`}
          subtext="Per document ingest"
          icon={Clock}
          variant="accent"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Screening Timeline Chart */}
        <div className="lg:col-span-8">
          <Panel
            title="Screening Volume &amp; Decision Trends"
            subtitle="Daily operational volume by decision outcome"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCleared" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3d9b6e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3d9b6e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a227" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#c9a227" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorHighRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c44c3a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#c44c3a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#2c3440" vertical={false} />
                  <XAxis dataKey="date" stroke="#8a94a3" fontSize={11} fontFamily="monospace" tickLine={false} />
                  <YAxis stroke="#8a94a3" fontSize={11} fontFamily="monospace" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cleared" name="Cleared" stroke="#3d9b6e" fillOpacity={1} fill="url(#colorCleared)" />
                  <Area type="monotone" dataKey="review" name="Review" stroke="#c9a227" fillOpacity={1} fill="url(#colorReview)" />
                  <Area type="monotone" dataKey="highRisk" name="High Risk" stroke="#c44c3a" fillOpacity={1} fill="url(#colorHighRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 border-t border-console-border/60 pt-3 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-[#3d9b6e]" />
                <span className="text-console-text">Cleared</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-[#c9a227]" />
                <span className="text-console-text">Needs Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-[#c44c3a]" />
                <span className="text-console-text">High Risk</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Operational Decision Posture Distribution (Horizontal Stacked Bar) */}
        <div className="lg:col-span-4">
          <Panel
            title="Decision Posture Distribution"
            subtitle="Operational breakdown across all cases"
          >
            <div className="space-y-5 pt-2 font-mono text-xs">
              {/* Stacked Progress Bar */}
              <div>
                <div className="h-6 w-full border border-console-border bg-console-raised flex overflow-hidden">
                  <div
                    style={{ width: `${decisionDist[0]?.percentage || 75}%` }}
                    className="bg-[#3d9b6e] h-full"
                    title={`Cleared: ${decisionDist[0]?.percentage}%`}
                  />
                  <div
                    style={{ width: `${decisionDist[1]?.percentage || 18.3}%` }}
                    className="bg-[#c9a227] h-full"
                    title={`Needs Review: ${decisionDist[1]?.percentage}%`}
                  />
                  <div
                    style={{ width: `${decisionDist[2]?.percentage || 6.7}%` }}
                    className="bg-[#c44c3a] h-full"
                    title={`High Risk: ${decisionDist[2]?.percentage}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-console-muted mt-1.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 divide-y divide-console-border/60">
                {decisionDist.map((d) => (
                  <div key={d.name} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5" style={{ backgroundColor: d.color }} />
                        <span className="text-console-text font-semibold uppercase">{d.name}</span>
                      </div>
                      <span className="font-bold text-console-text">{d.percentage}%</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-console-muted pl-4.5">
                      <span>Count: {d.count.toLocaleString()}</span>
                      <span>Target: &lt; 20% review</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* Document Types Volume */}
        <div className="lg:col-span-6">
          <Panel
            title="Document Type Distribution"
            subtitle="Volume broken down by document class"
          >
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.docTypeBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#2c3440" vertical={false} />
                  <XAxis dataKey="type" stroke="#8a94a3" fontSize={10} fontFamily="monospace" tickLine={false} />
                  <YAxis stroke="#8a94a3" fontSize={11} fontFamily="monospace" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" fill="#5b8def" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Top Anomaly Categories Table */}
        <div className="lg:col-span-6">
          <Panel
            title="Top Detected Anomaly Classes"
            subtitle="Most frequent discrepancy categories flagged"
          >
            <div className="divide-y divide-console-border/60 font-mono text-xs">
              {(data?.topFindings || []).map((f) => (
                <div key={f.code} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StatusChip status={f.severity} size="xs" />
                    <div className="min-w-0">
                      <p className="font-semibold text-console-text truncate font-sans">{f.title}</p>
                      <p className="text-[10px] text-console-muted">{f.code}</p>
                    </div>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <span className="font-bold text-console-text">{f.count}</span>
                    <span className="text-[10px] text-console-muted"> occurrences</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
