import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Users, Mail, TrendingUp, Target,
  CheckCircle2, Circle, Activity, Flame, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function StatTile({ label, value, color = '#E2E5F6' }) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: '1.25rem',
        fontWeight: 500,
        letterSpacing: '-0.04em',
        color,
        lineHeight: 1,
      }}>
        {value ?? '…'}
      </p>
      <p style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.25)', marginTop: '4px', letterSpacing: '0.04em' }}>
        {label}
      </p>
    </div>
  )
}

function FunnelBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 text-right"
        style={{ width: '80px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}
      >
        {label}
      </div>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(pct, 1)}%`,
            background: color,
            borderRadius: '999px',
            boxShadow: `0 0 8px ${color}60`,
            transition: 'width 0.7s ease',
          }}
        />
      </div>
      <span
        style={{
          width: '36px',
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'right',
        }}
      >
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
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="fade-up flex items-center justify-between">
        <div>
          <h1 style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--text)',
            lineHeight: 1.1,
          }}>
            Vue globale
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
            Toutes les campagnes · Métriques consolidées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full live-dot"
            style={{ background: '#00C97B', boxShadow: '0 0 6px rgba(0,201,123,0.6)' }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Live</span>
        </div>
      </div>

      {/* Campaign cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-up-1">

        {/* Campaign 1 — Amazon FR */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #0F1520 0%, #090C15 100%)',
            border: '1px solid rgba(255,51,88,0.15)',
            boxShadow: '0 0 40px rgba(255,51,88,0.04)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,51,88,0.06) 0%, transparent 70%)' }}
          />

          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255,51,88,0.15)',
                    border: '1px solid rgba(255,51,88,0.28)',
                    boxShadow: '0 0 16px rgba(255,51,88,0.2)',
                  }}
                >
                  <Zap size={17} style={{ color: '#FF3358' }} fill="#FF3358" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Amazon FR → Mirakl</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Scraping · Scoring · Email</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,201,123,0.12)', border: '1px solid rgba(0,201,123,0.22)' }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full live-dot"
                  style={{ background: '#00C97B', boxShadow: '0 0 5px rgba(0,201,123,0.6)' }}
                />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#00C97B', letterSpacing: '0.05em' }}>ACTIVE</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <StatTile label="Total"    value={fmt(c1?.total)}    color="rgba(255,255,255,0.9)" />
              <StatTile label="À scorer" value={fmt(c1?.a_scorer)} color="#FFB020" />
              <StatTile label="Enrichis" value={fmt(c1?.enriched)} color="#C084FC" />
              <StatTile label="Séquence" value={fmt(c1?.sequence)} color="#7B6FFF" />
            </div>

            {/* Mini funnel */}
            <div className="mb-5 space-y-2">
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Entonnoir pipeline
              </p>
              {c1 && [
                { label: 'À scorer',  value: c1.a_scorer, color: '#FFB020' },
                { label: 'Scorés',    value: c1.scored,   color: '#FF8A32' },
                { label: 'Enrichis',  value: c1.enriched, color: '#C084FC' },
                { label: 'Séquence',  value: c1.sequence, color: '#7B6FFF' },
                { label: 'HOT',       value: c1.hot,      color: '#FF3358' },
                { label: 'Répondus',  value: c1.replied,  color: '#00C97B' },
              ].map((item) => (
                <FunnelBar key={item.label} {...item} max={c1.total} />
              ))}
            </div>

            {/* Alert chips */}
            {c1 && (c1.hot > 0 || c1.replied > 0 || c1.failed > 0) && (
              <div className="flex items-center gap-2 flex-wrap">
                {c1.hot > 0 && (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,51,88,0.12)',
                      border: '1px solid rgba(255,51,88,0.25)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#FF3358',
                    }}
                  >
                    <Flame size={10} />
                    {c1.hot} HOT
                  </span>
                )}
                {c1.replied > 0 && (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(0,201,123,0.1)',
                      border: '1px solid rgba(0,201,123,0.22)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#00C97B',
                    }}
                  >
                    <MessageSquare size={10} />
                    {c1.replied} réponse(s)
                  </span>
                )}
                {c1.failed > 0 && (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,176,32,0.1)',
                      border: '1px solid rgba(255,176,32,0.22)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#FFB020',
                    }}
                  >
                    <Activity size={10} />
                    {c1.failed} erreur(s)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors group"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Ouvrir Amazon FR
            </span>
            <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
          </button>
        </div>

        {/* Campaign 2 */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #0C1020 0%, #080A16 100%)',
            border: '1px solid rgba(123,111,255,0.12)',
          }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(123,111,255,0.05) 0%, transparent 70%)' }}
          />

          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(123,111,255,0.12)',
                    border: '1px solid rgba(123,111,255,0.22)',
                  }}
                >
                  <Target size={17} style={{ color: '#7B6FFF' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Campagne 2</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>Nouveau marché</p>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6FFF' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#7B6FFF', letterSpacing: '0.05em' }}>SETUP</span>
              </div>
            </div>

            {/* Empty stats */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {['Total', 'À scorer', 'Enrichis', 'Séquence'].map((label) => (
                <div
                  key={label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <p style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '1.25rem',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.12)',
                    lineHeight: 1,
                  }}>—</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Setup checklist */}
            <div className="mb-4">
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Configuration requise
              </p>
              <div className="space-y-2.5">
                {[
                  'Connecter les tables Supabase',
                  'Configurer les webhooks n8n',
                  'Créer les templates emails',
                  'Définir les critères de scoring',
                ].map((label) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Circle size={12} style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/c2')}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Configurer Campagne 2
            </span>
            <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.15)' }} />
          </button>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-up-2">
        {[
          { label: 'Total leads (C1)',     value: fmt(c1?.total),    Icon: Users,        color: '#7B6FFF' },
          { label: 'HOT à traiter (C1)',   value: fmt(c1?.hot),      Icon: Flame,        color: '#FF3358' },
          { label: 'En séquence (C1)',     value: fmt(c1?.sequence), Icon: Mail,         color: '#7B6FFF' },
          {
            label: 'Taux réponse (C1)',
            value: c1 && c1.sequence > 0 ? `${Math.round((c1.replied / c1.sequence) * 100)}%` : '—',
            Icon: TrendingUp,
            color: '#00C97B',
          },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="card flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: color + '12', border: `1px solid ${color}20` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '1.2rem',
                fontWeight: 500,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
                lineHeight: 1,
              }}>
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
