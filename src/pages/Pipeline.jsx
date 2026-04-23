import { useEffect, useState, useCallback } from 'react'
import {
  UserCheck, Mail, Send, RefreshCw, CheckCircle2, XCircle,
  X, AlertTriangle, ChevronDown, ExternalLink,
  User, AtSign, Briefcase, PlayCircle, ArrowRight, Layers, Edit2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import ScoreBadge from '../components/ScoreBadge'
import RecoBadge from '../components/RecoBadge'

/* ─── Constants ───────────────────────────────────────── */
const WEBHOOKS = [
  {
    id: 'enrichissement',
    title: 'Enrichissement',
    sub: 'Apollo.io — récupère le décideur',
    Icon: UserCheck,
    color: '#7C3AED',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    btnBg: 'bg-purple-600 hover:bg-purple-700',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-enrichissement',
  },
  {
    id: 'generation',
    title: 'Génération emails',
    sub: 'GPT-4o — crée les 3 emails',
    Icon: Mail,
    color: '#1B3A5C',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    btnBg: 'bg-[#1B3A5C] hover:bg-[#15304e]',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-generation',
  },
  {
    id: 'sequence',
    title: 'Séquence Brevo',
    sub: 'Envoie J0 / J+3 / J+6',
    Icon: Send,
    color: '#E8445A',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    btnBg: 'bg-[#E8445A] hover:bg-red-600',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-sequence',
  },
]

const STAGE_TABS = [
  { key: 'A_SCORER',  label: 'À scorer',  dot: 'bg-gray-400'   },
  { key: 'scored',    label: 'Scorés',    dot: 'bg-amber-400'  },
  { key: 'enriched',  label: 'Enrichis',  dot: 'bg-purple-500' },
  { key: 'sequence',  label: 'Séquence',  dot: 'bg-blue-500'   },
  { key: 'failed',    label: 'Erreurs',   dot: 'bg-red-400'    },
]

const SEQ_STATUTS = ['sequence_en_cours', 'sequence_terminee', 'HOT', 'REPLIED', 'BOUNCE', 'UNSUBSCRIBED']
const FAILED_STATUTS = ['enrichment_failed', 'enrichment_failed_final', 'generation_failed']

function statutsForTab(tab) {
  if (tab === 'sequence') return SEQ_STATUTS
  if (tab === 'failed')   return FAILED_STATUTS
  return [tab]
}

/* ─── Inline editable cell ────────────────────────────── */
function InlineCell({ value, onSave, placeholder, Icon: Ic }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value || '')

  function commit() {
    if (val !== (value || '')) onSave(val || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onBlur={commit}
        className="border border-[#1B3A5C]/40 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
      />
    )
  }

  return (
    <button
      onClick={() => { setVal(value || ''); setEditing(true) }}
      className="group flex items-center gap-1 text-left w-full min-w-0"
    >
      {Ic && <Ic size={11} className="text-muted flex-shrink-0" />}
      <span className={`text-xs truncate ${value ? 'text-text' : 'text-gray-400 italic'}`}>
        {value || placeholder || '—'}
      </span>
      <Edit2 size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-60 text-muted ml-auto" />
    </button>
  )
}

/* ─── Statut dropdown ─────────────────────────────────── */
const ALL_STATUTS = ['A_SCORER','scored','enriched','sequence_en_cours','sequence_terminee',
  'HOT','REPLIED','BOUNCE','UNSUBSCRIBED','enrichment_failed','enrichment_failed_final',
  'generation_failed','REJETE_FILTRE']

function StatutDropdown({ sellerId, current, onChanged }) {
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)

  async function change(s) {
    if (s === current) { setOpen(false); return }
    setBusy(true); setOpen(false)
    await supabase.from('seller_qualification').update({ statut: s }).eq('seller_id', sellerId)
    onChanged(s)
    setBusy(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-1 hover:opacity-80 disabled:opacity-40"
      >
        <StatusBadge status={current} />
        {busy
          ? <RefreshCw size={11} className="animate-spin text-muted" />
          : <ChevronDown size={11} className="text-muted" />
        }
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 max-h-64 overflow-y-auto">
            {ALL_STATUTS.map((s) => (
              <button key={s} onClick={() => change(s)}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-xs ${s === current ? 'bg-gray-50' : ''}`}>
                <StatusBadge status={s} />
                {s === current && <CheckCircle2 size={11} className="ml-auto text-green-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Bulk statut picker ──────────────────────────────── */
function BulkStatutPicker({ onChange }) {
  const [open, setOpen] = useState(false)
  const QUICK = ['scored','enriched','sequence_en_cours','REJETE_FILTRE']
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
      >
        <Layers size={12} /> Changer statut <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1">
            {QUICK.map((s) => (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50">
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Webhook card ────────────────────────────────────── */
function WebhookCard({ wh, count, onLaunch }) {
  const [confirm, setConfirm] = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [result,  setResult]  = useState(null)

  async function launch() {
    setConfirm(false); setBusy(true); setResult(null)
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_from: 'dashboard', timestamp: new Date().toISOString() }),
      })
      const text = await res.text().catch(() => '')
      setResult({ ok: res.ok, status: res.status, body: text })
      if (res.ok) onLaunch()
    } catch (e) {
      setResult({ ok: false, error: e.message })
    }
    setBusy(false)
  }

  return (
    <div className={`card border-2 ${wh.border} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${wh.lightBg}`}>
          <wh.Icon size={18} style={{ color: wh.color }} />
        </div>
        <span className={`text-2xl font-bold ${wh.text}`}>{count}</span>
      </div>

      <div>
        <p className="font-semibold text-text text-sm">{wh.title}</p>
        <p className="text-xs text-muted mt-0.5">{wh.sub}</p>
      </div>

      {result && (
        <div className={`rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {result.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {result.ok ? `Lancé · HTTP ${result.status}` : `Erreur : ${result.error || result.status}`}
        </div>
      )}

      {confirm ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text">
            Lancer sur <strong>{count}</strong> leads ?
            {count === 0 && <span className="text-amber-600 ml-1">(0 lead éligible)</span>}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(false)} className="flex-1 btn-secondary text-xs py-1.5">Annuler</button>
            <button onClick={launch} disabled={busy}
              className={`flex-1 flex items-center justify-center gap-1.5 text-white text-xs py-1.5 rounded-lg font-medium disabled:opacity-50 ${wh.btnBg}`}>
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <PlayCircle size={12} />}
              Confirmer
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} disabled={busy}
          className={`w-full flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 ${wh.btnBg}`}>
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          Lancer <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

/* ─── Manual enrichment drawer ────────────────────────── */
function EnrichDrawer({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    decision_maker_name:     lead.decision_maker_name     || '',
    decision_maker_email:    lead.decision_maker_email    || '',
    decision_maker_title:    lead.decision_maker_title    || '',
    decision_maker_linkedin: lead.decision_maker_linkedin || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleSave() {
    if (!form.decision_maker_email) { setError("L'email est obligatoire."); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('seller_qualification')
      .update({ ...form, enriched: true, enriched_source: 'manual', statut: 'enriched' })
      .eq('seller_id', lead.seller_id)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved(); onClose()
  }

  const FIELDS = [
    { key: 'decision_maker_name',     label: 'Nom',      Ic: User,     ph: 'Jean Dupont',    type: 'text'  },
    { key: 'decision_maker_email',    label: 'Email *',  Ic: AtSign,   ph: 'jean@ex.com',    type: 'email' },
    { key: 'decision_maker_title',    label: 'Poste',    Ic: Briefcase,ph: 'CEO',             type: 'text'  },
    { key: 'decision_maker_linkedin', label: 'LinkedIn', Ic: ExternalLink, ph: 'https://linkedin.com/in/...', type: 'url' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-semibold text-text">Enrichissement manuel</h3>
            <p className="text-xs text-muted mt-0.5">{lead.seller_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200"><X size={18} className="text-muted" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {FIELDS.map(({ key, label, Ic, ph, type }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase mb-1.5">
                <Ic size={12} /> {label}
              </label>
              <input type={type} value={form[key]} placeholder={ph}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="input w-full text-sm" />
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <p className="text-xs text-purple-700">Le statut passera à <strong>enriched</strong>, source = <strong>manual</strong>.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="btn-secondary text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Enrichir ce lead
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Pipeline ───────────────────────────────────── */
export default function Pipeline() {
  const [tab,          setTab]          = useState('A_SCORER')
  const [rows,         setRows]         = useState([])
  const [counts,       setCounts]       = useState({ A_SCORER: 0, scored: 0, enriched: 0, sequence: 0, failed: 0 })
  const [loading,      setLoading]      = useState(true)
  const [queryError,   setQueryError]   = useState(null)
  const [enrichTarget, setEnrichTarget] = useState(null)
  const [selectedIds,  setSelectedIds]  = useState(new Set())

  const fetchCounts = useCallback(async () => {
    const { data } = await supabase.from('seller_qualification').select('statut')
    if (!data) return
    const c = data.reduce((acc, r) => { acc[r.statut] = (acc[r.statut] || 0) + 1; return acc }, {})
    setCounts({
      A_SCORER: c['A_SCORER'] || 0,
      scored:   c['scored']   || 0,
      enriched: c['enriched'] || 0,
      sequence: SEQ_STATUTS.reduce((s, st)      => s + (c[st] || 0), 0),
      failed:   FAILED_STATUTS.reduce((s, st)   => s + (c[st] || 0), 0),
    })
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    setQueryError(null)
    setSelectedIds(new Set())
    const { data, error } = await supabase
      .from('seller_qualification')
      .select('seller_id, statut, score_total, recommandation, contexte_detecte, ab_variant, enriched, enriched_source, decision_maker_name, decision_maker_email, decision_maker_title, decision_maker_linkedin, error_reason, notes')
      .in('statut', statutsForTab(tab))
      .limit(200)
    if (error) setQueryError(error.message)
    setRows(data || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchCounts(); loadRows() }, [fetchCounts, loadRows])

  function patchLocal(sellerId, patch) {
    setRows((prev) => prev.map((r) => r.seller_id === sellerId ? { ...r, ...patch } : r))
    fetchCounts()
  }

  async function patchDB(sellerId, field, value) {
    await supabase.from('seller_qualification').update({ [field]: value }).eq('seller_id', sellerId)
    patchLocal(sellerId, { [field]: value })
  }

  async function bulkReject() {
    const ids = [...selectedIds]
    if (!ids.length) return
    await supabase.from('seller_qualification').update({ statut: 'REJETE_FILTRE' }).in('seller_id', ids)
    setRows((prev) => prev.filter((r) => !selectedIds.has(r.seller_id)))
    setSelectedIds(new Set())
    fetchCounts()
  }

  async function bulkChangeStatut(s) {
    const ids = [...selectedIds]
    if (!ids.length) return
    await supabase.from('seller_qualification').update({ statut: s }).in('seller_id', ids)
    loadRows()
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isAScorer  = tab === 'A_SCORER'
  const isScored   = tab === 'scored'
  const isEnriched = tab === 'enriched'
  const isSeq      = tab === 'sequence'
  const isFailed   = tab === 'failed'
  const showScore  = isAScorer || isScored || isFailed
  const showEnrich = isEnriched || isSeq

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Pipeline</h1>
        <p className="text-muted text-sm mt-0.5">Pilotez chaque étape avant de déclencher les workflows n8n</p>
      </div>

      {/* Error banner */}
      {queryError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Erreur Supabase</p>
            <p className="text-xs text-red-600 font-mono mt-0.5">{queryError}</p>
          </div>
        </div>
      )}

      {/* Webhook cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {WEBHOOKS.map((wh) => (
          <WebhookCard
            key={wh.id}
            wh={wh}
            count={wh.id === 'enrichissement' ? counts.scored : counts.enriched}
            onLaunch={() => { fetchCounts(); loadRows() }}
          />
        ))}
      </div>

      {/* Tabs + Table */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {STAGE_TABS.map(({ key, label, dot }) => {
            const cnt = counts[key] ?? 0
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-[#1B3A5C] text-[#1B3A5C] bg-white' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${active ? 'bg-[#1B3A5C] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {cnt}
                </span>
              </button>
            )
          })}
          <div className="ml-auto flex items-center px-4">
            <button onClick={() => { fetchCounts(); loadRows() }}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-muted" title="Rafraîchir">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Bulk bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1B3A5C]/5 border-b border-[#1B3A5C]/10">
            <span className="text-sm font-medium text-[#1B3A5C]">{selectedIds.size} sélectionné(s)</span>
            <div className="flex items-center gap-2">
              <BulkStatutPicker onChange={bulkChangeStatut} />
              <button onClick={bulkReject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100">
                <XCircle size={13} /> Rejeter
              </button>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted hover:text-text">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-white">
              <tr>
                <th className="px-4 py-2.5 w-8">
                  <input type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={() => {
                      if (selectedIds.size === rows.length) setSelectedIds(new Set())
                      else setSelectedIds(new Set(rows.map((r) => r.seller_id)))
                    }}
                    className="accent-[#1B3A5C]" />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Vendeur</th>
                {showScore && <>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Score</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Reco</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Contexte</th>
                </>}
                {showEnrich && <>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Nom</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Titre</th>
                </>}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Statut</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center text-muted text-sm">Chargement...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-muted">Aucun lead à ce stade</p>
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.seller_id}
                  className={`border-b border-gray-50 ${selectedIds.has(r.seller_id) ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(r.seller_id)}
                      onChange={() => toggleSelect(r.seller_id)} className="accent-[#1B3A5C]" />
                  </td>

                  {/* Vendeur */}
                  <td className="px-4 py-2.5 max-w-[180px]">
                    <p className="text-xs font-medium text-text truncate">{r.seller_id}</p>
                    {r.error_reason && <p className="text-[10px] text-red-500 truncate">{r.error_reason}</p>}
                  </td>

                  {/* Score cols */}
                  {showScore && <>
                    <td className="px-4 py-2.5"><ScoreBadge score={r.score_total} /></td>
                    <td className="px-4 py-2.5"><RecoBadge value={r.recommandation} /></td>
                    <td className="px-4 py-2.5">
                      {r.contexte_detecte
                        ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.contexte_detecte}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                  </>}

                  {/* Enrich cols */}
                  {showEnrich && <>
                    <td className="px-4 py-2.5 min-w-[130px]">
                      <InlineCell value={r.decision_maker_name} placeholder="Ajouter nom" Ic={User}
                        onSave={(v) => patchDB(r.seller_id, 'decision_maker_name', v)} />
                    </td>
                    <td className="px-4 py-2.5 min-w-[180px]">
                      <InlineCell value={r.decision_maker_email} placeholder="Ajouter email" Ic={AtSign}
                        onSave={(v) => patchDB(r.seller_id, 'decision_maker_email', v)} />
                    </td>
                    <td className="px-4 py-2.5 min-w-[130px]">
                      <InlineCell value={r.decision_maker_title} placeholder="Ajouter titre" Ic={Briefcase}
                        onSave={(v) => patchDB(r.seller_id, 'decision_maker_title', v)} />
                    </td>
                  </>}

                  {/* Statut */}
                  <td className="px-4 py-2.5">
                    <StatutDropdown sellerId={r.seller_id} current={r.statut}
                      onChanged={(s) => patchLocal(r.seller_id, { statut: s })} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {(isScored || isAScorer) && (
                        <button onClick={() => setEnrichTarget(r)}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100 whitespace-nowrap">
                          <UserCheck size={11} /> Manuel
                        </button>
                      )}
                      {isEnriched && !r.decision_maker_email && (
                        <button onClick={() => setEnrichTarget(r)}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 whitespace-nowrap">
                          <AlertTriangle size={11} /> Compléter
                        </button>
                      )}
                      {isFailed && (
                        <button onClick={() => patchDB(r.seller_id, 'statut', 'scored')}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 whitespace-nowrap">
                          <RefreshCw size={11} /> Relancer
                        </button>
                      )}
                      <button
                        onClick={() => patchDB(r.seller_id, 'statut', 'REJETE_FILTRE').then(() =>
                          setRows((p) => p.filter((x) => x.seller_id !== r.seller_id))
                        )}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Rejeter">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-muted">{rows.length} leads affichés</p>
          {isAScorer  && <p className="text-xs text-muted">Leads scrappés en attente de scoring n8n</p>}
          {isScored   && <p className="text-xs text-muted">Cliquez <strong>Manuel</strong> pour enrichir sans Apollo</p>}
          {isEnriched && <p className="text-xs text-muted">Champs éditables en ligne · <strong className="text-amber-600">⚠ sans email la génération échoue</strong></p>}
          {isFailed   && <p className="text-xs text-muted">Cliquez <strong>Relancer</strong> pour remettre en <em>scored</em></p>}
        </div>
      </div>

      {enrichTarget && (
        <EnrichDrawer
          lead={enrichTarget}
          onClose={() => setEnrichTarget(null)}
          onSaved={() => { loadRows(); fetchCounts() }}
        />
      )}
    </div>
  )
}
