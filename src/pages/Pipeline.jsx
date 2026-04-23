import { useEffect, useState, useCallback } from 'react'
import {
  UserCheck, Mail, Send, RefreshCw, CheckCircle2, XCircle,
  Edit2, Save, X, AlertTriangle, ChevronDown, ExternalLink,
  User, AtSign, Briefcase, Link as LinkIcon, PlayCircle,
  ArrowRight, Layers, Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import ScoreBadge from '../components/ScoreBadge'
import RecoBadge from '../components/RecoBadge'
import { getCategory } from '../lib/categories'

/* ─── Config webhooks ─────────────────────────────────── */
const WEBHOOKS = [
  {
    id: 'enrichissement',
    title: 'Enrichissement',
    sub: 'Apollo.io — récupère le décideur',
    icon: UserCheck,
    color: '#7C3AED',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    btnBg: 'bg-purple-600 hover:bg-purple-700',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-enrichissement',
    statut: 'scored',
  },
  {
    id: 'generation',
    title: 'Génération emails',
    sub: 'GPT-4o — crée les 3 emails',
    icon: Mail,
    color: '#1B3A5C',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    btnBg: 'bg-[#1B3A5C] hover:bg-[#15304e]',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-generation',
    statut: 'enriched',
  },
  {
    id: 'sequence',
    title: 'Séquence Brevo',
    sub: 'Envoie J0 / J+3 / J+6',
    icon: Send,
    color: '#E8445A',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    btnBg: 'bg-[#E8445A] hover:bg-red-600',
    url: 'https://noahsgds.app.n8n.cloud/webhook/lancer-sequence',
    statut: 'enriched',
  },
]

const STAGE_TABS = [
  { key: 'scored',   label: 'Scorés',    color: 'text-amber-700',  dot: 'bg-amber-400'  },
  { key: 'enriched', label: 'Enrichis',  color: 'text-purple-700', dot: 'bg-purple-500' },
  { key: 'sequence', label: 'Séquence',  color: 'text-blue-700',   dot: 'bg-blue-500'   },
]

const SEQ_STATUTS = ['sequence_en_cours', 'sequence_terminee', 'HOT', 'REPLIED', 'BOUNCE', 'UNSUBSCRIBED']

/* ─── Inline editable cell ────────────────────────────── */
function InlineCell({ value, onSave, placeholder = '—', icon: Icon }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [saving, setSaving] = useState(false)

  async function commit() {
    if (val === (value || '')) { setEditing(false); return }
    setSaving(true)
    await onSave(val || null)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={commit}
          className="border border-[#1B3A5C]/40 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        />
        {saving && <RefreshCw size={11} className="animate-spin text-muted flex-shrink-0" />}
      </div>
    )
  }

  return (
    <button
      onClick={() => { setVal(value || ''); setEditing(true) }}
      className="group flex items-center gap-1 text-left w-full min-w-0"
    >
      {Icon && <Icon size={11} className="text-muted flex-shrink-0" />}
      <span className={`text-xs truncate ${value ? 'text-text' : 'text-gray-400 italic'}`}>
        {value || placeholder}
      </span>
      <Edit2 size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-60 text-muted ml-auto" />
    </button>
  )
}

/* ─── Statut dropdown in-table ────────────────────────── */
const ALL_STATUTS = ['A_SCORER','scored','enriched','sequence_en_cours','sequence_terminee',
  'HOT','REPLIED','BOUNCE','UNSUBSCRIBED','enrichment_failed','enrichment_failed_final',
  'generation_failed','REJETE_FILTRE']

function StatutDropdown({ sellerId, current, onChanged }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function change(s) {
    setOpen(false)
    if (s === current) return
    setSaving(true)
    await supabase.from('seller_qualification').update({ statut: s }).eq('seller_id', sellerId)
    onChanged(s)
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        <StatusBadge status={current} />
        {saving
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

/* ─── Manual enrichment drawer ────────────────────────── */
function EnrichDrawer({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    decision_maker_name:     lead?.decision_maker_name     || '',
    decision_maker_email:    lead?.decision_maker_email    || '',
    decision_maker_title:    lead?.decision_maker_title    || '',
    decision_maker_linkedin: lead?.decision_maker_linkedin || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!form.decision_maker_email) { setError('L\'email est obligatoire pour enrichir un lead.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('seller_qualification')
      .update({
        ...form,
        enriched: true,
        enriched_source: 'manual',
        statut: 'enriched',
        enriched_at: new Date().toISOString(),
      })
      .eq('seller_id', lead.seller_id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSaved()
    onClose()
  }

  const fields = [
    { key: 'decision_maker_name',     label: 'Nom',     icon: User,     placeholder: 'Jean Dupont',              type: 'text' },
    { key: 'decision_maker_email',    label: 'Email',   icon: AtSign,   placeholder: 'jean@exemple.com',         type: 'email' },
    { key: 'decision_maker_title',    label: 'Poste',   icon: Briefcase, placeholder: 'CEO / Directeur Commercial', type: 'text' },
    { key: 'decision_maker_linkedin', label: 'LinkedIn', icon: LinkIcon, placeholder: 'https://linkedin.com/in/...', type: 'url' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-semibold text-text">Enrichissement manuel</h3>
            <p className="text-xs text-muted mt-0.5">{lead?.amazon_sellers?.seller_name || lead?.seller_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fields.map(({ key, label, icon: Icon, placeholder, type }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase mb-1.5">
                <Icon size={12} />
                {label}
                {key === 'decision_maker_email' && <span className="text-[#E8445A]">*</span>}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="input w-full text-sm"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <p className="text-xs text-purple-700">
              Le statut passera automatiquement à <strong>enriched</strong> et la source sera marquée <strong>manual</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="btn-secondary text-sm">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Enrichir ce lead
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Webhook card ────────────────────────────────────── */
function WebhookCard({ wh, count, onLaunch }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState(null)
  const Icon = wh.icon

  async function launch() {
    setShowConfirm(false)
    setLaunching(true)
    setResult(null)
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_from: 'dashboard', timestamp: new Date().toISOString() }),
      })
      const text = await res.text().catch(() => '')
      setResult({ ok: res.ok, status: res.status, body: text })
      if (res.ok) onLaunch?.()
    } catch (e) {
      setResult({ ok: false, error: e.message })
    }
    setLaunching(false)
  }

  return (
    <div className={`card border-2 ${wh.border} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${wh.lightBg}`}>
          <Icon size={18} style={{ color: wh.color }} />
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

      {showConfirm ? (
        <div className="space-y-2">
          <p className="text-xs text-text font-medium">
            Lancer sur <strong>{count}</strong> leads ?
            {count === 0 && <span className="text-amber-600 ml-1">(aucun lead éligible)</span>}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="flex-1 btn-secondary text-xs py-1.5">
              Annuler
            </button>
            <button
              onClick={launch}
              disabled={launching}
              className={`flex-1 flex items-center justify-center gap-1.5 text-white text-xs py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${wh.btnBg}`}
            >
              {launching ? <RefreshCw size={12} className="animate-spin" /> : <PlayCircle size={12} />}
              Confirmer
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={launching}
          className={`w-full flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${wh.btnBg}`}
        >
          {launching ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          Lancer
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

/* ─── Main Pipeline component ─────────────────────────── */
export default function Pipeline() {
  const [tab, setTab] = useState('scored')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ scored: 0, enriched: 0, sequence: 0 })
  const [loading, setLoading] = useState(true)
  const [enrichTarget, setEnrichTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const fetchCounts = useCallback(async () => {
    const { data } = await supabase
      .from('seller_qualification')
      .select('statut')
    if (!data) return
    const c = data.reduce((acc, r) => {
      acc[r.statut] = (acc[r.statut] || 0) + 1
      return acc
    }, {})
    setCounts({
      scored:   c['scored'] || 0,
      enriched: c['enriched'] || 0,
      sequence: SEQ_STATUTS.reduce((s, st) => s + (c[st] || 0), 0),
    })
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    const statuts = tab === 'sequence' ? SEQ_STATUTS : [tab]

    const { data } = await supabase
      .from('seller_qualification')
      .select(`
        seller_id, statut, score_total, recommandation, contexte_detecte,
        ab_variant, enriched, enriched_source, enriched_at,
        decision_maker_name, decision_maker_email, decision_maker_title, decision_maker_linkedin,
        error_reason, notes,
        amazon_sellers(seller_name, seller_url, category, categories)
      `)
      .in('statut', statuts)
      .order('enriched_at', { ascending: false, nullsFirst: false })
      .limit(200)

    setRows(data || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchCounts(); loadRows() }, [fetchCounts, loadRows])

  function updateRow(sellerId, patch) {
    setRows((prev) => prev.map((r) => r.seller_id === sellerId ? { ...r, ...patch } : r))
    fetchCounts()
  }

  async function patchField(sellerId, field, value) {
    await supabase.from('seller_qualification').update({ [field]: value }).eq('seller_id', sellerId)
    updateRow(sellerId, { [field]: value })
  }

  async function bulkReject() {
    const ids = [...selectedIds]
    if (!ids.length) return
    await supabase.from('seller_qualification')
      .update({ statut: 'REJETE_FILTRE' })
      .in('seller_id', ids)
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

  function toggleAll() {
    if (selectedIds.size === rows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(rows.map((r) => r.seller_id)))
  }

  const webhookCounts = {
    enrichissement: counts.scored,
    generation:     counts.enriched,
    sequence:       counts.enriched,
  }

  /* ── Column config per tab ── */
  const isScored   = tab === 'scored'
  const isEnriched = tab === 'enriched'
  const isSeq      = tab === 'sequence'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Pipeline</h1>
        <p className="text-muted text-sm mt-0.5">Pilotez chaque étape avant de déclencher les workflows n8n</p>
      </div>

      {/* Webhook cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {WEBHOOKS.map((wh) => (
          <WebhookCard
            key={wh.id}
            wh={wh}
            count={webhookCounts[wh.id]}
            onLaunch={() => { fetchCounts(); loadRows() }}
          />
        ))}
      </div>

      {/* Stage tabs */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {STAGE_TABS.map(({ key, label, color, dot }) => {
            const cnt = key === 'sequence' ? counts.sequence : counts[key]
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key ? `border-[#1B3A5C] ${color} bg-white` : 'border-transparent text-muted hover:text-text'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === key ? 'bg-[#1B3A5C] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {cnt}
                </span>
              </button>
            )
          })}
          <div className="ml-auto flex items-center px-4 gap-2">
            <button onClick={() => { fetchCounts(); loadRows() }} className="p-1.5 rounded-lg hover:bg-gray-200 text-muted transition-colors" title="Rafraîchir">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1B3A5C]/5 border-b border-[#1B3A5C]/10">
            <span className="text-sm font-medium text-[#1B3A5C]">{selectedIds.size} sélectionné(s)</span>
            <div className="flex items-center gap-2 ml-2">
              <BulkStatutPicker onChange={bulkChangeStatut} />
              <button onClick={bulkReject} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
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
            <thead className="border-b border-gray-100">
              <tr className="bg-white">
                <th className="px-4 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleAll}
                    className="accent-[#1B3A5C]"
                  />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Vendeur</th>
                {(isScored) && <>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Score</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Recommandation</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Contexte</th>
                </>}
                {(isEnriched || isSeq) && <>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Nom décideur</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Titre</th>
                  {isEnriched && <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Source</th>}
                </>}
                {isSeq && <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Statut</th>}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Pipeline</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center text-muted">Chargement...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <CheckCircle2 size={32} className="opacity-20" />
                      <p className="text-sm">Aucun lead à ce stade</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map((r) => {
                const cat = r.amazon_sellers?.category ? getCategory(r.amazon_sellers.category) : null
                return (
                  <tr key={r.seller_id} className={`border-b border-gray-50 transition-colors ${selectedIds.has(r.seller_id) ? 'bg-[#1B3A5C]/3' : 'hover:bg-gray-50/60'}`}>
                    {/* Checkbox */}
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(r.seller_id)} onChange={() => toggleSelect(r.seller_id)} className="accent-[#1B3A5C]" />
                    </td>

                    {/* Vendeur */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 max-w-[160px]">
                        {cat && <span className="text-sm flex-shrink-0">{cat.emoji}</span>}
                        <span className="font-medium text-text text-xs truncate">
                          {r.amazon_sellers?.seller_name || '—'}
                        </span>
                        {r.amazon_sellers?.seller_url && (
                          <a href={r.amazon_sellers.seller_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted hover:text-[#1B3A5C] flex-shrink-0">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      {r.error_reason && (
                        <p className="text-[10px] text-red-500 truncate max-w-[160px] mt-0.5">{r.error_reason}</p>
                      )}
                    </td>

                    {/* Scored columns */}
                    {isScored && <>
                      <td className="px-4 py-2.5"><ScoreBadge score={r.score_total} /></td>
                      <td className="px-4 py-2.5"><RecoBadge value={r.recommandation} /></td>
                      <td className="px-4 py-2.5">
                        {r.contexte_detecte
                          ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.contexte_detecte}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </>}

                    {/* Enriched/Seq columns */}
                    {(isEnriched || isSeq) && <>
                      <td className="px-4 py-2.5 min-w-[130px]">
                        <InlineCell
                          value={r.decision_maker_name}
                          placeholder="Ajouter nom"
                          icon={User}
                          onSave={(v) => patchField(r.seller_id, 'decision_maker_name', v)}
                        />
                      </td>
                      <td className="px-4 py-2.5 min-w-[180px]">
                        <InlineCell
                          value={r.decision_maker_email}
                          placeholder="Ajouter email"
                          icon={AtSign}
                          onSave={(v) => patchField(r.seller_id, 'decision_maker_email', v)}
                        />
                      </td>
                      <td className="px-4 py-2.5 min-w-[130px]">
                        <InlineCell
                          value={r.decision_maker_title}
                          placeholder="Ajouter titre"
                          icon={Briefcase}
                          onSave={(v) => patchField(r.seller_id, 'decision_maker_title', v)}
                        />
                      </td>
                      {isEnriched && (
                        <td className="px-4 py-2.5">
                          {r.enriched_source
                            ? <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{r.enriched_source}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      )}
                    </>}

                    {/* Seq status */}
                    {isSeq && (
                      <td className="px-4 py-2.5">
                        <StatutDropdown
                          sellerId={r.seller_id}
                          current={r.statut}
                          onChanged={(s) => updateRow(r.seller_id, { statut: s })}
                        />
                      </td>
                    )}

                    {/* Pipeline statut (always) */}
                    <td className="px-4 py-2.5">
                      {!isSeq
                        ? <StatutDropdown
                            sellerId={r.seller_id}
                            current={r.statut}
                            onChanged={(s) => { updateRow(r.seller_id, { statut: s }); fetchCounts() }}
                          />
                        : <span className="text-xs text-muted">{r.ab_variant ? `Variant ${r.ab_variant}` : '—'}</span>
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {isScored && (
                          <button
                            onClick={() => setEnrichTarget(r)}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors whitespace-nowrap"
                          >
                            <UserCheck size={11} />
                            Manuel
                          </button>
                        )}
                        {isEnriched && !r.decision_maker_email && (
                          <button
                            onClick={() => setEnrichTarget(r)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors whitespace-nowrap"
                          >
                            <AlertTriangle size={11} />
                            Compléter
                          </button>
                        )}
                        <button
                          onClick={() => patchField(r.seller_id, 'statut', 'REJETE_FILTRE').then(() => setRows((p) => p.filter((x) => x.seller_id !== r.seller_id)))}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Rejeter"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-muted">{rows.length} leads affichés</p>
          {isScored && (
            <p className="text-xs text-muted">
              Cliquez <strong>Manuel</strong> pour enrichir sans Apollo ·
              Changez le statut pour inclure/exclure de l'enrichissement
            </p>
          )}
          {isEnriched && (
            <p className="text-xs text-muted">
              Les champs <strong>Nom / Email / Titre</strong> sont éditables en ligne ·
              <strong className="text-amber-600 ml-1">⚠ sans email, la génération échouera</strong>
            </p>
          )}
        </div>
      </div>

      {/* Manual enrichment drawer */}
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

/* ─── Bulk statut picker ──────────────────────────────── */
function BulkStatutPicker({ onChange }) {
  const [open, setOpen] = useState(false)
  const QUICK = ['scored','enriched','sequence_en_cours','REJETE_FILTRE']
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
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
