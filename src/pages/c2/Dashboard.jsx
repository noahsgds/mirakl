import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Store, TrendingUp, AlertCircle, Mail, CheckCircle2,
  Search, ChevronDown, RefreshCw, Zap, ExternalLink, Linkedin,
  Copy, RotateCcw, Send, Eye, ArrowUpRight, ArrowDownRight,
  Minus, X, Building2, Tag, Globe, Star,
} from 'lucide-react'
import {
  fetchMatches, fetchSellers, fetchMarketplaces,
  fitBandLabel, fitBandColor, readinessLabel, readinessColor, sendReadiness,
} from '../../lib/c2'

const SAVED_VIEWS = [
  { key: 'all',             label: 'All Leads',        filter: () => true },
  { key: 'ready',           label: 'Ready Now',        filter: m => sendReadiness(m) === 'ready' },
  { key: 'missing_contact', label: 'Needs Contact',    filter: m => sendReadiness(m) === 'missing_contact' },
  { key: 'high_score',      label: 'High Fit',         filter: m => (m.compatibility_score ?? 0) > 70 },
  { key: 'in_campaign',     label: 'In Campaign',      filter: m => sendReadiness(m) === 'in_campaign' },
]

function KpiCard({ icon: Icon, label, value, delta, color, onClick }) {
  const palette = {
    blue:    ['bg-blue-50',   'text-blue-600'],
    emerald: ['bg-emerald-50','text-emerald-600'],
    amber:   ['bg-amber-50',  'text-amber-600'],
    red:     ['bg-red-50',    'text-red-600'],
    purple:  ['bg-purple-50', 'text-purple-600'],
    gray:    ['bg-gray-100',  'text-gray-600'],
  }[color] ?? ['bg-gray-100', 'text-gray-600']

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`card cursor-pointer select-none ${onClick ? 'hover:ring-2 hover:ring-[#2563EB]/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${palette[0]}`}>
          <Icon size={20} className={palette[1]} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-text leading-tight">{value}</div>
          <div className="text-xs text-muted mt-0.5">{label}</div>
        </div>
        {delta != null && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {delta > 0 ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}

function StatusBadge({ label, color }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function EmailGenerationCard({ match, seller }) {
  const [tone, setTone] = useState('professional')
  const [copied, setCopied] = useState(null)

  const subjectDetailed = match?.rationale
    ? `Partnership ${match.marketplace_name} × ${match.seller_name} — category opportunity ${seller?.categories ?? 'mode'}`
    : null

  const bodyDetailed = match ? `Hello ${match.decision_maker_name || 'there'},

I am reaching out regarding a business development opportunity that seems highly relevant for ${match.seller_name}.

${match.rationale ?? `Your products show strong alignment with ${match.marketplace_name}'s value proposition, especially on pricing position, target audience, and category fit.`}

${match['Top 3 products to push for each marketplace'] ? `Products we would especially highlight: ${match['Top 3 products to push for each marketplace']}` : ''}

Would you be available for a 20-minute conversation so we can explore partnership terms together?

Best regards,
[Your name] — Mirakl Connect` : ''

  const subjectShort = match
    ? `${match.seller_name} sur ${match.marketplace_name} — fit ${Math.round(match.compatibility_score ?? 0)}/100`
    : null

  const bodyShort = match
    ? `Hi ${match.decision_maker_name?.split(' ')[0] || ''},

Your products have a compatibility score of ${Math.round(match.compatibility_score ?? 0)}/100 with ${match.marketplace_name}.

Would you be available for 20 minutes this week?

[Your name]`
    : ''

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!match) {
    return (
      <div className="card border border-dashed border-gray-200 flex items-center justify-center h-40">
        <p className="text-sm text-muted">Select a lead to generate emails</p>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#2563EB]" />
          <h3 className="font-semibold text-text text-sm">Email Generation</h3>
        </div>
        <div className="flex items-center gap-1">
          {['professional', 'direct', 'warm'].map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${tone === t ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { key: 'detailed', label: 'Detailed Personalized Email', subject: subjectDetailed, body: bodyDetailed },
          { key: 'short',    label: 'Short High-Conviction Email',  subject: subjectShort,    body: bodyShort },
        ].map(({ key, label, subject, body }) => (
          <div key={key} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-text">{label}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => copy(`Subject: ${subject}\n\n${body}`, key)} className="p-1 rounded hover:bg-gray-200 text-muted hover:text-text transition-colors">
                  {copied === key ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
                <button className="p-1 rounded hover:bg-gray-200 text-muted hover:text-text transition-colors">
                  <RotateCcw size={13} />
                </button>
                <button className="p-1 rounded hover:bg-gray-200 text-muted hover:text-text transition-colors">
                  <Send size={13} />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted">Subject</div>
              <div className="text-xs text-text font-medium line-clamp-2">{subject}</div>
              <div className="text-xs font-medium text-muted mt-2">Preview</div>
              <div className="text-xs text-text leading-relaxed line-clamp-4 whitespace-pre-line">{body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function C2Dashboard() {
  const PAGE_SIZE = 10
  const [matches, setMatches]     = useState([])
  const [sellers, setSellers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [view, setView]           = useState('all')
  const [selected, setSelected]   = useState(null)
  const [sortKey, setSortKey]     = useState('compatibility_score')
  const [sortDir, setSortDir]     = useState('desc')
  const [page, setPage]           = useState(1)

  async function load() {
    setLoading(true)
    const [m, s] = await Promise.all([fetchMatches({ limit: 5000 }), fetchSellers()])
    setMatches(m.data)
    setSellers(s.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sellersById = useMemo(() => {
    const map = {}
    for (const s of sellers) map[s.seller_id] = s
    return map
  }, [sellers])

  const leadRows = useMemo(() => {
    const bestBySeller = new Map()
    for (const match of matches) {
      const existing = bestBySeller.get(match.seller_id)
      if (!existing || (match.compatibility_score ?? 0) > (existing.compatibility_score ?? 0)) {
        bestBySeller.set(match.seller_id, match)
      }
    }
    return Array.from(bestBySeller.values())
  }, [matches])

  // KPIs
  const kpis = useMemo(() => {
    const total       = leadRows.length
    const highFit     = leadRows.filter(m => (m.compatibility_score ?? 0) > 70).length
    const ready       = leadRows.filter(m => sendReadiness(m) === 'ready').length
    const noContact   = leadRows.filter(m => !m.decision_maker_email).length
    const inCampaign  = leadRows.filter(m => sendReadiness(m) === 'in_campaign').length
    return { total, highFit, ready, noContact, inCampaign }
  }, [leadRows])

  // Filtered + sorted rows
  const rows = useMemo(() => {
    const viewFilter = SAVED_VIEWS.find(v => v.key === view)?.filter ?? (() => true)
    const s = search.trim().toLowerCase()
    let out = leadRows.filter(m => {
      if (!viewFilter(m)) return false
      if (s) {
        const hay = `${m.seller_name ?? ''} ${m.marketplace_name ?? ''} ${m.decision_maker_name ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
    out = [...out].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [leadRows, search, view, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [search, view, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page, PAGE_SIZE])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const selectedSeller = selected ? sellersById[selected.seller_id] : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Global Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">Lead queue · Email generation · Campaign health</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={Users}       label="Total Leads"     value={kpis.total}      color="blue"    onClick={() => setView('all')} />
        <KpiCard icon={TrendingUp}  label="High Fit (>70)"  value={kpis.highFit}    color="emerald" onClick={() => setView('high_score')} />
        <KpiCard icon={CheckCircle2}label="Ready to Send"   value={kpis.ready}      color="purple"  onClick={() => setView('ready')} />
        <KpiCard icon={AlertCircle} label="Missing Contact" value={kpis.noContact}  color="amber"   onClick={() => setView('missing_contact')} />
        <KpiCard icon={Send}        label="In Campaign"     value={kpis.inCampaign} color="blue"    onClick={() => setView('in_campaign')} />
      </div>

      {/* Saved views */}
      <div className="flex gap-2 flex-wrap">
        {SAVED_VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${view === v.key ? 'bg-[#2563EB] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Lead queue (2/3 width) */}
        <div className="xl:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sellers, marketplaces, contacts..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                {rows.length} leads
              </span>
              {!loading && rows.length > 0 && (
                <span className="text-xs text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, rows.length)}
                </span>
              )}
            </div>
            {loading ? (
              <div className="p-10 text-center text-muted text-sm">Loading leads...</div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-muted text-sm">No leads match this view.</div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <Th label="Seller" sortKey="seller_name" active={sortKey} dir={sortDir} onClick={toggleSort} />
                      <Th label="Marketplace" sortKey="marketplace_name" active={sortKey} dir={sortDir} onClick={toggleSort} />
                      <Th label="Score" sortKey="compatibility_score" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                      <th className="px-3 py-2.5">Fit</th>
                      <th className="px-3 py-2.5">Readiness</th>
                      <th className="px-3 py-2.5">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map(m => {
                      const isSelected = selected?.seller_id === m.seller_id && selected?.marketplace_id === m.marketplace_id
                      return (
                        <tr
                          key={`${m.seller_id}|${m.marketplace_id}`}
                          onClick={() => setSelected(isSelected ? null : m)}
                          className={`border-t border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text text-xs">{m.seller_name}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-muted flex items-center gap-1">
                              <Building2 size={10} />
                              {m.marketplace_name}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fitBandColor(m.compatibility_score)}`}>
                              {m.compatibility_score != null ? Number(m.compatibility_score).toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge label={fitBandLabel(m.compatibility_score)} color={fitBandColor(m.compatibility_score)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge label={readinessLabel(m)} color={readinessColor(m)} />
                          </td>
                          <td className="px-3 py-2.5">
                            {m.decision_maker_email
                              ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> {m.decision_maker_name?.split(' ')[0] ?? 'Found'}</span>
                              : <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> Missing</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && rows.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-muted">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel (1/3) */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={`${selected.seller_id}|${selected.marketplace_id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Lead detail */}
                <div className="card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-text">{selected.seller_name}</h3>
                      <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <Building2 size={11} /> {selected.marketplace_name}
                      </p>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 text-muted">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <StatusBadge label={`Score ${Number(selected.compatibility_score ?? 0).toFixed(1)}`} color={fitBandColor(selected.compatibility_score)} />
                    <StatusBadge label={fitBandLabel(selected.compatibility_score)} color={fitBandColor(selected.compatibility_score)} />
                    <StatusBadge label={readinessLabel(selected)} color={readinessColor(selected)} />
                  </div>

                  {selected.rationale && (
                    <div className="rounded-lg bg-[#2563EB]/5 border border-[#2563EB]/10 p-3">
                      <div className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wide mb-1">Why it fits</div>
                      <p className="text-xs text-text leading-relaxed line-clamp-4">{selected.rationale}</p>
                    </div>
                  )}

                  {selected['Top 3 products to push for each marketplace'] && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Tag size={10} /> Top products
                      </div>
                      <p className="text-xs text-text leading-relaxed line-clamp-3">
                        {selected['Top 3 products to push for each marketplace']}
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  {selected.decision_maker_name ? (
                    <div className="rounded-lg border border-gray-200 p-2.5 space-y-1">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Decision maker</div>
                      <div className="text-xs font-semibold text-text">{selected.decision_maker_name}</div>
                      {selected.decision_maker_title && <div className="text-xs text-muted">{selected.decision_maker_title}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        {selected.decision_maker_email && (
                          <a href={`mailto:${selected.decision_maker_email}`} className="text-xs text-[#2563EB] hover:underline truncate max-w-[160px]">
                            {selected.decision_maker_email}
                          </a>
                        )}
                        {selected.decision_maker_linkedin && (
                          <a href={selected.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2]">
                            <Linkedin size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 rounded-lg bg-amber-50 p-2.5">
                      <AlertCircle size={13} /> No decision maker found — enrichment needed
                    </div>
                  )}

                  {selectedSeller && (
                    <div className="rounded-lg border border-gray-100 p-2.5 space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Seller profile</div>
                      {selectedSeller.categories && (
                        <div className="text-xs text-text"><span className="text-muted">Category:</span> {selectedSeller.categories}</div>
                      )}
                      {selectedSeller.nb_products != null && (
                        <div className="text-xs text-text"><span className="text-muted">Products:</span> {selectedSeller.nb_products.toLocaleString()}</div>
                      )}
                      {selectedSeller.avg_price != null && (
                        <div className="text-xs text-text"><span className="text-muted">Avg price:</span> €{Number(selectedSeller.avg_price).toFixed(0)}</div>
                      )}
                      {selectedSeller.current_platforms && (
                        <div className="text-xs text-text"><span className="text-muted">Platforms:</span> {selectedSeller.current_platforms}</div>
                      )}
                      {selectedSeller.seller_url && (
                        <a href={selectedSeller.seller_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] flex items-center gap-1 hover:underline">
                          <ExternalLink size={10} /> Website
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Email generation */}
                <EmailGenerationCard match={selected} seller={selectedSeller} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card border border-dashed border-gray-200 flex flex-col items-center justify-center h-64 text-center"
              >
                <Eye size={28} className="text-gray-300 mb-2" />
                <p className="text-sm font-medium text-text">Select a lead</p>
                <p className="text-xs text-muted mt-1">Click any row to view details and generate emails</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Th({ label, sortKey, active, dir, onClick, align }) {
  const isActive = active === sortKey
  return (
    <th
      className={`px-3 py-2.5 cursor-pointer select-none hover:text-text ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onClick(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && <ChevronDown size={11} className={dir === 'asc' ? 'rotate-180' : ''} />}
      </span>
    </th>
  )
}
