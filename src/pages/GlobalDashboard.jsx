import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Users, Mail,
  TrendingUp, Target, CheckCircle2, Circle, Activity, Flame, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchMatches, fetchSellers, fetchWorkflowConfig, resolveLeadContact } from '../lib/c2'

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
      <div className="w-24 text-right text-xs text-muted font-medium shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} flex items-center px-2 transition-all duration-700`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 8 && <span className="text-white text-[10px] font-bold">{value}</span>}
        </div>
      </div>
      {pct <= 8 && <span className="text-muted text-xs font-bold w-8">{value}</span>}
    </div>
  )
}

export default function GlobalDashboard() {
  const navigate = useNavigate()
  const [c1, setC1] = useState(null)
  const [c2, setC2] = useState(null)
  const [c2Setup, setC2Setup] = useState([])

  useEffect(() => {
    async function load() {
      const [c1Res, c2MatchesRes, c2SellersRes, c2ConfigRes] = await Promise.all([
        supabase.from('seller_qualification').select('statut'),
        fetchMatches({ limit: 5000 }),
        fetchSellers({ limit: 2000 }),
        fetchWorkflowConfig(),
      ])

      const c1Data = c1Res?.data
      if (c1Data) {
        const c = c1Data.reduce((acc, r) => { acc[r.statut] = (acc[r.statut] || 0) + 1; return acc }, {})
        setC1({
          total:    c1Data.length,
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

      const sellers = c2SellersRes?.data ?? []
      const matches = c2MatchesRes?.data ?? []
      const sellersById = Object.fromEntries(sellers.map((item) => [item.seller_id, item]))
      const normalized = matches.map((item) => {
        const seller = sellersById[item.seller_id] ?? null
        const contact = resolveLeadContact(item, seller)
        return {
          ...item,
          decision_maker_email: contact.email,
          decision_maker_name: contact.name,
        }
      })

      const bestBySeller = new Map()
      for (const row of normalized) {
        const existing = bestBySeller.get(row.seller_id)
        if (!existing || (row.compatibility_score ?? 0) > (existing.compatibility_score ?? 0)) {
          bestBySeller.set(row.seller_id, row)
        }
      }
      const leadRows = Array.from(bestBySeller.values())
      const byStatus = leadRows.reduce((acc, row) => {
        const key = row.statut || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      const enrichedCount = leadRows.filter((row) =>
        !!row.rationale || !!row['Top 3 products to push for each marketplace'] || row.enriched === true,
      ).length
      const sequenceCount = leadRows.filter((row) =>
        ['sequence_en_cours', 'sequence_terminee', 'HOT', 'REPLIED'].includes(row.statut),
      ).length
      const withContact = leadRows.filter((row) => !!row.decision_maker_email).length
      const highFit = leadRows.filter((row) => Number(row.compatibility_score ?? 0) > 70).length

      setC2({
        total: leadRows.length,
        a_scorer: byStatus['A_SCORER'] || 0,
        enriched: enrichedCount,
        sequence: sequenceCount,
        withContact,
        highFit,
      })

      const configRows = c2ConfigRes?.data ?? []
      const hasConfigKey = (regex) => configRows.some((row) => regex.test(String(row.key)))
      setC2Setup([
        { label: 'Connect Supabase tables', done: leadRows.length > 0 && sellers.length > 0 },
        { label: 'Configure n8n webhooks', done: hasConfigKey(/webhook|n8n/i) },
        { label: 'Create email templates', done: hasConfigKey(/template|subject_line_style|detailed_email_style|short_email_style|cta_style/i) || enrichedCount > 0 },
        { label: 'Define scoring criteria', done: hasConfigKey(/score|min_compatibility|min_contact_confidence|min_evidence|require_rationale/i) || highFit > 0 },
      ])
    }
    load()
  }, [])

  const fmt = (n) => n == null ? '…' : n.toLocaleString('fr-FR')
  const c2DoneCount = c2Setup.filter((item) => item.done).length

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
        <div className="card rounded-2xl overflow-hidden border border-red-100 p-0">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8445A] flex items-center justify-center shadow-sm">
                  <Zap size={18} className="text-white" fill="white" />
                </div>
                <div>
                  <p className="text-text font-bold text-sm">Amazon FR → Mirakl</p>
                  <p className="text-muted text-xs">Scraping · Scoring · Email</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-700 text-[11px] font-semibold">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: 'Total', value: fmt(c1?.total),    color: 'text-text' },
                { label: 'To score', value: fmt(c1?.a_scorer), color: 'text-amber-600' },
                { label: 'Enrichis', value: fmt(c1?.enriched), color: 'text-purple-600' },
                { label: 'Sequence', value: fmt(c1?.sequence), color: 'text-blue-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-muted text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Funnel */}
            <div className="space-y-2 mb-5">
              <p className="text-muted text-[10px] font-semibold uppercase mb-3">Pipeline funnel</p>
              {c1 && [
                { label: 'To score',  value: c1.a_scorer, color: 'bg-amber-500' },
                { label: 'Scored',    value: c1.scored,   color: 'bg-orange-500' },
                { label: 'Enrichis',  value: c1.enriched, color: 'bg-purple-500' },
                { label: 'Sequence',  value: c1.sequence, color: 'bg-blue-600' },
                { label: 'HOT',       value: c1.hot,      color: 'bg-[#E8445A]' },
                { label: 'Replied',  value: c1.replied,  color: 'bg-green-500' },
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
            className="w-full flex items-center justify-between px-6 py-3.5 border-t border-gray-100 hover:bg-gray-50 transition-colors group"
          >
            <span className="text-sm font-medium text-muted group-hover:text-text transition-colors">Open Amazon FR</span>
            <ArrowRight size={15} className="text-muted group-hover:text-text group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Campaign 2 */}
        <div className="card rounded-2xl overflow-hidden border border-blue-100 p-0">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <Target size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-text font-bold text-sm">Campaign 2</p>
                  <p className="text-muted text-xs">New market</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${c2DoneCount === c2Setup.length && c2Setup.length > 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${c2DoneCount === c2Setup.length && c2Setup.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
                <span className={`text-[11px] font-semibold ${c2DoneCount === c2Setup.length && c2Setup.length > 0 ? 'text-green-700' : 'text-blue-700'}`}>
                  {c2DoneCount === c2Setup.length && c2Setup.length > 0 ? 'Active' : 'Setup'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: 'Total', value: fmt(c2?.total), color: 'text-text' },
                { label: 'To score', value: fmt(c2?.a_scorer), color: 'text-amber-600' },
                { label: 'Enrichis', value: fmt(c2?.enriched), color: 'text-purple-600' },
                { label: 'Sequence', value: fmt(c2?.sequence), color: 'text-blue-700' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-center">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-muted text-[10px] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Campaign highlights */}
            <div className="mb-5">
              <p className="text-muted text-[10px] font-semibold uppercase mb-3">Campaign highlights</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {fmt(c2?.withContact)} contact-ready
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {fmt(c2?.highFit)} high-fit leads
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                  {fmt(c2?.enriched)} enriched records
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/c2')}
            className="w-full flex items-center justify-between px-6 py-3.5 border-t border-gray-100 hover:bg-gray-50 transition-colors group"
          >
            <span className="text-sm font-medium text-muted group-hover:text-text transition-colors">Launch Sales Command Center</span>
            <ArrowRight size={15} className="text-muted group-hover:text-text group-hover:translate-x-1 transition-all" />
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
