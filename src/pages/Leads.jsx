import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink, Filter, X, Download, Upload, RefreshCw, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import ScoreBadge from '../components/ScoreBadge'
import RecoBadge from '../components/RecoBadge'
import LeadDrawer from '../components/LeadDrawer'
import { CATEGORIES, getCategory } from '../lib/categories'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  'scored', 'enriched', 'sequence_en_cours', 'sequence_terminee', 'HOT', 'REPLIED',
  'enrichment_failed', 'enrichment_failed_final', 'generation_failed', 'REJETE_FILTRE', 'A_SCORER',
]

const RECO_OPTIONS = ['QUALIFIE', 'A_REVOIR', 'REJETE']
const CONTEXTE_OPTIONS = ['amazon_only', 'multichannel', 'high_performer']

function MarketplaceChips({ list, color }) {
  if (!list || list.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.slice(0, 3).map((m) => (
        <span
          key={m}
          className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded ${color}`}
        >
          {m.replace(/_/g, ' ')}
        </span>
      ))}
      {list.length > 3 && (
        <span className="text-[9px] text-gray-400">+{list.length - 3}</span>
      )}
    </div>
  )
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function Leads() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const [filters, setFilters] = useState({
    statuts: [],
    recommandation: '',
    scoreMin: '',
    contexte: '',
    variant: '',
    category: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, decision_maker_name, decision_maker_title, enriched_at, ab_variant, amazon_sellers!inner(seller_name, seller_url, categories, category, target_marketplaces, present_marketplaces), seller_sequence(sequence_step, statut_sequence, opened_count, clicked_count, replied)', { count: 'exact' })
      .order('enriched_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.statuts.length > 0) query = query.in('statut', filters.statuts)
    if (filters.recommandation) query = query.eq('recommandation', filters.recommandation)
    if (filters.scoreMin) query = query.gte('score_total', parseInt(filters.scoreMin))
    if (filters.contexte) query = query.eq('contexte_detecte', filters.contexte)
    if (filters.variant) query = query.eq('ab_variant', filters.variant)
    if (filters.category) query = query.eq('amazon_sellers.category', filters.category)

    const { data, count } = await query
    let items = data || []

    if (filters.search) {
      const s = filters.search.toLowerCase()
      items = items.filter(
        (r) =>
          r.amazon_sellers?.seller_name?.toLowerCase().includes(s) ||
          r.decision_maker_name?.toLowerCase().includes(s)
      )
    }

    setRows(items)
    setTotal(count || 0)
    setLoading(false)
  }, [page, filters])

  useEffect(() => { loadLeads() }, [loadLeads])

  /* Realtime auto-refresh */
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_qualification' }, () => {
        loadLeads()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadLeads])

  function toggleStatus(s) {
    setFilters((f) => ({
      ...f,
      statuts: f.statuts.includes(s) ? f.statuts.filter((x) => x !== s) : [...f.statuts, s],
    }))
    setPage(0)
  }

  function clearFilters() {
    setFilters({ statuts: [], recommandation: '', scoreMin: '', contexte: '', variant: '', category: '', search: '' })
    setPage(0)
  }

  const hasFilters = filters.statuts.length > 0 || filters.recommandation || filters.scoreMin || filters.contexte || filters.variant || filters.category || filters.search

  const totalPages = Math.ceil(total / PAGE_SIZE)

  /* ---- CSV Export ---- */
  async function handleExport() {
    const { data } = await supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, decision_maker_name, decision_maker_email, decision_maker_title, decision_maker_linkedin, enriched_at, ab_variant, error_reason, amazon_sellers(seller_name, seller_url, categories, nb_products, rating, nb_reviews, avg_price)')
      .order('enriched_at', { ascending: false })
    if (!data) return

    const cols = ['seller_name', 'seller_url', 'categories', 'nb_products', 'rating', 'statut', 'score_total', 'recommandation', 'contexte_detecte', 'decision_maker_name', 'decision_maker_email', 'decision_maker_title', 'decision_maker_linkedin', 'enriched_at', 'ab_variant', 'error_reason']
    const header = cols.join(',')
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`)
    const rows = data.map((r) => [
      esc(r.amazon_sellers?.seller_name), esc(r.amazon_sellers?.seller_url), esc(r.amazon_sellers?.categories),
      esc(r.amazon_sellers?.nb_products), esc(r.amazon_sellers?.rating),
      esc(r.statut), esc(r.score_total), esc(r.recommandation), esc(r.contexte_detecte),
      esc(r.decision_maker_name), esc(r.decision_maker_email), esc(r.decision_maker_title), esc(r.decision_maker_linkedin),
      esc(r.enriched_at), esc(r.ab_variant), esc(r.error_reason),
    ].join(','))

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirakl-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---- CSV Import ---- */
  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    const text = await file.text()
    const lines = text.split('\n').filter(Boolean)
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

    const parse = (line) => {
      const vals = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { vals.push(cur); cur = '' }
        else cur += ch
      }
      vals.push(cur)
      return vals.map((v) => v.trim().replace(/^"|"$/g, '') || null)
    }

    const records = lines.slice(1).map((line) => {
      const vals = parse(line)
      return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i] }), {})
    })

    let inserted = 0, errors = 0
    for (const r of records) {
      if (!r.seller_name) continue
      const { error } = await supabase.from('amazon_sellers').upsert({
        seller_name: r.seller_name,
        seller_url: r.seller_url || null,
        categories: r.categories || null,
        nb_products: r.nb_products ? parseInt(r.nb_products) : null,
        rating: r.rating ? parseFloat(r.rating) : null,
        nb_reviews: r.nb_reviews ? parseInt(r.nb_reviews) : null,
        avg_price: r.avg_price ? parseFloat(r.avg_price) : null,
      }, { onConflict: 'seller_url', ignoreDuplicates: false })
      if (error) errors++
      else inserted++
    }

    setImportResult({ inserted, errors })
    setImporting(false)
    e.target.value = ''
    loadLeads()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Leads</h1>
          <p className="text-muted text-sm mt-0.5">{total.toLocaleString()} leads au total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9 w-48"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(0) }}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters || hasFilters ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-text border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter size={15} />
            Filtres
            {hasFilters && <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs">{filters.statuts.length + (filters.recommandation ? 1 : 0) + (filters.scoreMin ? 1 : 0) + (filters.contexte ? 1 : 0) + (filters.variant ? 1 : 0) + (filters.category ? 1 : 0)}</span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="p-2 rounded-lg hover:bg-gray-100 text-muted transition-colors">
              <X size={16} />
            </button>
          )}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-text hover:bg-gray-50 transition-colors"
              title="Exporter en CSV"
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-text hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Importer des leads (CSV)"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${importResult.errors === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <CheckCircle2 size={15} />
          Import completed — {importResult.inserted} row(s) imported{importResult.errors > 0 ? `, ${importResult.errors} error(s)` : ''}
          <button onClick={() => setImportResult(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {showFilters && (
        <div className="card p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">Category produit</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilters((f) => ({ ...f, category: '' })); setPage(0) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${!filters.category ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setFilters((f) => ({ ...f, category: c.key })); setPage(0) }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${filters.category === c.key ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${filters.statuts.includes(s) ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Recommendation</label>
              <select className="input w-full" value={filters.recommandation} onChange={(e) => { setFilters((f) => ({ ...f, recommandation: e.target.value })); setPage(0) }}>
                <option value="">All</option>
                {RECO_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Score min</label>
              <input type="number" min="0" max="100" className="input w-full" placeholder="0" value={filters.scoreMin} onChange={(e) => { setFilters((f) => ({ ...f, scoreMin: e.target.value })); setPage(0) }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Contexte</label>
              <select className="input w-full" value={filters.contexte} onChange={(e) => { setFilters((f) => ({ ...f, contexte: e.target.value })); setPage(0) }}>
                <option value="">Tous</option>
                {CONTEXTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Variant A/B</label>
              <select className="input w-full" value={filters.variant} onChange={(e) => { setFilters((f) => ({ ...f, variant: e.target.value })); setPage(0) }}>
                <option value="">Tous</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Seller', 'Decision maker', 'Score', 'Recommendation', 'Category', 'Status', 'Sequence', 'Engagement', 'Variant', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted">No leads found</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.seller_id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(r.seller_id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-text max-w-[180px]">
                        <span className="truncate">{r.amazon_sellers?.seller_name || '—'}</span>
                        {r.amazon_sellers?.seller_url && (
                          <a
                            href={r.amazon_sellers.seller_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted hover:text-[#1B3A5C] flex-shrink-0"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.decision_maker_name ? (
                        <div>
                          <p className="font-medium text-text">{r.decision_maker_name}</p>
                          {r.decision_maker_title && <p className="text-xs text-muted truncate max-w-[140px]">{r.decision_maker_title}</p>}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><ScoreBadge score={r.score_total} /></td>
                    <td className="px-4 py-3"><RecoBadge value={r.recommandation} /></td>
                    <td className="px-4 py-3">
                      {(() => {
                        const catKey = r.amazon_sellers?.category || 'mode'
                        const cat = getCategory(catKey)
                        const present = r.amazon_sellers?.present_marketplaces || []
                        const target = r.amazon_sellers?.target_marketplaces || []
                        return (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">
                              {cat.label}
                            </span>
                            {present.length > 0 && (
                              <MarketplaceChips list={present} color="bg-green-100 text-green-700" />
                            )}
                            {present.length === 0 && target.length > 0 && (
                              <MarketplaceChips list={target} color="bg-slate-50 text-slate-500" />
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.statut} /></td>
                    <td className="px-4 py-3 text-center">
                      {r.seller_sequence?.sequence_step != null ? (
                        r.seller_sequence.statut_sequence === 'terminee' ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {r.seller_sequence.sequence_step}/3
                          </span>
                        )
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.seller_sequence ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            O: {r.seller_sequence.opened_count || 0}
                          </span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            C: {r.seller_sequence.clicked_count || 0}
                          </span>
                          {r.seller_sequence.replied && (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                              Replied
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.ab_variant ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.ab_variant === 'A' ? 'bg-[#1B3A5C]/10 text-[#1B3A5C]' : 'bg-[#E8445A]/10 text-[#E8445A]'}`}>
                          {r.ab_variant}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{fmt(r.enriched_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-muted">
              Page {page + 1} / {totalPages} — {total} leads
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
