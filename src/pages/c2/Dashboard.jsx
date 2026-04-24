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
  fitBandLabel, fitBandColor, readinessLabel, readinessColor, sendReadiness, resolveLeadContact,
} from '../../lib/c2'

const SAVED_VIEWS = [
  { key: 'all',             label: 'All Leads',        filter: () => true },
  { key: 'ready',           label: 'Ready Now',        filter: m => sendReadiness(m) === 'ready' },
  { key: 'missing_contact', label: 'Needs Contact',    filter: m => sendReadiness(m) === 'missing_contact' },
  { key: 'high_score',      label: 'High Fit',         filter: m => (m.compatibility_score ?? 0) > 70 },
  { key: 'in_campaign',     label: 'In Campaign',      filter: m => sendReadiness(m) === 'in_campaign' },
]

function splitValues(input) {
  if (!input) return []
  return String(input)
    .split(/[,\n|]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function inferVertical(match) {
  const raw = [
    match?.categories,
    match?.marketplace_main_categories,
    match?.product_types_list,
    match?.top_product_tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/home|garden|furniture|decor|lighting/.test(raw)) return 'home_garden'
  if (/beauty|cosmetic|skincare|fragrance/.test(raw)) return 'beauty'
  if (/fashion|apparel|clothing|footwear|accessories/.test(raw)) return 'fashion'
  if (/sport|fitness|outdoor/.test(raw)) return 'sport'
  return 'general'
}

function seasonalContext() {
  const month = new Date().getMonth() + 1
  if (month >= 9 && month <= 12) {
    return {
      periodLabel: 'peak season',
      urgencyLine: 'Peak season is approaching fast, and channel coverage will decide who captures demand.',
      ctaLine: 'Would you be open to a quick call this week to prepare your marketplace plan before peak season?',
    }
  }
  if (month >= 1 && month <= 3) {
    return {
      periodLabel: 'new-quarter planning',
      urgencyLine: 'This is the right time to lock high-impact marketplace priorities for the new quarter.',
      ctaLine: 'Open to a quick call this week to align your next marketplace moves?',
    }
  }
  return {
    periodLabel: 'growth planning',
    urgencyLine: 'Now is a strong moment to accelerate multichannel growth before your competitors catch up.',
    ctaLine: 'Would you be open to a quick call this week to review the best channels for your expansion?',
  }
}

function createMiraklEmailVariants(match, seller, tone = 'professional') {
  const firstName = match?.decision_maker_name
    ? String(match.decision_maker_name).split(' ')[0]
    : 'there'
  const score = Math.round(Number(match?.compatibility_score ?? 0))
  const vertical = inferVertical(match)
  const seasonal = seasonalContext()

  const toneLines = {
    professional: {
      opener: `I am reaching out regarding a strong marketplace opportunity for ${match.seller_name}.`,
      cta: 'Would you be open to a 20-minute call this week to review fit and next steps?',
    },
    direct: {
      opener: `${match.seller_name} is a strong fit for ${match.marketplace_name}, and we should discuss activation quickly.`,
      cta: 'Can we lock a 20-minute call this week?',
    },
    warm: {
      opener: `I thought this would be highly relevant for ${match.seller_name} and wanted to share it with you.`,
      cta: 'If useful, I would love to schedule a short 20-minute conversation.',
    },
  }[tone]

  const rationale =
    match.rationale ||
    `Your brand positioning and category alignment look particularly strong for ${match.marketplace_name}.`

  const products = splitValues(match['Top 3 products to push for each marketplace']).slice(0, 3)
  const categories = seller?.categories || match?.product_types_list || match?.marketplace_main_categories || 'your category'
  const country = seller?.country_origin ? `from ${seller.country_origin}` : ''
  const nbProducts = seller?.nb_products ? `${Number(seller.nb_products).toLocaleString()} products` : null
  const avgPrice = seller?.avg_price ? `avg price around €${Math.round(Number(seller.avg_price))}` : null
  const dataProof = [nbProducts, avgPrice].filter(Boolean).join(' · ')
  const comm = match?.marketplace_commission_rate != null
    ? `${Math.round(Number(match.marketplace_commission_rate) * 100)}% commission context`
    : null
  const traffic = match?.marketplace_monthly_traffic ? `${match.marketplace_monthly_traffic} monthly traffic` : null
  const marketProof = [traffic, comm].filter(Boolean).join(' · ')
  const seasonalHeadline =
    seasonal.periodLabel === 'peak season' ? 'peak season' : seasonal.periodLabel === 'new-quarter planning' ? 'Q planning' : 'growth plan'

  const subjectCandidates = [
    { s: `Are you selling on ${match.marketplace_name}?`, w: 96 + (score >= 70 ? 10 : 0) },
    { s: `${match.seller_name}: how to win ${seasonalHeadline}?`, w: 92 + (match.rationale ? 6 : 0) },
    { s: `Scale ${match.seller_name} like top marketplace brands`, w: 88 + (marketProof ? 6 : 0) },
    { s: `Still have products to publish on ${match.marketplace_name}?`, w: 85 + (products.length ? 8 : 0) },
    { s: `${match.seller_name}: expand faster with Mirakl Connect`, w: 82 + score / 10 },
    ...(vertical === 'home_garden'
      ? [{ s: `Expand ${match.seller_name} across Europe’s Home & Garden marketplaces`, w: 100 }]
      : []),
  ]
  const bestSubject = [...subjectCandidates].sort((a, b) => b.w - a.w)[0]?.s || `Are you selling on ${match.marketplace_name}?`

  const sharedMiraklBullets = [
    'Access 450+ Mirakl-powered marketplaces globally',
    'Launch in days, not months, with AI-powered catalog adaptation',
    'Prioritize channels where your assortment and margins fit best',
  ]

  const detailedLines = [
    `Hi ${firstName},`,
    '',
    toneLines.opener,
    '',
    seasonal.urgencyLine,
    '',
    `For ${match.seller_name} ${country}, we see a strong opportunity on ${match.marketplace_name} (${score}/100 compatibility).`,
    rationale,
    ...(dataProof ? ['', `Brand data signal: ${dataProof}.`] : []),
    ...(marketProof ? [`Marketplace signal: ${marketProof}.`] : []),
    '',
    'Why Mirakl Connect:',
    ...sharedMiraklBullets.map((b) => `- ${b}`),
    ...(products.length
      ? [
          '',
          'Products to prioritize first:',
          ...products.map((p) => `- ${p}`),
        ]
      : []),
    '',
    `Category focus: ${categories}.`,
    toneLines.cta,
    '',
    'Best regards,',
    'Mirakl',
  ]

  const ultraPersonalizedLines = [
    `Hi ${firstName},`,
    '',
    `I reviewed ${match.seller_name} and identified a strong marketplace opportunity on ${match.marketplace_name}.`,
    '',
    'The opportunity:',
    `- Compatibility score: ${score}/100`,
    `- Category fit: ${categories}`,
    ...(dataProof ? [`- Brand signal: ${dataProof}`] : []),
    ...(marketProof ? [`- Marketplace signal: ${marketProof}`] : []),
    '',
    'Why Mirakl Connect:',
    '- Access 450+ Mirakl-powered marketplaces globally',
    '- Launch in days with AI-powered catalog adaptation and validation',
    '- Prioritize channels that best match category and margin goals',
    '',
    ...(products.length
      ? [
          'Products to prioritize:',
          ...products.map((p) => `- ${p}`),
          '',
        ]
      : []),
    `Personalized fit note for ${match.seller_name}: ${rationale}`,
    toneLines.cta,
    '',
    'Best regards,',
    'Mirakl',
  ]

  return {
    detailed: {
      subject: bestSubject,
      body: detailedLines.join('\n'),
    },
    short: {
      subject: `${match.seller_name} × ${match.marketplace_name}: personalized growth plan`,
      body: ultraPersonalizedLines.join('\n'),
    },
  }
}

function KpiCard({ icon: Icon, label, value, delta, color, onClick }) {
  const palette = {
    blue:    'text-[#1f4f9a]',
    emerald: 'text-[#1f7a4f]',
    amber:   'text-[#8a5a1e]',
    red:     'text-[#b33f4f]',
    purple:  'text-[#5b53a6]',
    gray:    'text-[#475569]',
  }[color] ?? 'text-[#475569]'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`card cursor-pointer select-none ${onClick ? 'hover:ring-2 hover:ring-[#2563EB]/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <Icon size={19} className={palette} strokeWidth={1.8} />
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

  const variants = match ? createMiraklEmailVariants(match, seller, tone) : null

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
          { key: 'detailed', label: 'Detailed Personalized Email', subject: variants?.detailed?.subject, body: variants?.detailed?.body },
          { key: 'short',    label: 'Ultra Personalized Email',  subject: variants?.short?.subject,    body: variants?.short?.body },
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
  const [filterMarketplace, setFilterMarketplace] = useState('')
  const [filterReadiness, setFilterReadiness] = useState('')
  const [filterContact, setFilterContact] = useState('all')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [selected, setSelected]   = useState(null)
  const [sortKey, setSortKey]     = useState('compatibility_score')
  const [sortDir, setSortDir]     = useState('desc')
  const [page, setPage]           = useState(1)

  async function load() {
    setLoading(true)
    const [m, s, mp] = await Promise.all([fetchMatches({ limit: 5000 }), fetchSellers(), fetchMarketplaces()])
    const sellersById = Object.fromEntries((s.data ?? []).map((item) => [item.seller_id, item]))
    const marketplacesById = Object.fromEntries((mp.data ?? []).map((item) => [item.marketplace_id, item]))
    const enriched = (m.data ?? []).map((item) => {
      const seller = sellersById[item.seller_id] ?? {}
      const contact = resolveLeadContact(item, seller)
      const marketplace = marketplacesById[item.marketplace_id] ?? {}
      return {
        ...item,
        ...seller,
        decision_maker_email: contact.email,
        decision_maker_name: contact.name,
        marketplace_main_categories: marketplace.main_categories ?? null,
        marketplace_countries: marketplace.countries ?? null,
        marketplace_monthly_traffic: marketplace.monthly_traffic ?? null,
        marketplace_commission_rate: marketplace.commission_rate ?? null,
      }
    })
    setMatches(enriched)
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
    const normalized = matches.map(match => {
      const seller = sellersById[match.seller_id]
      const contact = resolveLeadContact(match, seller)
      return {
        ...match,
        decision_maker_email: contact.email,
        decision_maker_name: contact.name,
      }
    })
    const bestBySeller = new Map()
    for (const match of normalized) {
      const existing = bestBySeller.get(match.seller_id)
      if (!existing || (match.compatibility_score ?? 0) > (existing.compatibility_score ?? 0)) {
        bestBySeller.set(match.seller_id, match)
      }
    }
    return Array.from(bestBySeller.values())
  }, [matches, sellersById])

  const marketplaces = useMemo(() => {
    return [...new Set(leadRows.map(m => m.marketplace_name).filter(Boolean))].sort()
  }, [leadRows])

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
      if (filterMarketplace && m.marketplace_name !== filterMarketplace) return false
      if (filterReadiness && sendReadiness(m) !== filterReadiness) return false
      if (filterContact === 'with' && !m.decision_maker_email) return false
      const score = Number(m.compatibility_score ?? 0)
      if (minScore !== '' && score < Number(minScore)) return false
      if (maxScore !== '' && score > Number(maxScore)) return false
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
  }, [leadRows, search, view, filterMarketplace, filterReadiness, filterContact, minScore, maxScore, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [search, view, filterMarketplace, filterReadiness, filterContact, minScore, maxScore, sortKey, sortDir])

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

  const hasAdvancedFilters =
    filterMarketplace !== '' ||
    filterReadiness !== '' ||
    filterContact !== 'all' ||
    minScore !== '' ||
    maxScore !== ''

  function resetAdvancedFilters() {
    setFilterMarketplace('')
    setFilterReadiness('')
    setFilterContact('all')
    setMinScore('')
    setMaxScore('')
  }

  const selectedSeller = selected ? sellersById[selected.seller_id] : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <img src="/images/logo-mirakl.png" alt="Mirakl" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Global Dashboard</h1>
            <p className="text-sm text-muted mt-0.5">Lead queue · Email generation · Campaign health</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img
            src="/images/mirakl-nexus-orb.png"
            alt="Mirakl Nexus Orb"
            className="hidden h-11 w-11 flex-shrink-0 object-contain opacity-95 sm:block motion-safe:animate-[spin_16s_linear_infinite] motion-reduce:animate-none"
          />
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
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
          {/* Search + filters */}
          <div className="card space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sellers, marketplaces, contacts..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <select
                value={filterMarketplace}
                onChange={e => setFilterMarketplace(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">All marketplaces</option>
                {marketplaces.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <select
                value={filterReadiness}
                onChange={e => setFilterReadiness(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">All readiness</option>
                <option value="ready">Ready</option>
                <option value="missing_contact">Missing contact</option>
                <option value="in_campaign">In campaign</option>
              </select>
              <select
                value={filterContact}
                onChange={e => setFilterContact(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">All contacts</option>
                <option value="with">With contact</option>
                <option value="missing">Missing contact</option>
              </select>
              <input
                value={minScore}
                onChange={e => setMinScore(e.target.value)}
                type="number"
                min="0"
                max="100"
                placeholder="Min score"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              />
              <input
                value={maxScore}
                onChange={e => setMaxScore(e.target.value)}
                type="number"
                min="0"
                max="100"
                placeholder="Max score"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              />
              <button
                onClick={resetAdvancedFilters}
                disabled={!hasAdvancedFilters}
                className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset filters
              </button>
            </div>
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
                          <span className="text-xs text-emerald-600">Email on file</span>
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
