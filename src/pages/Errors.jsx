import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import LeadDrawer from '../components/LeadDrawer'

const ERROR_STATUTS = ['enrichment_failed', 'enrichment_failed_final', 'generation_failed', 'REJETE_FILTRE']

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Errors() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [relaunching, setRelaunching] = useState({})
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('seller_qualification')
      .select('seller_id, statut, error_reason, enriched_at, scored_at, amazon_sellers(seller_name, seller_url)')
      .in('statut', ERROR_STATUTS)
      .order('enriched_at', { ascending: false, nullsFirst: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRelaunch(sellerId) {
    setRelaunching((r) => ({ ...r, [sellerId]: true }))
    await supabase
      .from('seller_qualification')
      .update({ statut: 'scored', error_reason: null })
      .eq('seller_id', sellerId)
    setRelaunching((r) => ({ ...r, [sellerId]: false }))
    load()
  }

  async function handleRelaunchAll() {
    const ids = rows.filter((r) => r.statut !== 'REJETE_FILTRE').map((r) => r.seller_id)
    if (ids.length === 0) return
    await supabase
      .from('seller_qualification')
      .update({ statut: 'scored', error_reason: null })
      .in('seller_id', ids)
    load()
  }

  const relaunchable = rows.filter((r) => r.statut !== 'REJETE_FILTRE')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Pipeline errors</h1>
          <p className="text-muted text-sm mt-0.5">{rows.length} blocked leads</p>
        </div>
        {relaunchable.length > 0 && (
          <button
            onClick={handleRelaunchAll}
            className="flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
          >
            <RefreshCw size={15} />
            Retry all ({relaunchable.length})
          </button>
        )}
      </div>

      {/* Breakdown */}
      <div className="flex flex-wrap gap-2">
        {ERROR_STATUTS.map((s) => {
          const count = rows.filter((r) => r.statut === s).length
          return count > 0 ? (
            <div key={s} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <StatusBadge status={s} />
              <span className="text-sm font-semibold text-text">{count}</span>
            </div>
          ) : null
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Seller', 'Status', 'Raison d\'erreur', 'Date', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <AlertTriangle size={32} className="opacity-30" />
                    <p>No errors detected — pipeline healthy!</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.seller_id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(r.seller_id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-text max-w-[200px]">
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
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.statut} /></td>
                  <td className="px-4 py-3">
                    {r.error_reason ? (
                      <p className="text-sm text-red-600 max-w-xs">{r.error_reason}</p>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {fmt(r.enriched_at || r.scored_at)}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {r.statut !== 'REJETE_FILTRE' && (
                      <button
                        disabled={relaunching[r.seller_id]}
                        onClick={() => handleRelaunch(r.seller_id)}
                        className="flex items-center gap-1.5 bg-[#1B3A5C] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#15304e] disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={12} className={relaunching[r.seller_id] ? 'animate-spin' : ''} />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
