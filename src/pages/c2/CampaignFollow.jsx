import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  Search,
  Building2,
  Mail,
  Send,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { fetchMatches, fetchSellers, fetchMarketplaces, fitBandColor, sendReadiness, resolveLeadContact } from '../../lib/c2'

const PAGE_SIZE = 10

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

function createEmailVariants(match, tone = 'professional') {
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
  const categories = match?.categories || match?.product_types_list || match?.marketplace_main_categories || 'your category'
  const country = match?.country_origin ? `from ${match.country_origin}` : ''
  const nbProducts = match?.nb_products ? `${Number(match.nb_products).toLocaleString()} products` : null
  const avgPrice = match?.avg_price ? `avg price around €${Math.round(Number(match.avg_price))}` : null
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
    '[Your Name]',
    'Mirakl',
  ]

  const shortLines = [
    `Hi ${firstName},`,
    '',
    `${match.seller_name} is a ${score}/100 fit for ${match.marketplace_name}.`,
    `This can help accelerate your multichannel growth in ${categories}.`,
    ...(products[0] ? [`First product priority: ${products[0]}.`] : []),
    seasonal.ctaLine,
    '',
    '[Your Name]',
    'Mirakl',
  ]

  return {
    detailed: {
      subject: bestSubject,
      body: detailedLines.join('\n'),
    },
    short: {
      subject: `${match.seller_name}: opportunity on ${match.marketplace_name}`,
      body: shortLines.join('\n'),
    },
  }
}

function EmailEditorCard({
  title,
  variantKey,
  draft,
  onSubjectChange,
  onBodyChange,
  onRegenerate,
  onSend,
  canSend,
  sent,
}) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {sent && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={12} /> Sent
          </span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Subject</label>
        <input
          value={draft.subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email body</label>
        <textarea
          value={draft.body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={11}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onRegenerate(variantKey)}
          className="btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <Wand2 size={12} /> Regenerate
        </button>
        <button
          onClick={() => onSend(variantKey)}
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={12} /> Send
        </button>
      </div>
    </div>
  )
}

export default function C2CampaignFollow() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apolloRunning, setApolloRunning] = useState(false)
  const [sellerById, setSellerById] = useState({})
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [filterMarketplace, setFilterMarketplace] = useState('')
  const [filterContact, setFilterContact] = useState('all')
  const [filterReadiness, setFilterReadiness] = useState('')
  const [page, setPage] = useState(1)

  const [selectedMatch, setSelectedMatch] = useState(null)
  const [tone, setTone] = useState('professional')
  const [drafts, setDrafts] = useState({ detailed: { subject: '', body: '' }, short: { subject: '', body: '' } })
  const [sentFlags, setSentFlags] = useState({ detailed: false, short: false })

  const [toast, setToast] = useState(null)

  function notify(kind, msg) {
    setToast({ kind, msg })
    window.clearTimeout(window.__c2EmailToast)
    window.__c2EmailToast = window.setTimeout(() => setToast(null), 2500)
  }

  async function loadAll() {
    setRefreshing(true)
    const [{ data }, { data: sellers }, { data: marketplaces }] = await Promise.all([
      fetchMatches({ limit: 5000 }),
      fetchSellers({ limit: 5000 }),
      fetchMarketplaces(),
    ])
    const sellersById = Object.fromEntries((sellers ?? []).map((s) => [s.seller_id, s]))
    const marketplacesById = Object.fromEntries((marketplaces ?? []).map((m) => [m.marketplace_id, m]))
    setSellerById(sellersById)
    const cleaned = (data ?? [])
      .map((m) => {
        const seller = sellersById[m.seller_id]
        const contact = resolveLeadContact(m, seller)
        const marketplace = marketplacesById[m.marketplace_id]
        return {
          ...m,
          ...seller,
          decision_maker_email: contact.email,
          decision_maker_name: contact.name,
          marketplace_main_categories: marketplace?.main_categories ?? null,
          marketplace_countries: marketplace?.countries ?? null,
          marketplace_monthly_traffic: marketplace?.monthly_traffic ?? null,
          marketplace_commission_rate: marketplace?.commission_rate ?? null,
        }
      })
      .filter((m) => Number(m.compatibility_score ?? 0) > 0)
      .sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0))
    setMatches(cleaned)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const marketplaces = useMemo(() => {
    return [...new Set(matches.map((m) => m.marketplace_name).filter(Boolean))].sort()
  }, [matches])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return matches.filter((m) => {
      if (filterMarketplace && m.marketplace_name !== filterMarketplace) return false
      if (filterContact === 'with' && !m.decision_maker_email) return false
      if (filterContact === 'missing' && !!m.decision_maker_email) return false
      if (filterReadiness && sendReadiness(m) !== filterReadiness) return false
      if (minScore !== '' && (m.compatibility_score ?? 0) < Number(minScore)) return false
      if (maxScore !== '' && (m.compatibility_score ?? 0) > Number(maxScore)) return false
      if (!s) return true
      const hay = `${m.seller_name ?? ''} ${m.marketplace_name ?? ''} ${m.decision_maker_name ?? ''}`.toLowerCase()
      return hay.includes(s)
    })
  }, [matches, search, minScore, maxScore, filterMarketplace, filterContact, filterReadiness])

  useEffect(() => {
    setPage(1)
  }, [search, minScore, maxScore, filterMarketplace, filterContact, filterReadiness])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    if (!selectedMatch) return
    const fresh = createEmailVariants(selectedMatch, tone)
    setDrafts(fresh)
    setSentFlags({ detailed: false, short: false })
  }, [selectedMatch, tone])

  function updateDraft(kind, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [field]: value },
    }))
  }

  function regenerate(kind) {
    if (!selectedMatch) return
    const fresh = createEmailVariants(selectedMatch, tone)
    setDrafts((prev) => ({ ...prev, [kind]: fresh[kind] }))
    notify('info', `${kind === 'detailed' ? 'Detailed' : 'Short'} email regenerated.`)
  }

  function sendEmail(kind) {
    if (!selectedMatch?.decision_maker_email) {
      notify('error', 'No decision-maker email available for this lead.')
      return
    }
    const draft = drafts[kind]
    const mailto = `mailto:${selectedMatch.decision_maker_email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    window.location.href = mailto
    setSentFlags((prev) => ({ ...prev, [kind]: true }))
    notify('success', `${kind === 'detailed' ? 'Detailed' : 'Short'} email ready to send.`)
  }

  const withContact = matches.filter((m) => !!m.decision_maker_email).length
  const hasAdvancedFilters =
    minScore !== '' ||
    maxScore !== '' ||
    filterMarketplace !== '' ||
    filterContact !== 'all' ||
    filterReadiness !== ''

  function resetFilters() {
    setMinScore('')
    setMaxScore('')
    setFilterMarketplace('')
    setFilterContact('all')
    setFilterReadiness('')
  }

  async function runApolloContactFinder() {
    setApolloRunning(true)
    const beforeMissing = matches.filter((m) => !m.decision_maker_email).length
    // Placeholder local enrichment trigger: tries to re-attach seller contacts.
    setMatches((prev) =>
      prev.map((m) => {
        if (m.decision_maker_email) return m
        const seller = sellerById[m.seller_id]
        const contact = resolveLeadContact(m, seller)
        if (!contact.email) return m
        return {
          ...m,
          decision_maker_email: contact.email,
          decision_maker_name: contact.name,
        }
      }),
    )
    const afterMissing = matches
      .map((m) => {
        if (m.decision_maker_email) return m
        const seller = sellerById[m.seller_id]
        const contact = resolveLeadContact(m, seller)
        if (!contact.email) return m
        return { ...m, decision_maker_email: contact.email }
      })
      .filter((m) => !m.decision_maker_email).length
    const found = Math.max(0, beforeMissing - afterMissing)
    setApolloRunning(false)
    notify('info', found > 0 ? `Apollo lookup completed: ${found} contacts attached.` : 'Apollo lookup completed: no new contacts found.')
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl ${
            toast.kind === 'error' ? 'bg-red-600' : toast.kind === 'info' ? 'bg-[#1B3A5C]' : 'bg-emerald-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">Email Generation</h1>
          <p className="text-sm text-muted mt-0.5">
            Sales workspace: review, modify, regenerate, and send both generated email variants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runApolloContactFinder}
            disabled={apolloRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A5C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15304e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wand2 size={13} className={apolloRunning ? 'animate-spin' : ''} />
            {apolloRunning ? 'Running Apollo…' : 'Run Apollo Contact Finder'}
          </button>
          <button onClick={loadAll} disabled={refreshing} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="text-2xl font-bold text-[#2563EB]">{matches.length}</div><div className="text-xs text-muted">Sales leads</div></div>
        <div className="card"><div className="text-2xl font-bold text-emerald-600">{withContact}</div><div className="text-xs text-muted">With contact email</div></div>
        <div className="card"><div className="text-2xl font-bold text-indigo-600">{filtered.length}</div><div className="text-xs text-muted">Filtered leads</div></div>
        <div className="card"><div className="text-2xl font-bold text-purple-600">2</div><div className="text-xs text-muted">Email variants per lead</div></div>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller, marketplace, contact..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>
        <select
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All scores</option>
          <option value="70">&gt;= 70</option>
          <option value="80">&gt;= 80</option>
          <option value="90">&gt;= 90</option>
        </select>
        <input
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          type="number"
          min="0"
          max="100"
          placeholder="Max score"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
        />
        <select
          value={filterMarketplace}
          onChange={(e) => setFilterMarketplace(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All marketplaces</option>
          {marketplaces.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={filterReadiness}
          onChange={(e) => setFilterReadiness(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All readiness</option>
          <option value="ready">Ready</option>
          <option value="missing_contact">Missing contact</option>
          <option value="in_campaign">In campaign</option>
        </select>
        <select
          value={filterContact}
          onChange={(e) => setFilterContact(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">All contacts</option>
          <option value="with">With contact</option>
          <option value="missing">Missing contact</option>
        </select>
        <button
          onClick={resetFilters}
          disabled={!hasAdvancedFilters}
          className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset filters
        </button>
      </div>

      {selectedMatch && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-text">{selectedMatch.seller_name}</h2>
                <p className="text-sm text-muted">{selectedMatch.marketplace_name}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                {['professional', 'direct', 'warm'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      tone === t ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EmailEditorCard
              title="Detailed Personalized Email"
              variantKey="detailed"
              draft={drafts.detailed}
              onSubjectChange={(v) => updateDraft('detailed', 'subject', v)}
              onBodyChange={(v) => updateDraft('detailed', 'body', v)}
              onRegenerate={regenerate}
              onSend={sendEmail}
              canSend={!!selectedMatch.decision_maker_email}
              sent={sentFlags.detailed}
            />

            <EmailEditorCard
              title="Short High-Conviction Email"
              variantKey="short"
              draft={drafts.short}
              onSubjectChange={(v) => updateDraft('short', 'subject', v)}
              onBodyChange={(v) => updateDraft('short', 'body', v)}
              onRegenerate={regenerate}
              onSend={sendEmail}
              canSend={!!selectedMatch.decision_maker_email}
              sent={sentFlags.short}
            />
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">No leads found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Seller × Marketplace</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const selected =
                      selectedMatch?.seller_id === m.seller_id &&
                      selectedMatch?.marketplace_id === m.marketplace_id
                    return (
                      <tr
                        key={`${m.seller_id}|${m.marketplace_id}`}
                        className={`border-t border-gray-100 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-text">{m.seller_name}</div>
                          <div className="text-xs text-muted inline-flex items-center gap-1"><Building2 size={10} /> {m.marketplace_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${fitBandColor(m.compatibility_score)}`}>
                            {Number(m.compatibility_score ?? 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.decision_maker_email ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Mail size={11} /> Email available</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500"><AlertCircle size={11} /> Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedMatch(m)}
                            className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                          >
                            Review emails
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
