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
const RECO_OPTIONS    = ['QUALIFIE', 'A_REVOIR', 'REJETE']
const CONTEXTE_OPTIONS = ['amazon_only', 'multichannel', 'high_performer']

function MarketplaceChips({ list, color }) {
  if (!list || list.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.slice(0, 3).map((m) => (
        <span
          key={m}
          style={{
            display: 'inline-block',
            padding: '1px 5px',
            fontSize: '9px',
            fontWeight: 600,
            borderRadius: '4px',
            ...color,
          }}
        >
          {m.replace(/_/g, ' ')}
        </span>
      ))}
      {list.length > 3 && (
        <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>+{list.length - 3}</span>
      )}
    </div>
  )
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const TH = ({ children }) => (
  <th style={{
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-3)',
    whiteSpace: 'nowrap',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'Outfit, sans-serif',
  }}>
    {children}
  </th>
)

export default function Leads() {
  const [rows, setRows]         = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [loading, setLoading]   = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const [filters, setFilters] = useState({
    statuts: [], recommandation: '', scoreMin: '', contexte: '', variant: '', category: '', search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, decision_maker_name, decision_maker_title, enriched_at, ab_variant, amazon_sellers!inner(seller_name, seller_url, categories, category, target_marketplaces, present_marketplaces), seller_sequence(sequence_step, statut_sequence)', { count: 'exact' })
      .order('enriched_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.statuts.length > 0)  query = query.in('statut', filters.statuts)
    if (filters.recommandation)       query = query.eq('recommandation', filters.recommandation)
    if (filters.scoreMin)             query = query.gte('score_total', parseInt(filters.scoreMin))
    if (filters.contexte)             query = query.eq('contexte_detecte', filters.contexte)
    if (filters.variant)              query = query.eq('ab_variant', filters.variant)
    if (filters.category)             query = query.eq('amazon_sellers.category', filters.category)

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

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_qualification' }, () => { loadLeads() })
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

  async function handleExport() {
    const { data } = await supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, decision_maker_name, decision_maker_email, decision_maker_title, decision_maker_linkedin, enriched_at, ab_variant, error_reason, amazon_sellers(seller_name, seller_url, categories, nb_products, rating, nb_reviews, avg_price)')
      .order('enriched_at', { ascending: false })
    if (!data) return

    const cols = ['seller_name', 'seller_url', 'categories', 'nb_products', 'rating', 'statut', 'score_total', 'recommandation', 'contexte_detecte', 'decision_maker_name', 'decision_maker_email', 'decision_maker_title', 'decision_maker_linkedin', 'enriched_at', 'ab_variant', 'error_reason']
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`)
    const csvRows = data.map((r) => [
      esc(r.amazon_sellers?.seller_name), esc(r.amazon_sellers?.seller_url), esc(r.amazon_sellers?.categories),
      esc(r.amazon_sellers?.nb_products), esc(r.amazon_sellers?.rating),
      esc(r.statut), esc(r.score_total), esc(r.recommandation), esc(r.contexte_detecte),
      esc(r.decision_maker_name), esc(r.decision_maker_email), esc(r.decision_maker_title), esc(r.decision_maker_linkedin),
      esc(r.enriched_at), esc(r.ab_variant), esc(r.error_reason),
    ].join(','))

    const csv = [cols.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirakl-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        seller_name: r.seller_name, seller_url: r.seller_url || null, categories: r.categories || null,
        nb_products: r.nb_products ? parseInt(r.nb_products) : null,
        rating: r.rating ? parseFloat(r.rating) : null,
        nb_reviews: r.nb_reviews ? parseInt(r.nb_reviews) : null,
        avg_price: r.avg_price ? parseFloat(r.avg_price) : null,
      }, { onConflict: 'seller_url', ignoreDuplicates: false })
      if (error) errors++; else inserted++
    }
    setImportResult({ inserted, errors })
    setImporting(false)
    e.target.value = ''
    loadLeads()
  }

  const filterBtnStyle = (active) => ({
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Outfit, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'rgba(39,100,255,0.1)' : 'var(--surface-2)',
    color: active ? '#2764ff' : 'var(--text-3)',
    border: active ? '1px solid rgba(39,100,255,0.25)' : '1px solid var(--border-strong)',
  })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--text)',
            lineHeight: 1.1,
          }}>
            Leads
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
            {total.toLocaleString()} leads
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: '30px', width: '180px' }}
              placeholder="Rechercher…"
              value={filters.search}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(0) }}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              ...filterBtnStyle(showFilters || hasFilters),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Filter size={13} />
            Filtres
            {hasFilters && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(39,100,255,0.2)', fontSize: '9px', fontWeight: 700, color: '#2764ff' }}
              >
                {filters.statuts.length + (filters.recommandation ? 1 : 0) + (filters.scoreMin ? 1 : 0) + (filters.contexte ? 1 : 0) + (filters.variant ? 1 : 0) + (filters.category ? 1 : 0)}
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}
            >
              <X size={14} />
            </button>
          )}

          <button onClick={handleExport} className="btn-secondary" style={{ fontSize: '12px', padding: '7px 12px' }}>
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '7px 12px', opacity: importing ? 0.5 : 1 }}
          >
            {importing ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{
            background: importResult.errors === 0 ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
            border: `1px solid ${importResult.errors === 0 ? 'rgba(22,163,74,0.2)' : 'rgba(217,119,6,0.2)'}`,
            color: importResult.errors === 0 ? '#16a34a' : '#d97706',
          }}
        >
          <CheckCircle2 size={14} />
          Import terminé — {importResult.inserted} ligne(s) importée(s)
          {importResult.errors > 0 ? `, ${importResult.errors} erreur(s)` : ''}
          <button onClick={() => setImportResult(null)} className="ml-auto" style={{ color: 'inherit', opacity: 0.6 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="card space-y-4 fade-up">
          {/* Categories */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
              Catégorie produit
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilters((f) => ({ ...f, category: '' })); setPage(0) }}
                style={filterBtnStyle(!filters.category)}
              >
                Toutes
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setFilters((f) => ({ ...f, category: c.key })); setPage(0) }}
                  style={{ ...filterBtnStyle(filters.category === c.key), display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statuts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
              Statut
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => toggleStatus(s)} style={filterBtnStyle(filters.statuts.includes(s))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Other filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                Recommandation
              </label>
              <select className="input" value={filters.recommandation} onChange={(e) => { setFilters((f) => ({ ...f, recommandation: e.target.value })); setPage(0) }}>
                <option value="">Toutes</option>
                {RECO_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                Score min
              </label>
              <input type="number" min="0" max="100" className="input" placeholder="0" value={filters.scoreMin} onChange={(e) => { setFilters((f) => ({ ...f, scoreMin: e.target.value })); setPage(0) }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                Contexte
              </label>
              <select className="input" value={filters.contexte} onChange={(e) => { setFilters((f) => ({ ...f, contexte: e.target.value })); setPage(0) }}>
                <option value="">Tous</option>
                {CONTEXTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                Variant A/B
              </label>
              <select className="input" value={filters.variant} onChange={(e) => { setFilters((f) => ({ ...f, variant: e.target.value })); setPage(0) }}>
                <option value="">Tous</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden fade-up-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Vendeur', 'Décideur', 'Score', 'Recommandation', 'Catégorie', 'Statut', 'Séq.', 'A/B', 'Date'].map((h) => (
                  <TH key={h}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : rows.map((r, idx) => (
                <tr
                  key={r.seller_id}
                  onClick={() => setSelectedId(r.seller_id)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(16,43,73,0.02)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,100,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(16,43,73,0.02)'}
                >
                  {/* Vendeur */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1.5" style={{ maxWidth: '180px' }}>
                      <span
                        className="truncate font-medium"
                        style={{ color: 'var(--text)' }}
                      >
                        {r.amazon_sellers?.seller_name || '—'}
                      </span>
                      {r.amazon_sellers?.seller_url && (
                        <a
                          href={r.amazon_sellers.seller_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--text-3)', flexShrink: 0 }}
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Décideur */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {r.decision_maker_name ? (
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text)' }}>{r.decision_maker_name}</p>
                        {r.decision_maker_title && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-3)', maxWidth: '140px', marginTop: '1px' }}>
                            {r.decision_maker_title}
                          </p>
                        )}
                      </div>
                    ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>

                  {/* Score */}
                  <td style={{ padding: '10px 14px' }}>
                    <ScoreBadge score={r.score_total} />
                  </td>

                  {/* Reco */}
                  <td style={{ padding: '10px 14px' }}>
                    <RecoBadge value={r.recommandation} />
                  </td>

                  {/* Catégorie */}
                  <td style={{ padding: '10px 14px' }}>
                    {(() => {
                      const catKey = r.amazon_sellers?.category || 'mode'
                      const cat = getCategory(catKey)
                      const present = r.amazon_sellers?.present_marketplaces || []
                      const target  = r.amazon_sellers?.target_marketplaces || []
                      return (
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'rgba(16,43,73,0.06)',
                            color: 'var(--text-2)',
                            border: '1px solid rgba(16,43,73,0.1)',
                            whiteSpace: 'nowrap',
                          }}>
                            {cat.emoji} {cat.label}
                          </span>
                          {present.length > 0 && (
                            <MarketplaceChips
                              list={present}
                              color={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '4px' }}
                            />
                          )}
                          {present.length === 0 && target.length > 0 && (
                            <MarketplaceChips
                              list={target}
                              color={{ background: 'rgba(120,128,200,0.06)', color: 'var(--text-3)', borderRadius: '4px' }}
                            />
                          )}
                        </div>
                      )
                    })()}
                  </td>

                  {/* Statut */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <StatusBadge status={r.statut} />
                  </td>

                  {/* Séquence */}
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {r.seller_sequence?.sequence_step != null ? (
                      r.seller_sequence.statut_sequence === 'terminee' ? (
                        <span style={{ color: '#16a34a', fontSize: '13px' }}>✓</span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 7px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontFamily: 'DM Mono, monospace',
                          fontWeight: 500,
                          background: 'rgba(39,100,255,0.1)',
                          color: '#2764ff',
                          border: '1px solid rgba(39,100,255,0.2)',
                        }}>
                          {r.seller_sequence.sequence_step}/3
                        </span>
                      )
                    ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>

                  {/* Variant */}
                  <td style={{ padding: '10px 14px' }}>
                    {r.ab_variant ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '1px 7px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 700,
                        background: r.ab_variant === 'A' ? 'rgba(39,100,255,0.1)' : 'rgba(220,38,38,0.1)',
                        color: r.ab_variant === 'A' ? '#2764ff' : '#dc2626',
                        border: r.ab_variant === 'A' ? '1px solid rgba(39,100,255,0.2)' : '1px solid rgba(220,38,38,0.2)',
                      }}>
                        {r.ab_variant}
                      </span>
                    ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace' }}>
                    {fmt(r.enriched_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
              Page {page + 1} / {totalPages} — {total} leads
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: page === 0 ? 'var(--text-3)' : 'var(--text-2)',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  opacity: page === 0 ? 0.4 : 1,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: page >= totalPages - 1 ? 'var(--text-3)' : 'var(--text-2)',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
