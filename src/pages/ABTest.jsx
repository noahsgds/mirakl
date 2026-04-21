import { useEffect, useState } from 'react'
import { FlaskConical, Users, Mail, MousePointerClick, MessageSquare, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ABTestChart from '../components/ABTestChart'

function pct(num, den) {
  if (!den) return 0
  return Math.round((num / den) * 1000) / 10
}

function StatCard({ label, a, b, icon: Icon }) {
  const winner = a > b ? 'A' : b > a ? 'B' : null
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-muted" />
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-[#1B3A5C]">{a}%</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs bg-[#1B3A5C]/10 text-[#1B3A5C] px-2 py-0.5 rounded-full font-semibold">A</span>
            {winner === 'A' && <span className="text-xs text-green-600">↑ Winner</span>}
          </div>
        </div>
        <div className="text-muted text-lg font-light">vs</div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-[#E8445A]">{b}%</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs bg-[#E8445A]/10 text-[#E8445A] px-2 py-0.5 rounded-full font-semibold">B</span>
            {winner === 'B' && <span className="text-xs text-green-600">↑ Winner</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ABTest() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: seqData }, { data: qualData }] = await Promise.all([
        supabase
          .from('seller_sequence')
          .select('ab_variant, statut_sequence, opened_count, clicked_count, replied, bounced'),
        supabase
          .from('seller_qualification')
          .select('ab_variant, statut, enriched'),
      ])

      const seq = seqData || []
      const qual = qualData || []

      function calc(variant) {
        const seqV = seq.filter((r) => r.ab_variant === variant)
        const qualV = qual.filter((r) => r.ab_variant === variant)

        const total = qualV.length
        const enriched = qualV.filter((r) => r.enriched).length
        const opened = seqV.filter((r) => (r.opened_count || 0) > 0).length
        const hot = qualV.filter((r) => r.statut === 'HOT').length
        const replied = seqV.filter((r) => r.replied).length

        return {
          total,
          enrichRate: pct(enriched, total),
          openRate: pct(opened, seqV.length),
          hotRate: pct(hot, total),
          replyRate: pct(replied, seqV.length),
        }
      }

      setStats({ A: calc('A'), B: calc('B') })
      setLoading(false)
    }
    load()
  }, [])

  const chartData = stats
    ? [
        { metric: 'Enrichissement', A: stats.A.enrichRate, B: stats.B.enrichRate },
        { metric: 'Ouverture', A: stats.A.openRate, B: stats.B.openRate },
        { metric: 'HOT', A: stats.A.hotRate, B: stats.B.hotRate },
        { metric: 'Réponse', A: stats.A.replyRate, B: stats.B.replyRate },
      ]
    : []

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">A/B Test</h1>
        <p className="text-muted text-sm mt-0.5">Variant A (angle croissance) vs Variant B (angle visibilité marque)</p>
      </div>

      {/* Volume */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#1B3A5C]">{stats?.A.total}</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs bg-[#1B3A5C]/10 text-[#1B3A5C] px-2 py-0.5 rounded-full font-semibold">Variant A</span>
            <span className="text-sm text-muted">leads assignés</span>
          </div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#E8445A]">{stats?.B.total}</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs bg-[#E8445A]/10 text-[#E8445A] px-2 py-0.5 rounded-full font-semibold">Variant B</span>
            <span className="text-sm text-muted">leads assignés</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Taux enrichissement" a={stats?.A.enrichRate} b={stats?.B.enrichRate} icon={Users} />
        <StatCard label="Taux ouverture" a={stats?.A.openRate} b={stats?.B.openRate} icon={Mail} />
        <StatCard label="Taux HOT" a={stats?.A.hotRate} b={stats?.B.hotRate} icon={TrendingUp} />
        <StatCard label="Taux réponse" a={stats?.A.replyRate} b={stats?.B.replyRate} icon={MessageSquare} />
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Comparaison des taux</h2>
        </div>
        <ABTestChart data={chartData} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Métrique</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#1B3A5C] uppercase">Variant A</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#E8445A] uppercase">Variant B</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase">Delta</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Leads totaux', a: stats?.A.total, b: stats?.B.total, pct: false },
              { label: 'Taux enrichissement', a: stats?.A.enrichRate, b: stats?.B.enrichRate, pct: true },
              { label: 'Taux ouverture', a: stats?.A.openRate, b: stats?.B.openRate, pct: true },
              { label: 'Taux HOT', a: stats?.A.hotRate, b: stats?.B.hotRate, pct: true },
              { label: 'Taux réponse', a: stats?.A.replyRate, b: stats?.B.replyRate, pct: true },
            ].map(({ label, a, b, pct: isPct }) => {
              const delta = (a || 0) - (b || 0)
              return (
                <tr key={label} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-text">{label}</td>
                  <td className="px-4 py-3 text-center font-semibold text-[#1B3A5C]">{a ?? '—'}{isPct ? '%' : ''}</td>
                  <td className="px-4 py-3 text-center font-semibold text-[#E8445A]">{b ?? '—'}{isPct ? '%' : ''}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted'}`}>
                      {delta > 0 ? '+' : ''}{delta}{isPct ? '%' : ''}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
