import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  RefreshCw,
  FilePlus,
  X,
} from 'lucide-react'
import { listScreenings } from '../services/api'
import { ROUTES } from '../constants/routes'
import { DOCUMENT_TYPES } from '../constants/screeningStatus'
import { formatShortDateTime, getRiskLevel } from '../utils/format'
import PageHeader from '../components/layout/PageHeader'
import DataTable from '../components/ui/DataTable'
import StatusChip from '../components/ui/StatusChip'
import Button from '../components/ui/Button'
import Panel from '../components/ui/Panel'

export function HistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedDecision, setSelectedDecision] = useState(searchParams.get('decision') || 'ALL')
  const [selectedDocType, setSelectedDocType] = useState(searchParams.get('docType') || 'ALL')

  const [screenings, setScreenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await listScreenings({
        search: searchQuery,
        decision: selectedDecision,
        documentType: selectedDocType,
      })
      setScreenings(res.items || [])
    } catch (err) {
      console.error('Failed to list screenings:', err)
      setError('Unable to load history records. Click retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [selectedDecision, selectedDocType])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchRecords()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDecision('ALL')
    setSelectedDocType('ALL')
    setSearchParams({})
  }

  const columns = [
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
      header: 'Subject & Reference',
      render: (row) => (
        <div>
          <p className="font-medium text-console-text truncate">
            {row.travelerName || 'Synthetic Subject'}
          </p>
          <p className="font-mono text-[10px] text-console-muted">
            {row.travelerRef || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'document',
      header: 'Document / Number',
      render: (row) => (
        <div>
          <p className="font-mono text-xs text-slate-300">{row.documentType}</p>
          <p className="font-mono text-[10px] text-console-muted">{row.documentNumber || '—'}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp (UTC)',
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

  const hasActiveFilters = searchQuery !== '' || selectedDecision !== 'ALL' || selectedDocType !== 'ALL'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening History"
        subtitle="Searchable archive of historical document screening records and verification postures"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={FilePlus}
            onClick={() => navigate(ROUTES.NEW_SCREENING)}
          >
            New Screening
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="border border-console-border bg-console-panel p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-console-muted">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, Traveler Name, Document Number, or Reference..."
              className="w-full bg-console-raised border border-console-border px-3.5 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted/60 focus:border-console-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" size="md" icon={Search}>
              Filter
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={X}
                onClick={handleResetFilters}
                className="text-console-muted"
              >
                Reset
              </Button>
            )}
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-console-border/60 text-xs font-mono">
          {/* Posture Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-console-muted font-sans font-semibold">
              Posture:
            </span>
            {['ALL', 'clear', 'review', 'high_risk'].map((dec) => (
              <button
                key={dec}
                type="button"
                onClick={() => setSelectedDecision(dec)}
                className={`px-2 py-0.5 text-[10px] uppercase font-mono border transition-colors cursor-pointer ${
                  selectedDecision === dec
                    ? 'border-console-accent bg-console-accent/20 text-console-accent font-semibold'
                    : 'border-console-border text-console-muted hover:text-console-text bg-console-raised/50'
                }`}
              >
                {dec === 'high_risk' ? 'HIGH RISK' : dec.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Document Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-console-muted font-sans font-semibold">
              Type:
            </span>
            {['ALL', ...DOCUMENT_TYPES].map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setSelectedDocType(dt)}
                className={`px-2 py-0.5 text-[10px] uppercase font-mono border transition-colors cursor-pointer ${
                  selectedDocType === dt
                    ? 'border-console-accent bg-console-accent/20 text-console-accent font-semibold'
                    : 'border-console-border text-console-muted hover:text-console-text bg-console-raised/50'
                }`}
              >
                {dt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300 flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchRecords}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Table */}
      <Panel
        title="Screening Records Ledger"
        subtitle={`${screenings.length} records matching parameters`}
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchRecords}
            loading={loading}
            className="text-[11px]"
          >
            Refresh
          </Button>
        }
      >
        <DataTable
          columns={columns}
          data={screenings}
          loading={loading}
          onRowClick={(row) => navigate(ROUTES.SCREENING_RESULT(row.id))}
          emptyMessage="No historical screening records found matching specified filters."
        />
      </Panel>
    </div>
  )
}

export default HistoryPage
