import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Users, Mail, TrendingUp, Target,
  Circle, Activity, Flame, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function StatTile({ label, value, color = '#102b49' }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.03em', color, lineHeight: 1 }}>
        {value ?? '…'}
      </p>
      <p style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.04em' }}>
        {label}
      </p>
    </div>
  )
}

function FunnelBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 text-right" style={{ width: '76px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}>
        {label}
      </div>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: '5px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', width: `${Math.max(pct, 1)}%`, background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: '32px', fontSize: '11px', fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
        {value}
      </span>
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
        total: data.length,
        a_scorer: c['A_SCORER'] || 0,
        scored:   c['scored']   || 0,
        enriched: c['enriched'] || 0,
        sequence: (c['sequence_en_cours'] || 0) + (c['HOT'] || 0) + (c['REPLIED'] || 0),
        hot:      c['HOT']     || 0,
        replied:  c['REPLIED'] || 0,
        failed:   (c['enrichment_failed'] || 0) + (c['enrichment_failed_final'] || 0) + (c['generation_failed'] || 0),
      })
    }
    load()
  }, [])

  const fmt = (n) => n == null ? '…' : n.toLocaleString('fr-FR')

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="fade-up flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
            Vue globale
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
            Toutes les campagnes · Métriques consolidées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full live-dot" style={{ background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Live</span>
        </div>
      </div>

      {/* Campaign cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-up-1">

        {/* Campaign 1 — Amazon FR · Mirakl navy card */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #102b49 0%, #03182f 100%)',
            border: '1px solid rgba(39,100,255,0.2)',
            boxShadow: '0 8px 32px rgba(16,43,73,0.2)',
          }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(39,100,255,0.12) 0%, transparent 70%)' }}
          />

          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#2764ff', boxShadow: '0 4px 14px rgba(39,100,255,0.4)' }}
                >
                  <Zap size={17} style={{ color: '#fff' }} fill="#fff" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Amazon FR → Mirakl</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Scraping · Scoring · Email</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#4ade80' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em' }}>ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              <StatTile label="Total"    value={fmt(c1?.total)}    color="rgba(255,255,255,0.92)" />
              <StatTile label="À scorer" value={fmt(c1?.a_scorer)} color="#fbbf24" />
              <StatTile label="Enrichis" value={fmt(c1?.enriched)} color="#c084fc" />
              <StatTile label="Séquence" value={fmt(c1?.sequence)} color="#60a5fa" />
            </div>

            <div className="mb-5 space-y-2">
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Entonnoir pipeline
              </p>
              {c1 && [
                { label: 'À scorer',  value: c1.a_scorer, color: '#fbbf24' },
                { label: 'Scorés',    value: c1.scored,   color: '#fb923c' },
                { label: 'Enrichis',  value: c1.enriched, color: '#c084fc' },
                { label: 'Séquence',  value: c1.sequence, color: '#60a5fa' },
                { label: 'HOT',       value: c1.hot,      color: '#f87171' },
                { label: 'Répondus',  value: c1.replied,  color: '#4ade80' },
              ].map(item => <FunnelBar key={item.label} {...item} max={c1.total} />)}
            </div>

            {c1 && (c1.hot > 0 || c1.replied > 0 || c1.failed > 0) && (
              <div className="flex items-center gap-2 flex-wrap">
                {c1.hot > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', fontSize: '11px', fontWeight: 700, color: '#f87171' }}>
                    <Flame size={10} /> {c1.hot} HOT
                  </span>
                )}
                {c1.replied > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', fontSize: '11px', fontWeight: 700, color: '#4ade80' }}>
                    <MessageSquare size={10} /> {c1.replied} réponse(s)
                  </span>
                )}
                {c1.failed > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)', fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>
                    <Activity size={10} /> {c1.failed} erreur(s)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors group"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Ouvrir Amazon FR</span>
            <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </button>
        </div>

        {/* Campaign 2 */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #102b49 100%)',
            border: '1px solid rgba(62,98,137,0.4)',
          }}
        >
          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(62,98,137,0.5)', border: '1px solid rgba(62,98,137,0.6)' }}
                >
                  <Target size={17} style={{ color: '#93b4d0' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Campagne 2</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>Nouveau marché</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(62,98,137,0.3)', border: '1px solid rgba(62,98,137,0.5)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#93b4d0' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#93b4d0', letterSpacing: '0.05em' }}>SETUP</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {['Total', 'À scorer', 'Enrichis', 'Séquence'].map((label) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>—</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Configuration requise
              </p>
              <div className="space-y-2.5">
                {['Connecter les tables Supabase', 'Configurer les webhooks n8n', 'Créer les templates emails', 'Définir les critères de scoring'].map((label) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Circle size={12} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/c2')}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>Configurer Campagne 2</span>
            <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.18)' }} />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 fade-up-2">
        {[
          { label: 'Total leads (C1)',    value: fmt(c1?.total),    Icon: Users,       color: '#2764ff' },
          { label: 'HOT à traiter (C1)',  value: fmt(c1?.hot),      Icon: Flame,       color: '#dc2626' },
          { label: 'En séquence (C1)',    value: fmt(c1?.sequence), Icon: Mail,        color: '#7c3aed' },
          { label: 'Taux réponse (C1)',   value: c1 && c1.sequence > 0 ? `${Math.round((c1.replied / c1.sequence) * 100)}%` : '—', Icon: TrendingUp, color: '#16a34a' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + '10', border: `1px solid ${color}20` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>
                {value}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
