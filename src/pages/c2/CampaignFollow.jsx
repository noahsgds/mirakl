import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, RefreshCw, Search, X, CheckCircle2, AlertCircle,
  Loader2, Rocket, Linkedin, Building2, Clock, Filter, Download,
} from 'lucide-react'
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { fetchMatches, fetchEmails, fitBandColor, fitBandLabel, sendReadiness } from '../../lib/c2'

const WEBHOOK_URL = 'https://noahsgds.app.n8n.cloud/webhook/lancer-sequence'
const AUTO_REFRESH = 60_000

const STATUS_TABS = [
  { key: 'all',               label: 'All' },
  { key: 'scored',            label: 'Scored' },
  { key: 'pending_selection', label: 'Pending' },
  { key: 'sequence_en_cours', label: 'Active' },
  { key: 'sequence_terminee', label: 'Done' },
  { key: 'failed',            label: 'Failed' },
]

const PHASES = [
  { key: 'j0', phase: 1, label: 'J0',  sub: 'First contact',  col: 'selected_variant_j0' },
  { key: 'j3', phase: 2, label: 'J+3', sub: 'Follow-up 1',    col: 'selected_variant_j3' },
  { key: 'j6', phase: 3, label: 'J+6', sub: 'Follow-up 2',    col: 'selected_variant_j6' },
]

function StatutBadge({ statut }) {
  const m = {
    scored:             { bg: 'bg-blue-50',   text: 'text-blue-700',    label: 'Scored' },
    pending_selection:  { bg: 'bg-amber-50',  text: 'text-amber-700',   label: 'Pending' },
    sequence_en_cours:  { bg: 'bg-indigo-50', text: 'text-indigo-700',  label: 'Active' },
    sequence_terminee:  { bg: 'bg-emerald-50',text: 'text-emerald-700', label: 'Done' },
    generation_failed:  { bg: 'bg-red-50',    text: 'text-red-700',     label: 'Gen. failed' },
    enrichment_failed:  { bg: 'bg-red-50',    text: 'text-red-700',     label: 'Enrich. failed' },
  }[statut] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: statut ?? '—' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${m.bg} ${m.text}`}>{m.label}</span>
}

function Toast({ toast, onClose }) {
  if (!toast) return null
  const base = toast.kind === 'error' ? 'bg-red-600' : toast.kind === 'info' ? 'bg-[#1B3A5C]' : 'bg-emerald-600'
  const Icon = toast.kind === 'error' ? AlertCircle : toast.kind === 'info' ? Loader2 : CheckCircle2
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${base} text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[260px]`}>
      <Icon size={17} className={toast.kind === 'info' ? 'animate-spin' : ''} />
      <span className="text-sm font-medium flex-1">{toast.msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={13} /></button>
    </div>
  )
}

export default function C2CampaignFollow() {
  const [matches, setMatches]       = useState([])
  const [emailsMap, setEmailsMap]   = useState({})
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState('all')
  const [minScore, setMinScore]     = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [toast, setToast]           = useState(null)
  const toastRef                    = useRef()

  function showToast(kind, msg, ttl = 3500) {
    setToast({ kind, msg })
    clearTimeout(toastRef.current)
    if (ttl) toastRef.current = setTimeout(() => setToast(null), ttl)
  }

  async function loadAll() {
    setRefreshing(true)
    const [m, e] = await Promise.all([fetchMatches({ limit: 1000 }), fetchEmails()])
    setMatches(m.data)
    const map = {}
    for (const row of e.data) map[`${row.seller_id}|${row.marketplace_id}`] = row
    setEmailsMap(map)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, AUTO_REFRESH)
    return () => clearInterval(iv)
  }, [])

  const stats = useMemo(() => ({
    total:   matches.length,
    active:  matches.filter(m => m.statut === 'sequence_en_cours').length,
    done:    matches.filter(m => m.statut === 'sequence_terminee').length,
    withEmails: Object.keys(emailsMap).length,
    ready:   matches.filter(m => sendReadiness(m) === 'ready').length,
  }), [matches, emailsMap])

  // Funnel data
  const funnelData = [
    { name: 'Matched',      value: stats.total,      fill: '#2563EB' },
    { name: 'With emails',  value: stats.withEmails, fill: '#3b82f6' },
    { name: 'Ready',        value: stats.ready,      fill: '#60a5fa' },
    { name: 'Active',       value: stats.active,     fill: '#10b981' },
    { name: 'Done',         value: stats.done,       fill: '#059669' },
  ]

  const tabCounts = useMemo(() => {
    const c = { all: matches.length, failed: 0 }
    for (const m of matches) {
      c[m.statut] = (c[m.statut] ?? 0) + 1
      if (['generation_failed', 'enrichment_failed'].includes(m.statut)) c.failed++
    }
    return c
  }, [matches])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return matches.filter(m => {
      if (tab !== 'all') {
        if (tab === 'failed') { if (!['generation_failed', 'enrichment_failed'].includes(m.statut)) return false }
        else if (m.statut !== tab) return false
      }
      if (minScore !== '' && (m.compatibility_score ?? 0) < parseFloat(minScore)) return false
      if (s) {
        const hay = `${m.seller_name ?? ''} ${m.marketplace_name ?? ''} ${m.decision_maker_name ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [matches, search, tab, minScore])

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">Campaign Following</h1>
          <p className="text-sm text-muted mt-0.5">Email sequences · Launch control · Funnel tracking</p>
        </div>
        <button onClick={loadAll} disabled={refreshing} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Matched pairs',    value: stats.total,      color: 'bg-blue-50 text-blue-600' },
          { label: 'Emails generated', value: stats.withEmails, color: 'bg-purple-50 text-purple-600' },
          { label: 'Ready to send',    value: stats.ready,      color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Active sequences', value: stats.active,     color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Completed',        value: stats.done,       color: 'bg-gray-100 text-gray-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className={`text-2xl font-bold ${color.split(' ')[1]}`}>{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Funnel chart */}
      {!loading && (
        <div className="card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Campaign funnel</div>
          <div className="flex gap-4 items-center">
            {funnelData.map((f, i) => (
              <div key={f.name} className="flex-1 text-center">
                <div className="rounded-lg py-2" style={{ background: `${f.fill}20`, borderLeft: `3px solid ${f.fill}` }}>
                  <div className="text-xl font-bold" style={{ color: f.fill }}>{f.value}</div>
                  <div className="text-xs text-muted">{f.name}</div>
                </div>
                {i < funnelData.length - 1 && (
                  <div className="text-[10px] text-gray-300 mt-1">
                    {funnelData[i + 1].value > 0 && f.value > 0
                      ? `${Math.round((funnelData[i + 1].value / f.value) * 100)}%`
                      : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${tab === t.key ? 'bg-[#2563EB] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
            <span className={`text-[10px] px-1.5 rounded-full min-w-[1.2rem] text-center ${tab === t.key ? 'bg-white/20' : 'bg-white/60 text-gray-500'}`}>
              {tabCounts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search seller, marketplace, contact..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        </div>
        <select value={minScore} onChange={e => setMinScore(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All scores</option>
          <option value="90">≥ 90</option>
          <option value="80">≥ 80</option>
          <option value="70">≥ 70</option>
        </select>
        <span className="text-xs text-muted"><b className="text-text">{filtered.length}</b> / {matches.length}</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted text-sm">No results.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Seller × Marketplace</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3">Decision maker</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Emails</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(m => {
                  const k = `${m.seller_id}|${m.marketplace_id}`
                  const email = emailsMap[k]
                  const variants = email ? [email.selected_variant_j0, email.selected_variant_j3, email.selected_variant_j6].filter(Boolean).length : 0
                  return (
                    <tr key={k} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text text-xs">{m.seller_name}</div>
                        <div className="text-xs text-muted flex items-center gap-1"><Building2 size={10} /> {m.marketplace_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fitBandColor(m.compatibility_score)}`}>
                          {m.compatibility_score != null ? Number(m.compatibility_score).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.decision_maker_name
                          ? <div>
                              <div className="text-xs font-medium text-text">{m.decision_maker_name}</div>
                              <div className="text-xs text-muted truncate max-w-[200px]">{m.decision_maker_title}</div>
                            </div>
                          : <span className="text-xs text-gray-400 italic">Not enriched</span>}
                      </td>
                      <td className="px-4 py-3"><StatutBadge statut={m.statut} /></td>
                      <td className="px-4 py-3">
                        {email
                          ? <span className="text-xs text-muted">{variants}/3 variants</span>
                          : <span className="text-xs text-gray-400 italic">Not generated</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedMatch({ ...m, email })} disabled={!email}
                          className="text-xs btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">
                          View emails
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMatch && (
        <EmailDrawer
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onEmailUpdate={newEmail => {
            const k = `${newEmail.seller_id}|${newEmail.marketplace_id}`
            setEmailsMap(m => ({ ...m, [k]: newEmail }))
            setSelectedMatch(sm => sm ? { ...sm, email: newEmail } : sm)
          }}
          onLaunched={(sid, mid) => {
            setMatches(prev => prev.map(x => x.seller_id === sid && x.marketplace_id === mid ? { ...x, statut: 'sequence_en_cours' } : x))
            showToast('success', '🚀 Sequence launched!')
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function EmailDrawer({ match, onClose, onEmailUpdate, onLaunched, showToast }) {
  const [sel, setSel] = useState({ j0: match.email?.selected_variant_j0 ?? null, j3: match.email?.selected_variant_j3 ?? null, j6: match.email?.selected_variant_j6 ?? null })
  const [saving, setSaving] = useState(null)
  const [launching, setLaunching] = useState(false)
  const allSelected = sel.j0 && sel.j3 && sel.j6
  const canLaunch = allSelected && !launching && !['sequence_en_cours','sequence_terminee'].includes(match.statut)

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  async function saveSel(phaseKey, variant) {
    const col = PHASES.find(p => p.key === phaseKey).col
    setSel(s => ({ ...s, [phaseKey]: variant }))
    setSaving(phaseKey)
    const { data, error } = await supabase.from('seller_emails_campagne_1')
      .update({ [col]: variant, updated_at: new Date().toISOString() })
      .eq('seller_id', match.seller_id).eq('marketplace_id', match.marketplace_id).select().single()
    setSaving(null)
    if (error) showToast('error', error.message)
    else if (data) onEmailUpdate(data)
  }

  async function launch() {
    setLaunching(true)
    showToast('info', 'Launching sequence…', 0)
    try {
      const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seller_id: match.seller_id, marketplace_id: match.marketplace_id }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await supabase.from('seller_marketplace_matches').update({ statut: 'sequence_en_cours' }).eq('seller_id', match.seller_id).eq('marketplace_id', match.marketplace_id)
      onLaunched(match.seller_id, match.marketplace_id)
      onClose()
    } catch (e) {
      showToast('error', `Launch failed: ${e.message}`)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-6xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-text">{match.seller_name}</h2>
              <span className="text-muted">×</span>
              <span className="font-semibold text-[#2563EB] flex items-center gap-1"><Building2 size={14} /> {match.marketplace_name}</span>
              <StatutBadge statut={match.statut} />
            </div>
            {match.decision_maker_name && (
              <div className="text-sm text-muted mt-1 flex flex-wrap items-center gap-2">
                <span className="font-medium text-text">{match.decision_maker_name}</span>
                {match.decision_maker_title && <span>· {match.decision_maker_title}</span>}
                {match.decision_maker_email && <a href={`mailto:${match.decision_maker_email}`} className="text-[#2563EB] hover:underline">{match.decision_maker_email}</a>}
                {match.decision_maker_linkedin && <a href={match.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2]"><Linkedin size={12} /></a>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={launch} disabled={!canLaunch}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${canLaunch ? 'bg-[#E8445A] text-white hover:bg-[#d03b4f] shadow' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              title={!allSelected ? 'Select all 3 variants first' : ''}>
              {launching ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
              {launching ? 'Launching…' : 'Launch Sequence'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={17} /></button>
          </div>
        </div>

        {match.rationale && (
          <div className="px-6 pt-4">
            <div className="rounded-xl bg-[#2563EB]/5 border border-[#2563EB]/10 p-4">
              <div className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide mb-1">Why this match?</div>
              <p className="text-sm text-text leading-relaxed">{match.rationale}</p>
            </div>
          </div>
        )}

        {!match.email ? (
          <div className="p-12 text-center text-muted"><Mail size={32} className="mx-auto mb-3 text-gray-300" /><p>No emails generated for this match yet.</p></div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PHASES.map(p => <PhaseCard key={p.key} phase={p} email={match.email} selected={sel[p.key]} saving={saving === p.key} onSelect={v => saveSel(p.key, v)} />)}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function PhaseCard({ phase, email, selected, saving, onSelect }) {
  const [variant, setVariant] = useState(selected ?? 'bref')
  useEffect(() => { if (selected) setVariant(selected) }, [selected])

  const objet = email[`phase_${phase.phase}_${variant}_objet`]
  const html  = email[`phase_${phase.phase}_${variant}_html`]
  const brefOk = !!email[`phase_${phase.phase}_bref_html`]
  const fullOk = !!email[`phase_${phase.phase}_full_html`]

  return (
    <div className={`rounded-xl border-2 overflow-hidden flex flex-col ${selected ? 'border-[#2563EB]' : 'border-gray-200'}`}>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-[#2563EB]" />
          <span className="font-bold text-text text-xs">{phase.label}</span>
          <span className="text-xs text-muted">· {phase.sub}</span>
        </div>
        {selected && <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"><CheckCircle2 size={10} /> {selected}</span>}
      </div>

      <div className="px-4 pt-3 flex gap-2">
        {['bref', 'full'].map(v => (
          <button key={v} onClick={() => setVariant(v)} disabled={(v === 'bref' && !brefOk) || (v === 'full' && !fullOk)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${variant === v ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-40 disabled:cursor-not-allowed`}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Subject</div>
        <div className="text-xs text-text font-medium line-clamp-2">{objet ?? <span className="italic text-gray-400">No subject</span>}</div>
      </div>

      <div className="px-4 pt-2 pb-1 flex-1">
        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Preview</div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden h-[240px]">
          {html
            ? <iframe title={`phase-${phase.phase}-${variant}`} sandbox="" srcDoc={html} className="w-full h-full border-0" />
            : <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">No HTML content</div>}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <button onClick={() => onSelect(variant)} disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${selected === variant ? 'bg-emerald-600 text-white' : 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'} disabled:opacity-60`}>
          {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
          : selected === variant ? <><CheckCircle2 size={12} /> "{variant}" selected</>
          : <>Select "{variant}" for {phase.label}</>}
        </button>
      </div>
    </div>
  )
}
