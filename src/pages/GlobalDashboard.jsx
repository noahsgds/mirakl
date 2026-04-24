import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Users, GitBranch, Mail, BarChart2,
  TrendingUp, Target, CheckCircle2, Circle, Activity, Flame, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function StatCard({ label, value, sub, color = 'text-white', bg = 'bg-white/5' }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-white/8`}>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '…'}</p>
      <p className="text-white/60 text-xs font-medium mt-0.5">{label}</p>
      {sub && <p className="text-white/30 text-[10px] mt-1">{sub}</p>}
    </div>
  )
}

function FunnelBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-right text-xs text-white/40 font-medium shrink-0">{label}</div>
      <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} flex items-center px-2 transition-all duration-700`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 8 && <span className="text-white text-[10px] font-bold">{value}</span>}
        </div>
      </div>
      {pct <= 8 && <span className="text-white/50 text-xs font-bold w-8">{value}</span>}
    </div>
  )
}

export default function GlobalDashboard() {
  const navigate = useNavigate()
  const [c1, setC1] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('seller_qualification').select('statut')
      if (!data) return
      const c = data.reduce((acc, r) => { acc[r.statut] = (acc[r.statut] || 0) + 1; return acc }, {})
      setC1({
        total:    data.length,
        a_scorer: c['A_SCORER'] || 0,
        scored:   c['scored']   || 0,
        enriched: c['enriched'] || 0,
        sequence: (c['sequence_en_cours'] || 0) + (c['HOT'] || 0) + (c['REPLIED'] || 0),
        hot:      c['HOT']     || 0,
        replied:  c['REPLIED'] || 0,
        bounce:   c['BOUNCE']  || 0,
        failed:   (c['enrichment_failed'] || 0) + (c['enrichment_failed_final'] || 0) + (c['generation_failed'] || 0),
      })
    }
    load()
  }, [])

  const fmt = (n) => n == null ? '…' : n.toLocaleString('fr-FR')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Global view</h1>
          <p className="text-muted text-sm mt-0.5">All campaigns · Consolidated metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted font-medium">Live</span>
        </div>
      </div>

      {/* Campaign cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Campaign 1 */}
        <div className="rounded-2xl overflow-hidden border border-[#E8445A]/20"
          style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #0F2238 100%)' }}>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8445A] flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Zap size={18} className="text-white" fill="white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Amazon FR → Mirakl</p>
                  <p className="text-white/40 text-xs">Scraping · Scoring · Email</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/20 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-[11px] font-semibold">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: 'Total', value: fmt(c1?.total),    color: 'text-white' },
                { label: 'To score', value: fmt(c1?.a_scorer), color: 'text-amber-400' },
                { label: 'Enrichis', value: fmt(c1?.enriched), color: 'text-purple-400' },
                { label: 'Sequence', value: fmt(c1?.sequence), color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-lg p-2.5 border border-white/5 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Funnel */}
            <div className="space-y-2 mb-5">
              <p className="text-white/30 text-[10px] font-semibold uppercase mb-3">Pipeline funnel</p>
              {c1 && [
                { label: 'To score',  value: c1.a_scorer, color: 'bg-amber-500/70' },
                { label: 'Scored',    value: c1.scored,   color: 'bg-orange-500/70' },
                { label: 'Enrichis',  value: c1.enriched, color: 'bg-purple-500/70' },
                { label: 'Sequence',  value: c1.sequence, color: 'bg-blue-500/70' },
                { label: 'HOT',       value: c1.hot,      color: 'bg-[#E8445A]/80' },
                { label: 'Replied',  value: c1.replied,  color: 'bg-green-500/70' },
              ].map((item) => (
                <FunnelBar key={item.label} {...item} max={c1.total} />
              ))}
            </div>

            {/* Alerts row */}
            {c1 && (c1.hot > 0 || c1.replied > 0 || c1.failed > 0) && (
              <div className="flex items-center gap-2 flex-wrap">
                {c1.hot > 0 && (
                  <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium text-red-400">
                    <Flame size={10} /> {c1.hot} HOT
                  </span>
                )}
                {c1.replied > 0 && (
                  <span className="flex items-center gap-1 bg-green-500/15 border border-green-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium text-green-400">
                    <MessageSquare size={10} /> {c1.replied} reply/replies
                  </span>
                )}
                {c1.failed > 0 && (
                  <span className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium text-orange-400">
                    <Activity size={10} /> {c1.failed} error(s)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-between px-6 py-3.5 border-t border-white/10 hover:bg-white/5 transition-colors group"
          >
            <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">Ouvrir Amazon FR</span>
            <ArrowRight size={15} className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Campaign 2 */}
        <div className="rounded-2xl overflow-hidden border border-blue-500/15"
          style={{ background: 'linear-gradient(135deg, #1e2d4a 0%, #101929 100%)' }}>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Target size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Campaign 2</p>
                  <p className="text-white/40 text-xs">New market</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-blue-400 text-[11px] font-semibold">Setup</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {['Total', 'To score', 'Enrichis', 'Sequence'].map((label) => (
                <div key={label} className="bg-white/3 rounded-lg p-2.5 border border-white/5 text-center">
                  <p className="text-lg font-bold text-white/20">—</p>
                  <p className="text-white/20 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Setup checklist */}
            <div className="mb-5">
              <p className="text-white/30 text-[10px] font-semibold uppercase mb-3">Configuration requise</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Connecter les tables Supabase', done: false },
                  { label: 'Configure n8n webhooks', done: false },
                  { label: 'Create email templates', done: false },
                  { label: 'Define scoring criteria', done: false },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    {done
                      ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                      : <Circle size={14} className="text-white/15 flex-shrink-0" />
                    }
                    <span className={`text-xs ${done ? 'text-white/50' : 'text-white/25'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/c2')}
            className="w-full flex items-center justify-between px-6 py-3.5 border-t border-white/8 hover:bg-white/5 transition-colors group"
          >
            <span className="text-sm font-medium text-white/30 group-hover:text-white/60 transition-colors">Configure Campaign 2</span>
            <ArrowRight size={15} className="text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>

      {/* Combined quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total leads (C1)', value: fmt(c1?.total), Icon: Users, color: 'text-[#1B3A5C]', bg: 'bg-slate-50' },
          { label: 'HOT to handle (C1)', value: fmt(c1?.hot), Icon: Flame, color: 'text-[#E8445A]', bg: 'bg-red-50' },
          { label: 'In sequence (C1)', value: fmt(c1?.sequence), Icon: Mail, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Reply rate (C1)', value: c1 && c1.sequence > 0 ? `${Math.round((c1.replied / c1.sequence) * 100)}%` : '—', Icon: TrendingUp, color: 'text-green-700', bg: 'bg-green-50' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={`card ${bg} flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-muted text-xs truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
