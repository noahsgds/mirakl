import { useEffect, useState } from 'react'
import { Users, Flame, MessageSquare, TrendingUp, Clock, Mail, Zap, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import KPICard from '../components/KPICard'
import FunnelChart from '../components/FunnelChart'
import StatusBadge from '../components/StatusBadge'
import { CATEGORIES } from '../lib/categories'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const CAT_COLORS = ['#2764ff', '#d97706', '#7c3aed', '#16a34a', '#ea580c', '#0891b2', '#db2777', '#3e6289']

function SectionHeader({ icon: Icon, iconColor, title, action }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="rounded-lg p-1.5" style={{ background: iconColor + '12', border: `1px solid ${iconColor}20` }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>
        {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export default function Home() {
  const [counts, setCounts]             = useState({})
  const [categoryCounts, setCategoryCounts] = useState({})
  const [recentEnriched, setRecentEnriched] = useState([])
  const [recentEmails, setRecentEmails] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: qualData }, { data: seqData }, { data: sellersData }] = await Promise.all([
        supabase.from('seller_qualification').select('statut, enriched_at, seller_id'),
        supabase.from('seller_sequence').select('seller_id, mail1_sent_at, statut_sequence').order('mail1_sent_at', { ascending: false }).limit(5),
        supabase.from('amazon_sellers').select('category'),
      ])
      const catMap = (sellersData || []).reduce((acc, r) => { const k = r.category || 'mode'; acc[k] = (acc[k] || 0) + 1; return acc }, {})
      setCategoryCounts(catMap)
      const grouped = (qualData || []).reduce((acc, r) => { acc[r.statut || 'null'] = (acc[r.statut || 'null'] || 0) + 1; return acc }, {})
      const total = (qualData || []).length
      const hot = grouped['HOT'] || 0
      const replied = grouped['REPLIED'] || 0
      const done = grouped['sequence_terminee'] || 0
      setCounts({ ...grouped, _total: total, _hot: hot, _replied: replied, _done: done, _replyRate: done > 0 ? Math.round((replied / done) * 100) : 0 })
      setRecentEnriched((qualData || []).filter(r => r.enriched_at).sort((a, b) => new Date(b.enriched_at) - new Date(a.enriched_at)).slice(0, 5))
      setRecentEmails(seqData || [])
      setLoading(false)
    }
    load()
  }, [])

  const kpis = [
    { title: 'Total leads',     value: counts._total,               icon: Users,         color: '#2764ff' },
    { title: 'En séquence',     value: counts['sequence_en_cours'], icon: Mail,          color: '#7c3aed' },
    { title: 'HOT leads',       value: counts._hot,                 icon: Flame,         color: '#dc2626' },
    { title: 'Taux de réponse', value: `${counts._replyRate ?? 0}%`, icon: MessageSquare, color: '#16a34a',
      sub: `${counts._replied || 0} réponses / ${counts._done || 0} terminées` },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-4 h-4 rounded-full live-dot" style={{ background: 'var(--accent)' }} />
      <span className="text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</span>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="fade-up">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
          Amazon FR · 8 catégories × {CATEGORIES.reduce((n, c) => n + c.marketplaces.length, 0)} marketplaces partenaires
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-up-1">
        {kpis.map((k) => <KPICard key={k.title} {...k} />)}
      </div>

      {/* Funnel + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-up-2">
        <div className="card lg:col-span-2">
          <SectionHeader icon={TrendingUp} iconColor="#2764ff" title="Funnel pipeline" />
          <FunnelChart counts={counts} />
        </div>

        <div className="card">
          <SectionHeader icon={Clock} iconColor="#7c3aed" title="Activité récente" />
          <div className="space-y-3">
            {recentEnriched.length === 0 && recentEmails.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Aucune activité récente</p>
            )}
            {recentEnriched.map((r) => (
              <div key={r.seller_id} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#7c3aed' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Lead enrichi</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{fmt(r.enriched_at)}</p>
                </div>
              </div>
            ))}
            {recentEmails.map((r) => (
              <div key={r.seller_id + r.mail1_sent_at} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#2764ff' }} />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Email envoyé</p>
                    <StatusBadge status={r.statut_sequence} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{fmt(r.mail1_sent_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="card fade-up-3">
        <SectionHeader
          icon={Layers}
          iconColor="#0891b2"
          title="Sellers par catégorie"
          action={
            <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              Total : {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
            </span>
          }
        />
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {CATEGORIES.map((c, idx) => {
            const n = categoryCounts[c.key] || 0
            const col = CAT_COLORS[idx % CAT_COLORS.length]
            return (
              <div
                key={c.key}
                className="text-center p-3 rounded-xl transition-all duration-200"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = col + '50'; e.currentTarget.style.background = col + '08' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)' }}
              >
                <div className="text-xl mb-1.5">{c.emoji}</div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{c.label}</p>
                <p className="mt-1 font-mono font-bold" style={{ fontSize: '1.25rem', color: col, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.03em' }}>
                  {n}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card fade-up-4">
        <SectionHeader icon={Zap} iconColor="#2764ff" title="Répartition par statut" />
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts)
            .filter(([k]) => !k.startsWith('_'))
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <StatusBadge status={status === 'null' ? null : status} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                  {count}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
