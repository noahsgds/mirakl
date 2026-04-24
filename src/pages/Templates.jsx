import { useEffect, useState, useRef } from 'react'
import {
  Save, ToggleLeft, ToggleRight, FileText, Plus, Trash2,
  Eye, EyeOff, Check, RefreshCw, X, AlertTriangle, Sparkles, Send, ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/* ─── Suggestions par step ──────────────────────────────── */
const SUGGESTIONS = {
  1: [
    "Step 1 — angle ventes manquées : le vendeur perd du GMV sans Zalando",
    "Step 1 — angle croissance : Zalando comme levier de revenus additionnels",
    "Step 1 — angle social proof : 50M acheteurs, leader Europe",
  ],
  2: [
    "Step 2 — lever l'objection intégration technique",
    "Step 2 — FOMO : les concurrents du vendeur sont déjà sur Zalando",
    "Step 2 — preuve sociale avec stats de conversion Zalando",
  ],
  3: [
    "Step 3 — fermeture douce, porte ouverte",
    "Step 3 — question directe, ton respectueux",
    "Step 3 — double CTA : action principale + sortie douce",
  ],
}

/* ─── Chatbot panel ─────────────────────────────────────── */
function TemplateChatbot({ currentStep, onInsert, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Erreur API')

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.raw, subject: data.subject, html: data.html },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erreur : ${err.message}`, subject: null, html: null },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] max-w-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#03182F] text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-[#2764FF]" />
          <div>
            <p className="font-semibold text-sm">Générateur de templates IA</p>
            <p className="text-xs text-white/50">Mail {currentStep} · GPT-4o</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#03182F]/5 flex items-center justify-center mx-auto">
              <Sparkles size={22} className="text-[#1B3A5C]" />
            </div>
            <div>
              <p className="font-medium text-text text-sm">Décris le template à générer</p>
              <p className="text-xs text-muted mt-1">Tu peux utiliser les suggestions ci-dessous ou taper librement.</p>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {(SUGGESTIONS[currentStep] || []).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs bg-gray-50 hover:bg-[#1B3A5C]/5 border border-gray-200 hover:border-[#1B3A5C]/20 text-gray-700 px-3 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                >
                  <ChevronRight size={12} className="text-muted flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-[#1B3A5C] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {msg.subject && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-0.5">Objet</p>
                    <p className="text-sm font-medium text-blue-900">{msg.subject}</p>
                  </div>
                )}
                {msg.html ? (
                  <>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
                        <span className="text-xs text-muted font-medium">Aperçu HTML</span>
                        <button
                          onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                          className="text-xs text-[#1B3A5C] hover:underline"
                        >
                          {previewIdx === i ? 'Réduire' : 'Agrandir'}
                        </button>
                      </div>
                      <iframe
                        srcDoc={`<html><body style="margin:0;font-family:sans-serif">${msg.html}</body></html>`}
                        sandbox="allow-same-origin"
                        className={`w-full bg-white transition-all ${previewIdx === i ? 'min-h-[500px]' : 'min-h-[280px]'}`}
                        title={`preview-${i}`}
                      />
                    </div>
                    <button
                      onClick={() => onInsert({ subject: msg.subject, html: msg.html })}
                      className="w-full bg-[#2764FF] hover:bg-[#1d55e0] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Sauvegarder ce template
                    </button>
                  </>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-text">
                    {msg.content}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted text-sm">
            <RefreshCw size={14} className="animate-spin" />
            Génération en cours…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            className="input flex-1 resize-none text-sm leading-relaxed"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Décris l'angle ou le step à générer… (Entrée pour envoyer)"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="bg-[#1B3A5C] hover:bg-[#15304e] text-white px-4 rounded-xl disabled:opacity-40 transition-colors flex-shrink-0 flex items-center"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Template card ─────────────────────────────────────── */
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
  const perfColor = perfScore >= 0.7 ? 'bg-green-100 text-green-700' : perfScore >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'

  return (
    <div className={`card border-2 transition-colors ${active ? 'border-transparent' : 'border-gray-200 opacity-70'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-semibold text-text">{template.campaign_name || 'Sans nom'}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted">Utilisé <strong>{template.times_used || 0}</strong> fois</span>
            {perfScore != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${perfColor}`}>
                Score {(perfScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setPreview((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${preview ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
            title="Aperçu"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => setActive((v) => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${active ? 'text-green-600' : 'text-muted'}`}
          >
            {active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Oui</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200">Non</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg bg-gray-100 text-muted hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

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
            <div className="p-8 text-center text-muted text-sm">Aucun contenu</div>
          )}
        </div>
      ) : (
        <textarea
          className="input w-full min-h-[180px] resize-y font-mono text-xs leading-relaxed mb-4"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Contenu du template (HTML)..."
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{active ? '✓ Actif dans la rotation' : '— Inactif'}</p>
        <button
          onClick={handleSave}
          disabled={saving || preview}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${saved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'}`}
        >
          {saved ? <Check size={14} /> : saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Sauvegardé !' : saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

/* ─── New template modal ────────────────────────────────── */
function NewTemplateModal({ step, initialSubject, initialBody, onClose, onCreated }) {
  const [form, setForm] = useState({
    campaign_name: 'amazon_zalando',
    mail_step: step,
    body_template: initialBody || '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    if (!form.body_template.trim()) { setError('Le contenu est obligatoire.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('email_templates').insert({
      campaign_name: form.campaign_name,
      mail_step: form.mail_step,
      body_template: form.body_template,
      is_active: form.is_active,
      times_used: 0,
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
          <div>
            <h3 className="font-semibold text-text">Nouveau template — Mail {form.mail_step}</h3>
            {initialSubject && <p className="text-xs text-muted mt-0.5">Objet : {initialSubject}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Campaign</label>
              <input className="input w-full text-sm" value={form.campaign_name} onChange={(e) => setForm((f) => ({ ...f, campaign_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Email step</label>
              <select className="input w-full text-sm" value={form.mail_step} onChange={(e) => setForm((f) => ({ ...f, mail_step: parseInt(e.target.value) }))}>
                <option value={1}>Mail 1 — J0</option>
                <option value={2}>Mail 2 — J+3</option>
                <option value={3}>Mail 3 — J+6</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase mb-1.5 block">Contenu HTML</label>
            <textarea
              className="input w-full min-h-[240px] resize-y font-mono text-xs leading-relaxed"
              value={form.body_template}
              onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))}
            />
          </div>

          <button
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.is_active ? 'text-green-600' : 'text-muted'}`}
          >
            {form.is_active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} />}
            {form.is_active ? 'Actif dès la création' : 'Inactif'}
          </button>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">Annuler</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1B3A5C] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Créer le template
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Templates page ───────────────────────────────── */
export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(1)
  const [showNew, setShowNew] = useState(false)
  const [newInitial, setNewInitial] = useState({ subject: null, body: null })
  const [showBot, setShowBot] = useState(false)

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

  function handleInsert({ subject, html }) {
    setNewInitial({ subject, body: html })
    setShowBot(false)
    setShowNew(true)
  }

  const byStep = templates.reduce((acc, t) => {
    const s = t.mail_step || 1
    if (!acc[s]) acc[s] = []
    acc[s].push(t)
    return acc
  }, {})

  const tabDef = [
    { step: 1, label: 'Mail 1 — J0' },
    { step: 2, label: 'Mail 2 — J+3' },
    { step: 3, label: 'Mail 3 — J+6' },
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBot((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showBot ? 'bg-[#03182F] text-white border-[#03182F]' : 'bg-white border-gray-200 text-text hover:bg-gray-50'}`}
          >
            <Sparkles size={15} className={showBot ? 'text-[#2764FF]' : 'text-[#1B3A5C]'} />
            Générer avec IA
          </button>
          <button
            onClick={() => { setNewInitial({ subject: null, body: null }); setShowNew(true) }}
            className="flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
          >
            <Plus size={15} />
            Nouveau template
          </button>
        </div>
      </div>

      <div className="card border border-amber-200 bg-amber-50 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Le mode de sélection <strong>A/B Test vs Performance</strong> est configuré dans la page{' '}
            <a href="/campagne" className="underline">Campaign</a>. Bascule <code className="bg-amber-100 px-1 rounded text-xs">is_active</code> pour
            inclure ou exclure un template de la rotation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabDef.map(({ step, label }) => {
            const count = (byStep[step] || []).length
            const active = (byStep[step] || []).filter((t) => t.is_active).length
            return (
              <button
                key={step}
                onClick={() => setTab(step)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === step ? 'border-[#1B3A5C] text-[#1B3A5C]' : 'border-transparent text-muted hover:text-text'}`}
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
        <div className="text-center text-muted py-12">Chargement...</div>
      ) : (byStep[tab] || []).length === 0 ? (
        <div className="card py-16 text-center">
          <FileText size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-muted mb-4">Aucun template pour ce step</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowBot(true)}
              className="inline-flex items-center gap-2 bg-[#03182F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#03182F]/90 transition-colors"
            >
              <Sparkles size={14} className="text-[#2764FF]" /> Générer avec IA
            </button>
            <button
              onClick={() => { setNewInitial({ subject: null, body: null }); setShowNew(true) }}
              className="inline-flex items-center gap-2 bg-[#1B3A5C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15304e] transition-colors"
            >
              <Plus size={14} /> Créer manuellement
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(byStep[tab] || []).map((t) => (
            <TemplateCard key={t.id} template={t} onSave={load} onDelete={load} />
          ))}
          <button
            onClick={() => { setNewInitial({ subject: null, body: null }); setShowNew(true) }}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-2 text-muted hover:text-[#1B3A5C] hover:border-[#1B3A5C]/30 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Ajouter un template pour Mail {tab}
          </button>
        </div>
      )}

      {/* IA chatbot panel */}
      {showBot && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowBot(false)} />
          <TemplateChatbot
            currentStep={tab}
            onInsert={handleInsert}
            onClose={() => setShowBot(false)}
          />
        </>
      )}

      {showNew && (
        <NewTemplateModal
          step={tab}
          initialSubject={newInitial.subject}
          initialBody={newInitial.body}
          onClose={() => { setShowNew(false); setNewInitial({ subject: null, body: null }) }}
          onCreated={load}
        />
      )}
    </div>
  )
}
