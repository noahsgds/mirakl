import { useEffect, useState } from 'react'
import {
  Users, Flame, MessageSquare, Mail, MousePointerClick,
  Eye, TrendingUp, Layers, Clock, Star, BadgeCheck, RotateCcw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import FunnelChart from '../components/FunnelChart'
import StatusBadge from '../components/StatusBadge'
import { CATEGORIES, getCategory } from '../lib/categories'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function pct(n, total) {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

function KPI({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="card flex items-start gap-3">
      <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted font-medium">{title}</p>
        <p className="text-2xl font-bold text-text mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function RateBar({ label, count, total, color }) {
  const p = pct(count, total)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-20 flex-shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 flex items-center px-2"
          style={{ width: `${Math.max(p, 2)}%`, backgroundColor: color }}
        >
          {p > 6 && <span className="text-white text-[10px] font-bold">{p}%</span>}
        </div>
      </div>
      {p <= 6 && <span className="text-xs font-bold text-muted w-8">{p}%</span>}
      <span className="text-xs text-muted w-10 text-right flex-shrink-0">{count}</span>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: allSellers },
        { data: qualData },
        { data: seqData },
      ] = await Promise.all([
        // Table amazon_sellers — toutes les lignes + catégorie
        supabase.from('amazon_sellers').select('seller_id, category, rating, nb_products'),

        // seller_qualification × amazon_sellers — statut, reco, score, nom
        supabase
          .from('seller_qualification')
          .select('seller_id, statut, recommandation, score_total, enriched_at, amazon_sellers(seller_name, category)')
          .order('enriched_at', { ascending: false }),

        // seller_sequence × seller_qualification × amazon_sellers — engagement email
        supabase
          .from('seller_sequence')
          .select('seller_id, opened_count, clicked_count, replied, mail1_sent_at, statut_sequence, seller_qualification(statut, amazon_sellers(seller_name))')
          .not('mail1_sent_at', 'is', null)
          .order('mail1_sent_at', { ascending: false }),
      ])

      // ── Sellers C1 ──────────────────────────────────────
      const totalSellers = (allSellers || []).length
      const catTotal = (allSellers || []).reduce((acc, r) => {
        const k = r.category || 'mode'
        acc[k] = (acc[k] || 0) + 1
        return acc
      }, {})

      // ── Funnel qualification ─────────────────────────────
      const statuts = (qualData || []).reduce((acc, r) => {
        acc[r.statut || 'null'] = (acc[r.statut || 'null'] || 0) + 1
        return acc
      }, {})
      const totalQual = (qualData || []).length
      const enriched = (qualData || []).filter(r => !['A_SCORER', 'scored', 'REJETE_FILTRE'].includes(r.statut)).length
      const inSeq = (statuts['sequence_en_cours'] || 0) + (statuts['HOT'] || 0) + (statuts['REPLIED'] || 0)
      const hot = statuts['HOT'] || 0
      const replied = statuts['REPLIED'] || 0

      // ── Recommandations ──────────────────────────────────
      const recoMap = (qualData || []).reduce((acc, r) => {
        if (r.recommandation) acc[r.recommandation] = (acc[r.recommandation] || 0) + 1
        return acc
      }, {})

      // ── Score moyen ──────────────────────────────────────
      const scored = (qualData || []).filter(r => r.score_total != null)
      const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.score_total, 0) / scored.length) : null

      // ── Email performance (depuis seller_sequence) ───────
      const seqRows = seqData || []
      const totalSent = seqRows.length
      const openedCount = seqRows.filter(r => (r.opened_count || 0) > 0).length
      const clickedCount = seqRows.filter(r => (r.clicked_count || 0) > 0).length
      const repliedCount = seqRows.filter(r => r.replied).length
      const totalOpens = seqRows.reduce((s, r) => s + (r.opened_count || 0), 0)
      const totalClicks = seqRows.reduce((s, r) => s + (r.clicked_count || 0), 0)

      // ── Category : total vs en séquence ─────────────────
      const catInSeq = (qualData || [])
        .filter(r => ['sequence_en_cours', 'HOT', 'REPLIED'].includes(r.statut))
        .reduce((acc, r) => {
          const k = r.amazon_sellers?.category || 'mode'
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {})

      // ── Activité récente ─────────────────────────────────
      const recentEnriched = (qualData || [])
        .filter(r => r.enriched_at && !['A_SCORER', 'scored'].includes(r.statut))
        .slice(0, 5)

      const recentReplied = (qualData || [])
        .filter(r => r.statut === 'REPLIED')
        .slice(0, 3)

      const recentSent = seqRows.slice(0, 5)

      setData({
        totalSellers, catTotal, totalQual, enriched, inSeq, hot, replied,
        statuts, recoMap, avgScore,
        totalSent, openedCount, clickedCount, repliedCount, totalOpens, totalClicks,
        catInSeq, recentEnriched, recentReplied, recentSent,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Chargement...</div>

  const d = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard C1</h1>
          <p className="text-muted text-sm mt-0.5">Amazon FR → Zalando · Vue consolidée</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted font-medium">Live</span>
        </div>
      </div>

      {/* KPIs pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI title="Sellers C1"       value={d.totalSellers} icon={Users}          color="#1B3A5C" sub={`${d.totalQual} qualifiés`} />
        <KPI title="Enrichis"         value={d.enriched}     icon={BadgeCheck}      color="#7C3AED" sub="DM identifié" />
        <KPI title="En séquence"      value={d.inSeq}        icon={Mail}            color="#3B82F6" sub={`${d.totalSent} emails envoyés`} />
        <KPI title="HOT leads"        value={d.hot}          icon={Flame}           color="#E8445A" sub="ont cliqué" />
        <KPI title="Réponses"         value={d.replied}      icon={MessageSquare}   color="#2E7D52" sub={d.totalSent ? `taux ${pct(d.repliedCount, d.totalSent)}%` : '—'} />
      </div>

      {/* Email performance */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={17} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Performance email</h2>
          <span className="ml-auto text-xs text-muted">{d.totalSent} emails envoyés · {d.totalOpens} ouvertures · {d.totalClicks} clics</span>
        </div>
        <div className="space-y-3">
          <RateBar label="Ouverts"  count={d.openedCount}  total={d.totalSent} color="#3B82F6" />
          <RateBar label="Cliqués"  count={d.clickedCount} total={d.totalSent} color="#6366F1" />
          <RateBar label="Réponses" count={d.repliedCount} total={d.totalSent} color="#2E7D52" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
          {[
            { label: 'Taux d\'ouverture', value: `${pct(d.openedCount, d.totalSent)}%`, icon: Eye, color: '#3B82F6' },
            { label: 'Taux de clic',      value: `${pct(d.clickedCount, d.totalSent)}%`, icon: MousePointerClick, color: '#6366F1' },
            { label: 'Taux de réponse',   value: `${pct(d.repliedCount, d.totalSent)}%`, icon: MessageSquare, color: '#2E7D52' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
              <Icon size={16} className="mx-auto mb-1" style={{ color }} />
              <p className="text-xl font-bold text-text">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel + Recommandations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={17} className="text-[#1B3A5C]" />
            <h2 className="font-semibold text-text">Pipeline funnel</h2>
          </div>
          <FunnelChart counts={d.statuts} />
        </div>

        <div className="card flex flex-col gap-4">
          {/* Recommandations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={17} className="text-[#1B3A5C]" />
              <h2 className="font-semibold text-text">Recommandations</h2>
            </div>
            <div className="space-y-2">
              {[
                { key: 'QUALIFIE', label: 'Qualifié',  color: '#2E7D52', bg: 'bg-green-50' },
                { key: 'A_REVOIR', label: 'À revoir',  color: '#D97706', bg: 'bg-amber-50' },
                { key: 'REJETE',   label: 'Rejeté',    color: '#DC2626', bg: 'bg-red-50' },
              ].map(({ key, label, color, bg }) => {
                const n = d.recoMap[key] || 0
                const totalReco = Object.values(d.recoMap).reduce((a, b) => a + b, 0)
                return (
                  <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                    <span className="text-sm font-medium" style={{ color }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{pct(n, totalReco)}%</span>
                      <span className="text-lg font-bold" style={{ color }}>{n}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score moyen */}
          {d.avgScore != null && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-muted font-medium mb-1">Score moyen Zalando fit</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[#1B3A5C]">{d.avgScore}</p>
                <p className="text-muted text-sm mb-0.5">/ 100</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div className="h-2 rounded-full bg-[#1B3A5C] transition-all" style={{ width: `${d.avgScore}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown — total vs en séquence */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={17} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Sellers par catégorie</h2>
          <span className="ml-auto text-xs text-muted">Total C1 · dont en séquence</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {CATEGORIES.map((c) => {
            const total = d.catTotal[c.key] || 0
            const inSeqCat = d.catInSeq[c.key] || 0
            const penetration = pct(inSeqCat, total)
            return (
              <div key={c.key} className="text-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="text-2xl mb-1">{c.emoji}</div>
                <p className="text-xs font-semibold text-text">{c.label}</p>
                <p className="text-xl font-bold text-[#1B3A5C] mt-1">{total}</p>
                {inSeqCat > 0 && (
                  <>
                    <p className="text-[10px] text-blue-600 font-medium">{inSeqCat} séquencés</p>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                      <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${penetration}%` }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Activité récente + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activité récente avec noms des sellers */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={17} className="text-[#1B3A5C]" />
            <h2 className="font-semibold text-text">Activité récente</h2>
          </div>
          <div className="space-y-1">
            {d.recentReplied.map((r) => (
              <div key={`rep-${r.seller_id}`} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50">
                <span className="text-sm">💬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{r.amazon_sellers?.seller_name || 'Seller'}</p>
                  <p className="text-xs text-green-600 font-medium">A répondu</p>
                </div>
                <p className="text-xs text-muted flex-shrink-0">{fmt(r.enriched_at)}</p>
              </div>
            ))}
            {d.recentEnriched.map((r) => (
              <div key={`enr-${r.seller_id}`} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50">
                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{r.amazon_sellers?.seller_name || 'Seller'}</p>
                  <StatusBadge status={r.statut} />
                </div>
                <p className="text-xs text-muted flex-shrink-0">{fmt(r.enriched_at)}</p>
              </div>
            ))}
            {d.recentSent.slice(0, 3).map((r) => (
              <div key={`seq-${r.seller_id}`} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">
                    {r.seller_qualification?.amazon_sellers?.seller_name || 'Seller'}
                  </p>
                  <p className="text-xs text-blue-600">Email envoyé</p>
                </div>
                <p className="text-xs text-muted flex-shrink-0">{fmt(r.mail1_sent_at)}</p>
              </div>
            ))}
            {d.recentEnriched.length === 0 && d.recentSent.length === 0 && (
              <p className="text-muted text-sm">Aucune activité récente</p>
            )}
          </div>
        </div>

        {/* Status breakdown détaillé */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw size={17} className="text-[#1B3A5C]" />
            <h2 className="font-semibold text-text">Détail des statuts</h2>
            <span className="ml-auto text-xs text-muted">{d.totalQual} qualifiés</span>
          </div>
          <div className="space-y-2">
            {Object.entries(d.statuts)
              .filter(([k]) => k !== 'null')
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1B3A5C]/40 transition-all"
                      style={{ width: `${pct(count, d.totalQual)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-text w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
