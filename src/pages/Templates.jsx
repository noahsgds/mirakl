import { useEffect, useState } from 'react'
import {
  Save, ToggleLeft, ToggleRight, FileText, Plus, Trash2,
  Eye, EyeOff, Check, RefreshCw, X, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/* ─── Template card ─────────────────────────────────── */
function TemplateCard({ template, onSave, onDelete }) {
  const [body, setBody] = useState(template.body_template || '')
  const [active, setActive] = useState(template.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase
      .from('email_templates')
      .update({ body_template: body, is_active: active })
      .eq('id', template.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSave?.()
  }

  async function handleDelete() {
    await supabase.from('email_templates').delete().eq('id', template.id)
    onDelete?.()
  }

  const perfScore = template.performance_score
  const perfColor = perfScore >= 0.7
    ? 'bg-green-100 text-green-700'
    : perfScore >= 0.5
    ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-500'

  return (
    <div className={`card border-2 transition-colors ${active ? 'border-transparent' : 'border-gray-200 opacity-70'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-semibold text-text">{template.campaign_name || 'Sans nom'}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted">
              Used <strong>{template.times_used || 0}</strong> times
            </span>
            {perfScore != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${perfColor}`}>
                Score {(perfScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Preview toggle */}
          <button
            onClick={() => setPreview((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${preview ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
            title="Preview"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Active toggle */}
          <button
            onClick={() => setActive((v) => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${active ? 'text-green-600' : 'text-muted'}`}
          >
            {active
              ? <ToggleRight size={22} className="text-green-600" />
              : <ToggleLeft size={22} />
            }
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Oui</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200">Non</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg bg-gray-100 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Preview mode */}
      {preview ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          {body ? (
            <iframe
              srcDoc={`<html><body style="font-family:sans-serif;font-size:14px;padding:16px;color:#1a1a2e">${body}</body></html>`}
              sandbox="allow-same-origin"
              className="w-full min-h-[220px] bg-white"
              title="Preview"
            />
          ) : (
            <div className="p-8 text-center text-muted text-sm">No content to preview</div>
          )}
        </div>
      ) : (
        <textarea
          className="input w-full min-h-[180px] resize-y font-mono text-xs leading-relaxed mb-4"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Contenu du template (HTML ou texte)..."
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {active ? '✓ Actif dans la rotation' : '— Inactive (exclu de la rotation)'}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || preview}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'
          }`}
        >
          {saved ? <Check size={14} /> : saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ─── New template modal ─────────────────────────────── */
function NewTemplateModal({ step, onClose, onCreated }) {
  const [form, setForm] = useState({
    campaign_name: 'amazon_zalando',
    mail_step: step,
    body_template: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    if (!form.body_template.trim()) { setError('Le contenu est obligatoire.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('email_templates').insert({
      campaign_name: form.campaign_name,
      mail_step:     form.mail_step,
      body_template: form.body_template,
      is_active:     form.is_active,
      times_used:    0,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-text">New template — Mail {form.mail_step}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Campaign</label>
              <input
                className="input w-full text-sm"
                value={form.campaign_name}
                onChange={(e) => setForm((f) => ({ ...f, campaign_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Email step</label>
              <select
                className="input w-full text-sm"
                value={form.mail_step}
                onChange={(e) => setForm((f) => ({ ...f, mail_step: parseInt(e.target.value) }))}
              >
                <option value={1}>Mail 1 — J0</option>
                <option value={2}>Email 2 — D+3</option>
                <option value={3}>Email 3 — D+6</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Contenu (HTML ou texte)</label>
            <textarea
              className="input w-full min-h-[240px] resize-y font-mono text-xs leading-relaxed"
              value={form.body_template}
              onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))}
              placeholder="Bonjour {{prenom}},&#10;&#10;Je voulais vous contacter au sujet de..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.is_active ? 'text-green-600' : 'text-muted'}`}>
              {form.is_active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} />}
              {form.is_active ? 'Active on creation' : 'Inactive'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1B3A5C] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Create template
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Templates page ────────────────────────────── */
export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(1)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('mail_step', { ascending: true })
      .order('times_used', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const byStep = templates.reduce((acc, t) => {
    const s = t.mail_step || 1
    if (!acc[s]) acc[s] = []
    acc[s].push(t)
    return acc
  }, {})

  const tabDef = [
    { step: 1, label: 'Mail 1 — J0' },
    { step: 2, label: 'Email 2 — D+3' },
    { step: 3, label: 'Email 3 — D+6' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Templates</h1>
          <p className="text-muted text-sm mt-0.5">
            {templates.filter((t) => t.is_active).length} actifs · {templates.length} total
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
        >
          <Plus size={15} />
          New template
        </button>
      </div>

      {/* Info n8n mode */}
      <div className="card border border-amber-200 bg-amber-50 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            The selection mode <strong>A/B Test vs Performance</strong> is configured in
            la page <a href="/campagne" className="underline">Campaign</a> · Basculez <code className="bg-amber-100 px-1 rounded text-xs">is_active</code> pour
            inclure ou exclure un template de la rotation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        <div className="flex">
          {tabDef.map(({ step, label }) => {
            const count = (byStep[step] || []).length
            const active = (byStep[step] || []).filter((t) => t.is_active).length
            return (
              <button
                key={step}
                onClick={() => setTab(step)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === step ? 'border-[#1B3A5C] text-[#1B3A5C]' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === step ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {active}/{count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted py-12">Loading...</div>
      ) : (byStep[tab] || []).length === 0 ? (
        <div className="card py-16 text-center">
          <FileText size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-muted mb-4">No template for this step</p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
          >
            <Plus size={14} /> Create first template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(byStep[tab] || []).map((t) => (
            <TemplateCard key={t.id} template={t} onSave={load} onDelete={load} />
          ))}
          <button
            onClick={() => setShowNew(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-2 text-muted hover:text-[#1B3A5C] hover:border-[#1B3A5C]/30 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Ajouter un template pour Mail {tab}
          </button>
        </div>
      )}

      {showNew && (
        <NewTemplateModal
          step={tab}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
