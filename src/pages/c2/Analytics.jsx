import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import {
  BarChart2, TrendingUp, CheckCircle2, AlertCircle, Send, Search, RefreshCw,
} from 'lucide-react'
import {
  fetchMatches, fetchSellers, fetchMarketplaces,
  sendReadiness, fitBandLabel, resolveLeadContact,
} from '../../lib/c2'

const PAGE_SIZE = 10

const STATUS_COLORS = {
  A_SCORER: '#94A3B8',
  scored: '#2563EB',
  enriched: '#8B5CF6',
  sequence_en_cours: '#0EA5E9',
  sequence_terminee: '#64748B',
}

function fitBand(score) {
  if (score == null) return 'Unknown'
  if (score >= 85) return 'Excellent'
  if (score > 70) return 'High Fit'
  if (score >= 55) return 'Moderate'
  return 'Low Fit'
}

export default function C2Analytics() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fitFilter, setFitFilter] = useState('')
  const [contactFilter, setContactFilter] = useState('all')
  const [page, setPage] = useState(1)

  async function load() {
    setLoading(true)
    const [m, s, mp] = await Promise.all([
      fetchMatches({ limit: 5000 }),
      fetchSellers({ limit: 5000 }),
      fetchMarketplaces(),
    ])

    const sellersById = Object.fromEntries((s.data ?? []).map((item) => [item.seller_id, item]))
    const marketplacesById = Object.fromEntries((mp.data ?? []).map((item) => [item.marketplace_id, item]))

    const enriched = (m.data ?? []).map((item) => {
      const seller = sellersById[item.seller_id] ?? {}
      const marketplace = marketplacesById[item.marketplace_id] ?? {}
      const contact = resolveLeadContact(item, seller)
      return {
        ...item,
        decision_maker_email: contact.email,
        decision_maker_name: contact.name,
        categories: seller.categories ?? item.categories ?? null,
        country_origin: seller.country_origin ?? null,
        marketplace_name: item.marketplace_name ?? marketplace.marketplace_name ?? '—',
      }
    })

    setMatches(enriched)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const leadRows = useMemo(() => {
    const bestBySeller = new Map()
    for (const row of matches) {
      const existing = bestBySeller.get(row.seller_id)
      if (!existing || (row.compatibility_score ?? 0) > (existing.compatibility_score ?? 0)) {
        bestBySeller.set(row.seller_id, row)
      }
    }
    return Array.from(bestBySeller.values())
  }, [matches])

  const kpis = useMemo(() => {
    const total = leadRows.length
    const highFit = leadRows.filter((r) => (r.compatibility_score ?? 0) > 70).length
    const withContact = leadRows.filter((r) => !!r.decision_maker_email).length
    const inCampaign = leadRows.filter((r) => r.statut === 'sequence_en_cours').length
    const avgFit = total
      ? Math.round(leadRows.reduce((sum, r) => sum + Number(r.compatibility_score ?? 0), 0) / total)
      : 0
    return { total, highFit, withContact, inCampaign, avgFit }
  }, [leadRows])

  const pipelineData = useMemo(() => {
    const counts = leadRows.reduce((acc, row) => {
      const key = row.statut || 'scored'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return [
      { label: 'To score', key: 'A_SCORER', value: counts.A_SCORER || 0, color: STATUS_COLORS.A_SCORER },
      { label: 'Scored', key: 'scored', value: counts.scored || 0, color: STATUS_COLORS.scored },
      { label: 'Enriched', key: 'enriched', value: counts.enriched || 0, color: STATUS_COLORS.enriched },
      { label: 'In sequence', key: 'sequence_en_cours', value: counts.sequence_en_cours || 0, color: STATUS_COLORS.sequence_en_cours },
      { label: 'Completed', key: 'sequence_terminee', value: counts.sequence_terminee || 0, color: STATUS_COLORS.sequence_terminee },
    ]
  }, [leadRows])

  const fitDistribution = useMemo(() => {
    const labels = ['Excellent', 'High Fit', 'Moderate', 'Low Fit']
    const base = labels.map((label) => ({ label, value: 0 }))
    for (const row of leadRows) {
      const band = fitBand(row.compatibility_score)
      const target = base.find((item) => item.label === band)
      if (target) target.value += 1
    }
    return base
  }, [leadRows])

  const readinessData = useMemo(() => {
    const counts = { ready: 0, missing_contact: 0, in_campaign: 0, completed: 0, missing_reasoning: 0 }
    for (const row of leadRows) {
      const key = sendReadiness(row)
      counts[key] = (counts[key] || 0) + 1
    }
    return [
      { name: 'Ready', value: counts.ready, color: '#16A34A' },
      { name: 'No contact', value: counts.missing_contact, color: '#DC2626' },
      { name: 'In campaign', value: counts.in_campaign, color: '#2563EB' },
      { name: 'Completed', value: counts.completed, color: '#64748B' },
      { name: 'No rationale', value: counts.missing_reasoning, color: '#F59E0B' },
    ]
  }, [leadRows])

  const topMarketplaces = useMemo(() => {
    const map = new Map()
    for (const row of matches) {
      const key = row.marketplace_name || '—'
      const current = map.get(key) || { marketplace: key, total: 0, highFit: 0, avgScoreSum: 0 }
      current.total += 1
      if ((row.compatibility_score ?? 0) > 70) current.highFit += 1
      current.avgScoreSum += Number(row.compatibility_score ?? 0)
      map.set(key, current)
    }
    return Array.from(map.values())
      .map((row) => ({
        marketplace: row.marketplace,
        total: row.total,
        highFit: row.highFit,
        avgScore: row.total ? Math.round(row.avgScoreSum / row.total) : 0,
      }))
      .sort((a, b) => b.highFit - a.highFit)
      .slice(0, 10)
  }, [matches])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leadRows.filter((row) => {
      if (statusFilter && (row.statut || 'scored') !== statusFilter) return false
      if (fitFilter && fitBand(row.compatibility_score) !== fitFilter) return false
      if (contactFilter === 'with' && !row.decision_maker_email) return false
      if (contactFilter === 'without' && row.decision_maker_email) return false
      if (q) {
        const haystack = `${row.seller_name ?? ''} ${row.marketplace_name ?? ''} ${row.decision_maker_name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [leadRows, search, statusFilter, fitFilter, contactFilter])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, fitFilter, contactFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted">Loading C2 analytics...</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">C2 Analytics</h1>
          <p className="mt-0.5 text-sm text-muted">Campaign 2 performance from matching and lead-readiness data</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#2563EB]">{kpis.total}</p>
          <p className="mt-1 text-xs text-muted">Total leads</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-600">{kpis.highFit}</p>
          <p className="mt-1 text-xs text-muted">High fit (&gt;70)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-sky-600">{kpis.withContact}</p>
          <p className="mt-1 text-xs text-muted">With contact</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-indigo-600">{kpis.inCampaign}</p>
          <p className="mt-1 text-xs text-muted">In campaign</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-text">{kpis.avgFit}</p>
          <p className="mt-1 text-xs text-muted">Average fit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-text">Pipeline status distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pipelineData} margin={{ left: 0, right: 12, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {pipelineData.map((row) => <Cell key={row.key} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-text">Send readiness</h2>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="58%" height={220}>
              <PieChart>
                <Pie data={readinessData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={82}>
                  {readinessData.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {readinessData.map((row) => (
                <div key={row.name} className="flex items-center gap-2 text-xs text-text">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.name}: <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-text">Fit distribution (best match per seller)</h2>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={fitDistribution} margin={{ left: 0, right: 12, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Leads']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <Send size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-text">Top marketplaces by high-fit matches</h2>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={topMarketplaces} margin={{ left: 0, right: 12, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="marketplace" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={58} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="highFit" name="High-fit leads" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgScore" name="Avg fit score" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-text">Lead analytics table</h2>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search seller, marketplace, contact..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All status</option>
            <option value="A_SCORER">To score</option>
            <option value="scored">Scored</option>
            <option value="enriched">Enriched</option>
            <option value="sequence_en_cours">In sequence</option>
            <option value="sequence_terminee">Completed</option>
          </select>
          <select
            value={fitFilter}
            onChange={(event) => setFitFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All fit bands</option>
            <option value="Excellent">Excellent</option>
            <option value="High Fit">High Fit</option>
            <option value="Moderate">Moderate</option>
            <option value="Low Fit">Low Fit</option>
          </select>
          <select
            value={contactFilter}
            onChange={(event) => setContactFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
          >
            <option value="all">All contacts</option>
            <option value="with">With contact</option>
            <option value="without">Without contact</option>
          </select>
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setFitFilter('')
              setContactFilter('all')
            }}
            className="btn-secondary text-xs"
          >
            Reset filters
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2.5">Seller</th>
                <th className="px-3 py-2.5">Marketplace</th>
                <th className="px-3 py-2.5 text-right">Score</th>
                <th className="px-3 py-2.5">Fit</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Contact</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">No rows for current filters.</td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={`${row.seller_id}|${row.marketplace_id}`} className="border-t border-gray-100">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-text">{row.seller_name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{row.marketplace_name}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-text">{Number(row.compatibility_score ?? 0).toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{fitBandLabel(row.compatibility_score)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{row.statut || 'scored'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {row.decision_maker_email ? row.decision_maker_email : 'Missing'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
