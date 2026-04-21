import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink, Filter, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import ScoreBadge from '../components/ScoreBadge'
import RecoBadge from '../components/RecoBadge'
import LeadDrawer from '../components/LeadDrawer'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  'scored', 'enriched', 'sequence_en_cours', 'sequence_terminee', 'HOT', 'REPLIED',
  'enrichment_failed', 'enrichment_failed_final', 'generation_failed', 'REJETE_FILTRE', 'A_SCORER',
]

const RECO_OPTIONS = ['QUALIFIE', 'A_REVOIR', 'REJETE']
const CONTEXTE_OPTIONS = ['amazon_only', 'multichannel', 'high_performer']

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
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, decision_maker_name, decision_maker_title, enriched_at, ab_variant, amazon_sellers(seller_name, seller_url, categories), seller_sequence(sequence_step, statut_sequence)', { count: 'exact' })
      .order('enriched_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.statuts.length > 0) query = query.in('statut', filters.statuts)
    if (filters.recommandation) query = query.eq('recommandation', filters.recommandation)
    if (filters.scoreMin) query = query.gte('score_total', parseInt(filters.scoreMin))
    if (filters.contexte) query = query.eq('contexte_detecte', filters.contexte)
    if (filters.variant) query = query.eq('ab_variant', filters.variant)

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

  function toggleStatus(s) {
    setFilters((f) => ({
      ...f,
      statuts: f.statuts.includes(s) ? f.statuts.filter((x) => x !== s) : [...f.statuts, s],
    }))
    setPage(0)
  }

  function clearFilters() {
    setFilters({ statuts: [], recommandation: '', scoreMin: '', contexte: '', variant: '', search: '' })
    setPage(0)
  }

  const hasFilters = filters.statuts.length > 0 || filters.recommandation || filters.scoreMin || filters.contexte || filters.variant || filters.search

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Leads</h1>
          <p className="text-muted text-sm mt-0.5">{total.toLocaleString()} leads au total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9 w-56"
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
            {hasFilters && <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs">{filters.statuts.length + (filters.recommandation ? 1 : 0) + (filters.scoreMin ? 1 : 0) + (filters.contexte ? 1 : 0) + (filters.variant ? 1 : 0)}</span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="p-2 rounded-lg hover:bg-gray-100 text-muted transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">Statut</p>
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
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Recommandation</label>
              <select className="input w-full" value={filters.recommandation} onChange={(e) => { setFilters((f) => ({ ...f, recommandation: e.target.value })); setPage(0) }}>
                <option value="">Toutes</option>
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
                {['Vendeur', 'Décideur', 'Score', 'Recommandation', 'Catégorie', 'Statut', 'Séquence', 'Variant', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted">Chargement...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted">Aucun lead trouvé</td>
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
                      {r.amazon_sellers?.categories ? (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {r.amazon_sellers.categories}
                        </span>
                      ) : '—'}
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
