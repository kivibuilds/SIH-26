import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Database, FileCheck2, FileText, Link2, RefreshCw, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getAnalytics, getScreening } from '../services/api'
import PageHeader from '../components/layout/PageHeader'
import Panel from '../components/ui/Panel'
import StatCard from '../components/ui/StatCard'
import StatusChip from '../components/ui/StatusChip'
import Button from '../components/ui/Button'
import DataTable from '../components/ui/DataTable'

const DEMO_RECORDS = [
  { id: 'DEMO-001', document: 'aadhaar_sample_014.jpg', type: 'Aadhaar', screening: 'SUCCESS', blockchain: 'CONFIRMED', riskScore: 18, riskLevel: 'LOW', mrz: 'NOT_APPLICABLE', tampering: false, integrity: 'DEMO ONLY' },
  { id: 'DEMO-002', document: 'aadhaar_sample_067.jpg', type: 'Aadhaar', screening: 'SUCCESS', blockchain: 'PENDING', riskScore: 42, riskLevel: 'MEDIUM', mrz: 'NOT_APPLICABLE', tampering: true, integrity: 'DEMO ONLY' },
  { id: 'DEMO-003', document: 'aadhaar_sample_143.jpg', type: 'Aadhaar', screening: 'SUCCESS', blockchain: 'FAILED', riskScore: 71, riskLevel: 'HIGH', mrz: 'NOT_APPLICABLE', tampering: true, integrity: 'DEMO ONLY' },
  { id: 'DEMO-004', document: 'aadhaar_sample_198.jpg', type: 'Aadhaar', screening: 'FAILED', blockchain: 'PENDING', mrz: 'NOT_APPLICABLE', tampering: null, integrity: 'DEMO ONLY' },
  { id: 'DEMO-005', document: 'passport_sample_022.png', type: 'Passport', screening: 'SUCCESS', blockchain: 'CONFIRMED', riskScore: 12, riskLevel: 'LOW', mrz: 'VALID', tampering: false, integrity: 'DEMO ONLY' },
  { id: 'DEMO-006', document: 'passport_sample_081.png', type: 'Passport', screening: 'SUCCESS', blockchain: 'CONFIRMED', riskScore: 36, riskLevel: 'MEDIUM', mrz: 'VALID', tampering: false, integrity: 'DEMO ONLY' },
  { id: 'DEMO-007', document: 'passport_sample_126.png', type: 'Passport', screening: 'SUCCESS', blockchain: 'PENDING', riskScore: 64, riskLevel: 'MEDIUM', mrz: 'MISMATCH', tampering: true, integrity: 'DEMO ONLY' },
  { id: 'DEMO-008', document: 'passport_sample_189.png', type: 'Passport', screening: 'SUCCESS', blockchain: 'CONFIRMED', riskScore: 8, riskLevel: 'LOW', mrz: 'VALID', tampering: false, integrity: 'DEMO ONLY' },
]

function normalizeRecord(item, index) {
  return {
    id: item.screening_id || item.id || `RECORD-${index + 1}`,
    document: item.filename || item.document || 'Unnamed document',
    type: item.document_type || item.documentType || 'Unknown',
    screening: item.screening_status || (item.risk_score == null ? 'FAILED' : 'SUCCESS'),
    blockchain: item.blockchain_status || item.blockchain || 'PENDING',
    transaction: item.transaction_hash || item.transaction || null,
    block: item.block_number ?? item.block ?? null,
    riskScore: item.risk_score ?? item.overallScore ?? null,
    riskLevel: item.risk_level || null,
    mrz: item.mrz_status || 'NOT_APPLICABLE',
    tampering: item.tampering_detected ?? null,
    hash: item.document_hash || item.hash || null,
    integrity: item.integrity || 'NOT_CHECKED',
  }
}

function mergeScreeningDetail(record, detail) {
  const audit = detail?.audit || {}
  return {
    ...record,
    transaction: audit.txRef || record.transaction,
    block: audit.blockNumber ?? record.block,
    hash: audit.documentHash || audit.hash || record.hash,
    blockchain: audit.status || record.blockchain,
    integrity: audit.status === 'CONFIRMED' ? 'NOT_CHECKED' : record.integrity,
  }
}

function countBy(records, key, value) {
  return records.filter((record) => record[key] === value).length
}

function Detail({ label, value }) {
  return <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-console-muted">{label}</p><p className="mt-1 text-console-text break-all">{value}</p></div>
}

function Filter({ value, onChange, options }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-console-raised border border-console-border px-3 py-2 text-xs font-mono uppercase text-console-text focus:border-console-accent focus:outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
}

export function AnalyticsPage() {
  const [range, setRange] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [screeningFilter, setScreeningFilter] = useState('ALL')
  const [blockchainFilter, setBlockchainFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [recordDetails, setRecordDetails] = useState({})

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAnalytics({ range }))
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Live analytics are unavailable. Showing the clearly marked demo audit set.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [range])

  const liveRecords = (data?.items || []).map(normalizeRecord)
  const isDemo = liveRecords.length === 0
  const records = isDemo ? DEMO_RECORDS : liveRecords
  const filteredRecords = records.filter((record) => {
    const matchesQuery = `${record.id} ${record.document}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (typeFilter === 'ALL' || record.type === typeFilter) && (screeningFilter === 'ALL' || record.screening === screeningFilter) && (blockchainFilter === 'ALL' || record.blockchain === blockchainFilter)
  })
  const featuredBase = selected || records.find((record) => record.blockchain === 'CONFIRMED') || records[0]
  const featured = recordDetails[featuredBase?.id] || featuredBase
  const selectedRecord = selected ? (recordDetails[selected.id] || selected) : null

  useEffect(() => {
    if (isDemo || !featuredBase?.id || recordDetails[featuredBase.id]) return
    let mounted = true
    getScreening(featuredBase.id)
      .then((detail) => {
        if (mounted) setRecordDetails((current) => ({ ...current, [featuredBase.id]: mergeScreeningDetail(featuredBase, detail) }))
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [featuredBase?.id, isDemo])
  const total = records.length
  const aadhaar = countBy(records, 'type', 'Aadhaar')
  const passport = countBy(records, 'type', 'Passport')
  const screened = countBy(records, 'screening', 'SUCCESS')
  const mrzApplicable = records.filter((record) => record.type === 'Passport')
  const mrzValid = mrzApplicable.filter((record) => ['VALID', 'MATCH'].includes(record.mrz)).length
  const registered = records.filter((record) => ['CONFIRMED', 'FAILED'].includes(record.blockchain)).length
  const confirmed = countBy(records, 'blockchain', 'CONFIRMED')
  const pending = records.filter((record) => ['FAILED', 'PENDING'].includes(record.blockchain)).length
  const columns = [
    { key: 'number', header: '#', render: (_, index) => <span className="font-mono text-console-muted">{index + 1}</span> },
    { key: 'document', header: 'Document', render: (row) => <div className="min-w-[170px]"><p className="font-mono text-console-text truncate">{row.document}</p><p className="text-[10px] text-console-muted">{row.id}</p></div> },
    { key: 'type', header: 'Type', render: (row) => <StatusChip status={row.type} size="xs" showIcon={false} /> },
    { key: 'screening', header: 'Screening', render: (row) => <StatusChip status={row.screening} size="xs" /> },
    { key: 'blockchain', header: 'Blockchain', render: (row) => <StatusChip status={row.blockchain} size="xs" /> },
    { key: 'transaction', header: 'Transaction', render: (row) => <span className="font-mono text-[10px] text-console-muted">{row.transaction || '—'}</span> },
    { key: 'block', header: 'Block', align: 'right', render: (row) => <span className="font-mono text-console-muted">{row.block ?? '—'}</span> },
  ]

  return <div className="space-y-6 pb-8">
    <PageHeader title="VerifyX Analytics & Dataset Audit" subtitle="Evaluation coverage, screening quality, and blockchain traceability" actions={<div className="flex items-center gap-2"><div className="flex border border-console-border bg-console-panel text-xs font-mono">{['24h', '7d', '30d'].map((item) => <button key={item} onClick={() => setRange(item)} className={`px-3 py-1.5 uppercase ${range === item ? 'bg-console-accent text-slate-950 font-bold' : 'text-console-muted hover:text-console-text'}`}>{item}</button>)}</div><Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchAnalytics} loading={loading}>Refresh</Button></div>} />
    <div className="border border-amber-800/70 bg-amber-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-start gap-3"><Database className="h-4 w-4 text-console-accent mt-0.5 shrink-0" /><div><p className="text-xs font-semibold uppercase tracking-wider text-console-accent">{isDemo ? 'Demo audit dataset' : 'Live evaluation records'}</p><p className="text-[11px] text-console-muted mt-0.5">{isDemo ? 'Placeholder records are for UI development only. Connect the 400-document audit response to replace them.' : 'Metrics below are derived from the connected evaluation response.'}</p></div></div><span className="font-mono text-[10px] uppercase text-console-muted">{isDemo ? 'NOT REAL RESULTS' : `${total} records loaded`}</span></div>
    {error && <div className="border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">{error}</div>}
    <Section title="Overview" icon={BarChart3}><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><Metric label="Total Documents" value={total} detail="Across the selected audit set" icon={FileText} /><Metric label="Aadhaar" value={aadhaar} detail="Document type volume" icon={FileCheck2} tone="processing" /><Metric label="Passport" value={passport} detail="MRZ-capable document volume" icon={FileCheck2} tone="accent" /><Metric label="Successfully Screened" value={screened} detail={`${total ? Math.round((screened / total) * 100) : 0}% of records`} icon={CheckCircle2} tone="clear" /></div></Section>
    <Section title="AI Screening Analytics" icon={Activity}><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Metric label="OCR Success" value={screened} detail="Successful screenings" icon={FileText} tone="clear" /><Metric label="Document Validation" value={screened} detail="Successful screenings" icon={FileCheck2} tone="clear" /><Metric label="MRZ Validation" value={mrzValid} detail={`${mrzApplicable.length} passports applicable`} icon={ShieldCheck} tone="accent" /><Metric label="Tampering Findings" value={records.filter((record) => record.tampering === true).length} detail="Records with findings" icon={ShieldAlert} tone="high" /><Metric label="Not Available" value={records.filter((record) => record.tampering == null).length} detail="Awaiting source fields" icon={AlertTriangle} tone="review" /></div></Section>
    <Section title="Blockchain Audit" icon={Link2}><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Blockchain Registered" value={registered} detail="Submitted or confirmed" icon={Link2} tone="accent" /><Metric label="Confirmed" value={confirmed} detail="Receipt-confirmed records" icon={CheckCircle2} tone="clear" /><Metric label="Failed / Pending" value={pending} detail="Requires operational review" icon={AlertTriangle} tone="review" /><Metric label="Total Transactions" value={records.filter((record) => record.transaction).length} detail="Transaction hashes available" icon={Database} /></div></Section>
    <Panel title="Dataset Records" subtitle="Select a row to inspect its audit payload" action={<span className="font-mono text-[10px] text-console-muted">{filteredRecords.length} SHOWN</span>}><div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2"><label className="relative md:col-span-2"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-console-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document or record ID" className="w-full bg-console-raised border border-console-border px-3 py-2 pl-9 text-xs font-mono text-console-text placeholder:text-console-muted focus:border-console-accent focus:outline-none" /></label><Filter value={typeFilter} onChange={setTypeFilter} options={['ALL', 'Aadhaar', 'Passport']} /><Filter value={screeningFilter} onChange={setScreeningFilter} options={['ALL', 'SUCCESS', 'FAILED']} /></div><div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-[10px] uppercase tracking-wider text-console-muted">Blockchain:</span>{['ALL', 'CONFIRMED', 'PENDING', 'FAILED'].map((value) => <button key={value} onClick={() => setBlockchainFilter(value)} className={`border px-2 py-1 text-[10px] font-mono uppercase ${blockchainFilter === value ? 'border-console-accent bg-console-accent/15 text-console-accent' : 'border-console-border text-console-muted hover:text-console-text'}`}>{value}</button>)}</div><DataTable columns={columns} data={filteredRecords} keyField="id" onRowClick={setSelected} loading={loading} emptyMessage="No audit records match these filters." /></Panel>
    {featured && <div className="border border-console-accent/70 bg-console-panel p-5 shadow-[0_0_28px_rgba(201,162,39,0.08)]"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5"><div><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-console-accent" /><p className="text-[10px] uppercase tracking-[0.2em] text-console-accent font-semibold">Featured Blockchain Record</p></div><h2 className="mt-2 text-lg font-semibold text-console-text">{featured.document}</h2><p className="font-mono text-[11px] text-console-muted mt-1">{featured.id} · {featured.type} · {isDemo ? 'DEMO ONLY' : 'LIVE RECORD'}</p></div><StatusChip status={featured.blockchain} /></div><div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs"><Detail label="SHA-256" value={featured.hash || 'Unavailable'} /><Detail label="Transaction" value={featured.transaction || 'Unavailable'} /><Detail label="Block" value={featured.block ?? 'Unavailable'} /><Detail label="Blockchain" value={featured.blockchain} /><Detail label="Integrity" value={featured.integrity} /></div></div>}
    {selectedRecord && <div className="border border-console-border bg-console-raised p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-console-accent">Selected record details</p><h2 className="mt-1 text-base font-semibold text-console-text">{selectedRecord.document}</h2></div><Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button></div><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"><Detail label="Type" value={selectedRecord.type} /><Detail label="Screening" value={selectedRecord.screening} /><Detail label="Risk" value={selectedRecord.riskScore == null ? 'Unavailable' : `${selectedRecord.riskScore} / ${selectedRecord.riskLevel || 'UNSPECIFIED'}`} /><Detail label="MRZ" value={selectedRecord.mrz} /><Detail label="Tampering" value={selectedRecord.tampering == null ? 'Unavailable' : selectedRecord.tampering ? 'DETECTED' : 'CLEARED'} /><Detail label="Document hash" value={selectedRecord.hash || 'Unavailable'} /><Detail label="Blockchain" value={selectedRecord.blockchain} /><Detail label="Integrity" value={selectedRecord.integrity} /></div></div>}
  </div>
}

function Section({ title, icon: Icon, children }) {
  return <section><div className="flex items-center gap-2 mb-3"><Icon className="h-4 w-4 text-console-accent" /><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-console-text">{title}</h2></div>{children}</section>
}

function Metric({ label, value, detail, icon: Icon, tone = 'neutral' }) {
  return <StatCard label={label} value={value} subtext={detail} icon={Icon} variant={tone} />
}

export default AnalyticsPage
