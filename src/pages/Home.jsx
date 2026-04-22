import { useEffect, useState } from 'react'
import { Users, Flame, MessageSquare, TrendingUp, Clock, Mail, Zap, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/KPICard'
import FunnelChart from '../components/FunnelChart'
import StatusBadge from '../components/StatusBadge'
import { CATEGORIES, getCategory } from '../lib/categories'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Home() {
  const [counts, setCounts] = useState({})
  const [categoryCounts, setCategoryCounts] = useState({})
  const [recentEnriched, setRecentEnriched] = useState([])
  const [recentEmails, setRecentEmails] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: qualData }, { data: seqData }, { data: sellersData }] = await Promise.all([
        supabase.from('seller_qualification').select('statut, enriched_at, seller_id'),
        supabase
          .from('seller_sequence')
          .select('seller_id, mail1_sent_at, statut_sequence')
          .order('mail1_sent_at', { ascending: false })
          .limit(5),
        supabase.from('amazon_sellers').select('category'),
      ])

      // Category breakdown
      const catMap = (sellersData || []).reduce((acc, r) => {
        const k = r.category || 'mode'
        acc[k] = (acc[k] || 0) + 1
        return acc
      }, {})
      setCategoryCounts(catMap)

      const grouped = (qualData || []).reduce((acc, r) => {
        acc[r.statut || 'null'] = (acc[r.statut || 'null'] || 0) + 1
        return acc
      }, {})
      setCounts(grouped)

      const total = (qualData || []).length
      const hot = grouped['HOT'] || 0
      const replied = grouped['REPLIED'] || 0
      const done = grouped['sequence_terminee'] || 0

      setCounts({ ...grouped, _total: total, _hot: hot, _replied: replied, _done: done, _replyRate: done > 0 ? Math.round((replied / done) * 100) : 0 })

      const enrichedItems = (qualData || [])
        .filter((r) => r.enriched_at)
        .sort((a, b) => new Date(b.enriched_at) - new Date(a.enriched_at))
        .slice(0, 5)

      setRecentEnriched(enrichedItems)
      setRecentEmails(seqData || [])
      setLoading(false)
    }
    load()
  }, [])

  const kpis = [
    { title: 'Total leads', value: counts._total, icon: Users, color: '#1B3A5C' },
    { title: 'En séquence', value: counts['sequence_en_cours'], icon: Mail, color: '#3B82F6' },
    { title: 'HOT leads', value: counts._hot, icon: Flame, color: '#E8445A' },
    { title: 'Taux de réponse', value: `${counts._replyRate ?? 0}%`, icon: MessageSquare, color: '#2E7D52', sub: `${counts._replied || 0} réponses / ${counts._done || 0} terminées` },
  ]

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Amazon FR → 8 catégories × {CATEGORIES.reduce((n, c) => n + c.marketplaces.length, 0)} marketplaces partenaires
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.title} {...k} />
        ))}
      </div>

      {/* Funnel + Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#1B3A5C]" />
            <h2 className="font-semibold text-text">Funnel pipeline</h2>
          </div>
          <FunnelChart counts={counts} />
        </div>

        {/* Activité récente */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#1B3A5C]" />
            <h2 className="font-semibold text-text">Activité récente</h2>
          </div>
          <div className="space-y-3">
            {recentEnriched.length === 0 && recentEmails.length === 0 && (
              <p className="text-muted text-sm">Aucune activité récente</p>
            )}
            {recentEnriched.map((r) => (
              <div key={r.seller_id} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text truncate">Lead enrichi</p>
                  <p className="text-xs text-muted">{fmt(r.enriched_at)}</p>
                </div>
              </div>
            ))}
            {recentEmails.map((r) => (
              <div key={r.seller_id + r.mail1_sent_at} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-text">Email envoyé</p>
                    <StatusBadge status={r.statut_sequence} />
                  </div>
                  <p className="text-xs text-muted">{fmt(r.mail1_sent_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Catégories breakdown */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Sellers par catégorie</h2>
          <span className="ml-auto text-xs text-muted">
            Total : {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
          </span>
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {CATEGORIES.map((c) => {
            const n = categoryCounts[c.key] || 0
            return (
              <div key={c.key} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">{c.emoji}</div>
                <p className="text-xs font-medium text-text">{c.label}</p>
                <p className="text-lg font-bold text-[#1B3A5C] mt-1">{n}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Statut breakdown */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Répartition par statut</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts)
            .filter(([k]) => !k.startsWith('_'))
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                <StatusBadge status={status === 'null' ? null : status} />
                <span className="text-sm font-semibold text-text">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
