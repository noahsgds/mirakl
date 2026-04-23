import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, PieChart, Pie,
} from 'recharts'
import { BarChart2, TrendingUp, Tag, Target, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../lib/categories'

const FUNNEL_STEPS = [
  { key: 'A_SCORER',          label: 'À scorer',    color: '#4C5180' },
  { key: 'scored',            label: 'Scorés',      color: '#FFB020' },
  { key: 'enriched',         label: 'Enrichis',    color: '#C084FC' },
  { key: 'sequence_en_cours', label: 'En séquence', color: '#7B6FFF' },
  { key: 'sequence_terminee', label: 'Terminée',    color: '#8890B8' },
  { key: 'HOT',               label: 'HOT',         color: '#FF3358' },
  { key: 'REPLIED',           label: 'Réponses',    color: '#00C97B' },
]

const CHART_TOOLTIP = {
  background: '#191B2D',
  border: '1px solid rgba(120,128,200,0.16)',
  borderRadius: '8px',
  fontSize: 12,
  color: '#E2E5F6',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

const CHART_GRID = 'rgba(120,128,200,0.06)'
const TICK_STYLE = { fontSize: 11, fill: '#4C5180', fontFamily: 'DM Mono, monospace' }
const TICK_LABEL = { fontSize: 11, fill: '#8890B8', fontFamily: 'Outfit, sans-serif' }

function ChartTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_TOOLTIP}>
      <p style={{ color: 'var(--text-2)', marginBottom: '4px', fontSize: '11px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, color: p.color || 'var(--text)' }}>
          {p.value} <span style={{ color: 'var(--text-3)' }}>{p.name || valueLabel || ''}</span>
        </p>
      ))}
    </div>
  )
}

function Section({ icon: Icon, iconColor = '#FF3358', title, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div
          className="rounded-md p-1.5"
          style={{ background: iconColor + '14', border: `1px solid ${iconColor}22` }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

export default function Analytics() {
  const [qualData, setQualData] = useState([])
  const [seqData, setSeqData]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: q }, { data: s }] = await Promise.all([
        supabase.from('seller_qualification').select('statut, score_total, contexte_detecte, enriched_at, scored_at, recommandation, amazon_sellers(category, categories, target_marketplaces, present_marketplaces)'),
        supabase.from('seller_sequence').select('mail1_sent_at, replied, opened_count, clicked_count, statut_sequence'),
      ])
      setQualData(q || [])
      setSeqData(s || [])
      setLoading(false)
    }
    load()
  }, [])

  const scoreBuckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}–${i * 10 + 9}`,
    count: qualData.filter((r) => r.score_total >= i * 10 && r.score_total < i * 10 + 10).length,
    fill: i >= 7 ? '#00C97B' : i >= 5 ? '#FFB020' : '#FF3358',
  }))

  const catMap = {}
  qualData.forEach((r) => {
    const catKey = r.amazon_sellers?.category || 'mode'
    if (!catMap[catKey]) catMap[catKey] = { total: 0, hot: 0, replied: 0, present: 0 }
    catMap[catKey].total++
    if (r.statut === 'HOT')     catMap[catKey].hot++
    if (r.statut === 'REPLIED') catMap[catKey].replied++
    if ((r.amazon_sellers?.present_marketplaces || []).length > 0) catMap[catKey].present++
  })
  const catData = CATEGORIES
    .map((c) => {
      const v = catMap[c.key] || { total: 0, hot: 0, replied: 0, present: 0 }
      return {
        cat: `${c.emoji} ${c.label}`,
        key: c.key,
        total: v.total,
        present: v.present,
        taux: v.total > 0 ? Math.round(((v.hot + v.replied) / v.total) * 100) : 0,
      }
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)

  const statusCounts = qualData.reduce((acc, r) => {
    acc[r.statut || 'null'] = (acc[r.statut || 'null'] || 0) + 1
    return acc
  }, {})
  const funnelData = FUNNEL_STEPS.map((s) => ({ ...s, value: statusCounts[s.key] || 0 }))

  const today = new Date()
  const dailyEmails = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    const dayStart = new Date(d.setHours(0, 0, 0, 0))
    const dayEnd   = new Date(d.setHours(23, 59, 59, 999))
    const count = seqData.filter((r) => {
      if (!r.mail1_sent_at) return false
      const t = new Date(r.mail1_sent_at)
      return t >= dayStart && t <= dayEnd
    }).length
    return { date: dateStr, emails: count }
  })

  const recoCounts = qualData.reduce((acc, r) => {
    if (!r.recommandation) return acc
    acc[r.recommandation] = (acc[r.recommandation] || 0) + 1
    return acc
  }, {})
  const recoData = [
    { name: 'QUALIFIE', value: recoCounts['QUALIFIE'] || 0, color: '#00C97B' },
    { name: 'A_REVOIR', value: recoCounts['A_REVOIR'] || 0, color: '#FFB020' },
    { name: 'REJETE',   value: recoCounts['REJETE']   || 0, color: '#FF3358' },
  ]
  const totalReco = recoData.reduce((s, r) => s + r.value, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--text-3)' }}>
      <div className="w-4 h-4 rounded-full live-dot" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
      <span className="text-sm">Chargement…</span>
    </div>
  )

  return (
    <div className="space-y-6">

      <div className="fade-up">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.1 }}>
          Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
          Vue détaillée des performances de la campagne
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up-1">
        {[
          { label: 'Total leads',         value: qualData.length },
          { label: 'Score moyen',         value: qualData.filter(r => r.score_total).length ? Math.round(qualData.reduce((s, r) => s + (r.score_total || 0), 0) / qualData.filter(r => r.score_total).length) : '—' },
          { label: 'Taux HOT',            value: qualData.length ? `${Math.round((statusCounts['HOT'] || 0) / qualData.length * 100)}%` : '—' },
          { label: 'Emails envoyés (7j)', value: dailyEmails.reduce((s, d) => s + d.emails, 0) },
        ].map((k) => (
          <div key={k.label} className="card text-center">
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>
              {k.value}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-up-2">

        {/* Funnel */}
        <Section icon={TrendingUp} iconColor="#FF3358" title="Funnel pipeline">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 80, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
              <XAxis type="number" tick={TICK_STYLE} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
              <YAxis dataKey="label" type="category" tick={TICK_LABEL} width={80} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip valueLabel="leads" />} cursor={{ fill: 'rgba(120,128,200,0.04)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Recommandation pie */}
        <Section icon={Target} iconColor="#7B6FFF" title="Répartition recommandations IA">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={recoData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={80} strokeWidth={0}>
                  {recoData.map((r, i) => <Cell key={i} fill={r.color} fillOpacity={0.85} />)}
                </Pie>
                <Tooltip content={<ChartTooltip valueLabel="leads" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {recoData.map((r) => (
                <div key={r.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}50` }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                      {r.value} · {totalReco > 0 ? Math.round(r.value / totalReco * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Score distribution */}
      <Section icon={BarChart2} iconColor="#FFB020" title="Distribution des scores">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scoreBuckets} margin={{ left: 0, right: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
            <XAxis dataKey="range" tick={TICK_STYLE} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip valueLabel="leads" />} cursor={{ fill: 'rgba(120,128,200,0.04)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {scoreBuckets.map((b, i) => <Cell key={i} fill={b.fill} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-center text-xs" style={{ color: 'var(--text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#00C97B' }} />
            ≥ 70 (qualifié)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#FFB020' }} />
            50–69 (à revoir)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#FF3358' }} />
            &lt; 50 (rejeté)
          </span>
        </div>
      </Section>

      {/* Emails / day */}
      <Section icon={BarChart2} iconColor="#00C97B" title="Emails envoyés — 7 derniers jours">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyEmails} margin={{ left: 0, right: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={TICK_STYLE} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(120,128,200,0.15)' }} />
            <Line
              type="monotone"
              dataKey="emails"
              stroke="#7B6FFF"
              strokeWidth={2}
              dot={{ r: 4, fill: '#7B6FFF', stroke: '#191B2D', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#7B6FFF', boxShadow: '0 0 8px rgba(123,111,255,0.5)' }}
              name="Emails"
            />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Categories volume */}
      <Section icon={Layers} iconColor="#C084FC" title="Sellers par catégorie (volume)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={catData} layout="vertical" margin={{ left: 140, right: 48 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
            <XAxis type="number" tick={TICK_STYLE} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
            <YAxis dataKey="cat" type="category" tick={TICK_LABEL} width={140} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(120,128,200,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8890B8', fontFamily: 'Outfit, sans-serif' }} />
            <Bar dataKey="total"   fill="#7B6FFF" fillOpacity={0.8} radius={[0, 4, 4, 0]} name="Total"
              label={{ position: 'right', fontSize: 11, fill: '#4C5180', fontFamily: 'DM Mono, monospace', formatter: (v) => v > 0 ? v : '' }} />
            <Bar dataKey="present" fill="#00C97B" fillOpacity={0.8} radius={[0, 4, 4, 0]} name="Déjà sur marketplace" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Categories conversion */}
      <Section icon={Tag} iconColor="#FF3358" title="Taux de conversion par catégorie (HOT + REPLIED)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={catData} layout="vertical" margin={{ left: 140, right: 48 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={TICK_STYLE} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
            <YAxis dataKey="cat" type="category" tick={TICK_LABEL} width={140} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(120,128,200,0.04)' }} formatter={(v) => `${v}%`} />
            <Bar dataKey="taux" fill="#FF3358" fillOpacity={0.8} radius={[0, 4, 4, 0]}
              label={{ position: 'right', fontSize: 11, fill: '#4C5180', fontFamily: 'DM Mono, monospace', formatter: (v) => v > 0 ? `${v}%` : '' }} />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    </div>
  )
}
