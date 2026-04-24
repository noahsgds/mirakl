import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, PieChart, Pie,
} from 'recharts'
import { BarChart2, TrendingUp, Tag, Target, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategory } from '../lib/categories'

const FUNNEL_STEPS = [
  { key: 'A_SCORER', label: 'To score', color: '#94A3B8' },
  { key: 'scored', label: 'Scored', color: '#F59E0B' },
  { key: 'enriched', label: 'Enrichis', color: '#7C3AED' },
  { key: 'sequence_en_cours', label: 'In sequence', color: '#3B82F6' },
  { key: 'sequence_terminee', label: 'Completed', color: '#6B7280' },
  { key: 'HOT', label: 'HOT', color: '#E8445A' },
  { key: 'REPLIED', label: 'Replies', color: '#2E7D52' },
]

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-[#1B3A5C]" />
        <h2 className="font-semibold text-text">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Analytics() {
  const [qualData, setQualData] = useState([])
  const [seqData, setSeqData] = useState([])
  const [loading, setLoading] = useState(true)

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

  /* ---- Score distribution ---- */
  const scoreBuckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 9}`,
    count: qualData.filter((r) => r.score_total >= i * 10 && r.score_total < i * 10 + 10).length,
    fill: i >= 7 ? '#16a34a' : i >= 5 ? '#f59e0b' : '#e8445a',
  }))

  /* ---- Categories performance (par catégorie primaire) ---- */
  const catMap = {}
  qualData.forEach((r) => {
    const catKey = r.amazon_sellers?.category || 'mode'
    if (!catMap[catKey]) catMap[catKey] = { total: 0, hot: 0, replied: 0, present: 0 }
    catMap[catKey].total++
    if (r.statut === 'HOT') catMap[catKey].hot++
    if (r.statut === 'REPLIED') catMap[catKey].replied++
    const present = r.amazon_sellers?.present_marketplaces || []
    if (present.length > 0) catMap[catKey].present++
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
        tauxPresence: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)

  /* ---- Funnel snapshot ---- */
  const statusCounts = qualData.reduce((acc, r) => {
    acc[r.statut || 'null'] = (acc[r.statut || 'null'] || 0) + 1
    return acc
  }, {})
  const funnelData = FUNNEL_STEPS.map((s) => ({ ...s, value: statusCounts[s.key] || 0 }))

  /* ---- Emails envoyés par jour (7 derniers jours) ---- */
  const today = new Date()
  const dailyEmails = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    const dayStart = new Date(d.setHours(0, 0, 0, 0))
    const dayEnd = new Date(d.setHours(23, 59, 59, 999))
    const count = seqData.filter((r) => {
      if (!r.mail1_sent_at) return false
      const t = new Date(r.mail1_sent_at)
      return t >= dayStart && t <= dayEnd
    }).length
    return { date: dateStr, emails: count }
  })

  /* ---- Recommendation pie ---- */
  const recoCounts = qualData.reduce((acc, r) => {
    if (!r.recommandation) return acc
    acc[r.recommandation] = (acc[r.recommandation] || 0) + 1
    return acc
  }, {})
  const recoData = [
    { name: 'QUALIFIE', value: recoCounts['QUALIFIE'] || 0, color: '#16a34a' },
    { name: 'A_REVOIR', value: recoCounts['A_REVOIR'] || 0, color: '#f59e0b' },
    { name: 'REJETE', value: recoCounts['REJETE'] || 0, color: '#e8445a' },
  ]
  const totalReco = recoData.reduce((s, r) => s + r.value, 0)

  /* ---- Sequence effectiveness ---- */
  const sentLeads = seqData.filter((r) => !!r.mail1_sent_at).length
  const openedLeads = seqData.filter((r) => (r.opened_count || 0) > 0).length
  const clickedLeads = seqData.filter((r) => (r.clicked_count || 0) > 0).length
  const repliedLeads = seqData.filter((r) => !!r.replied).length

  const openRate = sentLeads > 0 ? Math.round((openedLeads / sentLeads) * 100) : 0
  const clickRate = sentLeads > 0 ? Math.round((clickedLeads / sentLeads) * 100) : 0
  const replyRate = sentLeads > 0 ? Math.round((repliedLeads / sentLeads) * 100) : 0

  const sequenceEffectiveness = [
    { metric: 'Sent', value: sentLeads, color: '#1B3A5C' },
    { metric: 'Opened', value: openedLeads, color: '#3B82F6' },
    { metric: 'Clicked', value: clickedLeads, color: '#6366F1' },
    { metric: 'Replied', value: repliedLeads, color: '#16A34A' },
  ]

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <p className="text-muted text-sm mt-0.5">Detailed view of campaign performance</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total leads', value: qualData.length },
          { label: 'Score moyen', value: qualData.filter(r => r.score_total).length ? Math.round(qualData.reduce((s, r) => s + (r.score_total || 0), 0) / qualData.filter(r => r.score_total).length) : '—' },
          { label: 'HOT rate', value: qualData.length ? `${Math.round((statusCounts['HOT'] || 0) / qualData.length * 100)}%` : '—' },
          { label: 'Emails sent (7d)', value: dailyEmails.reduce((s, d) => s + d.emails, 0) },
          { label: 'Open rate', value: `${openRate}%` },
          { label: 'Click rate', value: `${clickRate}%` },
        ].map((k) => (
          <div key={k.label} className="card text-center">
            <p className="text-2xl font-bold text-[#1B3A5C]">{k.value}</p>
            <p className="text-sm text-muted mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <Section icon={TrendingUp} title="Email sequence effectiveness">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sequenceEffectiveness} margin={{ left: 0, right: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {sequenceEffectiveness.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="font-semibold text-blue-700">Open rate: {openRate}%</p>
              <p className="text-xs text-blue-600">{openedLeads} opened / {sentLeads} sent</p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
              <p className="font-semibold text-indigo-700">Click rate: {clickRate}%</p>
              <p className="text-xs text-indigo-600">{clickedLeads} clicked / {sentLeads} sent</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="font-semibold text-emerald-700">Reply rate: {replyRate}%</p>
              <p className="text-xs text-emerald-600">{repliedLeads} replied / {sentLeads} sent</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <Section icon={TrendingUp} title="Funnel pipeline">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 70, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Recommendation pie */}
        <Section icon={Target} title="AI recommendation distribution">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={recoData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {recoData.map((r, i) => <Cell key={i} fill={r.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'leads']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {recoData.map((r) => (
                <div key={r.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <div>
                    <p className="text-sm font-medium text-text">{r.name}</p>
                    <p className="text-xs text-muted">{r.value} leads · {totalReco > 0 ? Math.round(r.value / totalReco * 100) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Score distribution */}
      <Section icon={BarChart2} title="Distribution des scores">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scoreBuckets} margin={{ left: 0, right: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, 'leads']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {scoreBuckets.map((b, i) => <Cell key={i} fill={b.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block" /> ≥ 70 (qualified)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> 50-69 (to review)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> &lt; 50 (rejected)</span>
        </div>
      </Section>

      {/* Emails / jour */}
      <Section icon={BarChart2} title="Emails sent — last 7 days">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyEmails} margin={{ left: 0, right: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="emails" stroke="#1B3A5C" strokeWidth={2} dot={{ r: 4, fill: '#1B3A5C' }} name="Emails" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Categorys — volume */}
      <Section icon={Layers} title="Sellers by category (volume)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={catData} layout="vertical" margin={{ left: 130, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="cat" type="category" tick={{ fontSize: 11 }} width={130} />
            <Tooltip formatter={(v, k) => [v, k === 'total' ? 'Total sellers' : 'Already on marketplace']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" fill="#1B3A5C" radius={[0, 4, 4, 0]} name="Total" label={{ position: 'right', fontSize: 11, formatter: (v) => v > 0 ? v : '' }} />
            <Bar dataKey="present" fill="#2E7D52" radius={[0, 4, 4, 0]} name="Already on marketplace" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Categorys — conversion */}
      <Section icon={Tag} title="Conversion rate by category (HOT + REPLIED)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={catData} layout="vertical" margin={{ left: 130, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis dataKey="cat" type="category" tick={{ fontSize: 11 }} width={130} />
            <Tooltip formatter={(v) => [`${v}%`, 'Conversion rate']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="taux" fill="#E8445A" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v) => v > 0 ? `${v}%` : '' }} />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    </div>
  )
}
