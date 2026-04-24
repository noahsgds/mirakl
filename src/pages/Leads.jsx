import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink, Filter, X, Download, Upload, RefreshCw, CheckCircle2, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import ScoreBadge from '../components/ScoreBadge'
import RecoBadge from '../components/RecoBadge'
import LeadDrawer from '../components/LeadDrawer'
import { CATEGORIES, getCategory } from '../lib/categories'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  'A_SCORER', 'scored', 'enriched', 'emails_générés', 'HOT', 'REPLIED',
  'BOUNCE', 'UNSUBSCRIBED', 'REJETE_FILTRE', 'enrichment_failed', 'generation_failed',
]

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function ZalandoBadge({ value }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>
  return value
    ? <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">Zalando ✓</span>
    : <span className="text-xs text-muted">—</span>
}

export default function Leads() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({ search: '', category: '', statuts: [], scoreMin: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('amazon_sellers')
      .select(
        `seller_id, seller_name, seller_url, categories, category,
         nb_products, rating, nb_reviews, avg_price, on_zalando,
         seller_qualification(statut, score_total, recommandation, decision_maker_name, decision_maker_title, enriched_at)`,
        { count: 'exact' }
      )
      .order('nb_products', { ascending: false, nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.search) {
      query = query.ilike('seller_name', `%${filters.search}%`)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.statuts.length > 0) {
      query = query.filter('seller_qualification.statut', 'in', `(${filters.statuts.join(',')})`)
    }
    if (filters.scoreMin) {
      query = query.filter('seller_qualification.score_total', 'gte', parseInt(filters.scoreMin))
    }

    const { data, count } = await query
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, filters])

  useEffect(() => { loadLeads() }, [loadLeads])

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_sellers' }, () => loadLeads())
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
    setFilters({ search: '', category: '', statuts: [], scoreMin: '' })
    setPage(0)
  }

  const hasFilters = filters.search || filters.category || filters.statuts.length > 0 || filters.scoreMin
  const totalPages = Math.ceil(total / PAGE_SIZE)

  /* ---- CSV Export ---- */
  async function handleExport() {
    const { data } = await supabase
      .from('amazon_sellers')
      .select('seller_id, seller_name, seller_url, categories, category, nb_products, rating, nb_reviews, avg_price, on_zalando, seller_qualification(statut, score_total, recommandation, decision_maker_name, decision_maker_email, decision_maker_title, decision_maker_linkedin, enriched_at)')
      .order('nb_products', { ascending: false, nullsFirst: false })
    if (!data) return

    const cols = ['seller_name', 'seller_url', 'categories', 'category', 'nb_products', 'rating', 'nb_reviews', 'avg_price', 'on_zalando', 'statut', 'score_total', 'recommandation', 'decision_maker_name', 'decision_maker_email', 'decision_maker_title', 'decision_maker_linkedin', 'enriched_at']
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`)
    const csvRows = data.map((r) => {
      const q = r.seller_qualification
      return [
        esc(r.seller_name), esc(r.seller_url), esc(r.categories), esc(r.category),
        esc(r.nb_products), esc(r.rating), esc(r.nb_reviews), esc(r.avg_price), esc(r.on_zalando),
        esc(q?.statut), esc(q?.score_total), esc(q?.recommandation),
        esc(q?.decision_maker_name), esc(q?.decision_maker_email),
        esc(q?.decision_maker_title), esc(q?.decision_maker_linkedin), esc(q?.enriched_at),
      ].join(',')
    })

    const csv = [cols.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `c1-sellers-${new Date().toISOString().slice(0, 10)}.csv`
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Leads C1</h1>
          <p className="text-muted text-sm mt-0.5">{total.toLocaleString()} sellers dans la table Amazon</p>
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
            {hasFilters && (
              <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {filters.statuts.length + (filters.category ? 1 : 0) + (filters.scoreMin ? 1 : 0)}
              </span>
            )}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="p-2 rounded-lg hover:bg-gray-100 text-muted transition-colors">
              <X size={16} />
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-text hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-text hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${importResult.errors === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <CheckCircle2 size={15} />
          {importResult.inserted} ligne(s) importée(s){importResult.errors > 0 ? `, ${importResult.errors} erreur(s)` : ''}
          <button onClick={() => setImportResult(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilters((f) => ({ ...f, category: '' })); setPage(0) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${!filters.category ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                Toutes
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setFilters((f) => ({ ...f, category: c.key })); setPage(0) }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${filters.category === c.key ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">Statut qualification</p>
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
          <div className="w-40">
            <label className="text-xs font-semibold text-muted uppercase mb-1 block">Score min</label>
            <input
              type="number" min="0" max="100"
              className="input w-full" placeholder="0"
              value={filters.scoreMin}
              onChange={(e) => { setFilters((f) => ({ ...f, scoreMin: e.target.value })); setPage(0) }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Seller', 'Catégorie', 'Produits', 'Note', 'Avis', 'Prix moy.', 'Zalando', 'Statut C1', 'Score', 'Decision maker', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-muted">Chargement...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-muted">Aucun seller trouvé</td></tr>
              ) : rows.map((r) => {
                const q = r.seller_qualification
                const cat = getCategory(r.category || 'mode')
                return (
                  <tr
                    key={r.seller_id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(r.seller_id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-text max-w-[180px]">
                        <span className="truncate">{r.seller_name || '—'}</span>
                        {r.seller_url && (
                          <a href={r.seller_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted hover:text-[#1B3A5C] flex-shrink-0">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                        <span>{cat.emoji}</span>{cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-text">
                      {r.nb_products != null ? r.nb_products.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.rating != null ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                          <Star size={11} fill="currentColor" />{r.rating}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {r.nb_reviews != null ? r.nb_reviews.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {r.avg_price != null ? `${r.avg_price}€` : '—'}
                    </td>
                    <td className="px-4 py-3"><ZalandoBadge value={r.on_zalando} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q?.statut ? <StatusBadge status={q.statut} /> : <span className="text-xs text-muted">Non qualifié</span>}
                    </td>
                    <td className="px-4 py-3">
                      {q?.score_total != null ? <ScoreBadge score={q.score_total} /> : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q?.decision_maker_name ? (
                        <div>
                          <p className="font-medium text-text">{q.decision_maker_name}</p>
                          {q.decision_maker_title && <p className="text-xs text-muted truncate max-w-[140px]">{q.decision_maker_title}</p>}
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{fmt(q?.enriched_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-muted">Page {page + 1} / {totalPages} — {total.toLocaleString()} sellers</p>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
