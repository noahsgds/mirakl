import { useEffect, useState } from 'react'
import { Save, ToggleLeft, ToggleRight, FileText, Zap, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

function TemplateCard({ template, onSave }) {
  const [body, setBody] = useState(template.body_template || '')
  const [active, setActive] = useState(template.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  const perfColor =
    template.performance_score >= 0.7
      ? 'bg-green-100 text-green-700'
      : template.performance_score >= 0.5
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600'

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{template.campaign_name || 'Sans nom'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted">Utilisé {template.times_used || 0} fois</span>
            {template.performance_score != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${perfColor}`}>
                Score {(template.performance_score * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setActive((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${active ? 'text-green-600' : 'text-muted'}`}
        >
          {active ? <ToggleRight size={24} className="fill-green-600 text-green-600" /> : <ToggleLeft size={24} />}
          {active ? 'Actif' : 'Inactif'}
        </button>
      </div>

      <textarea
        className="input w-full min-h-[180px] resize-y font-mono text-xs leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Contenu du template..."
      />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'} disabled:opacity-50`}
        >
          <Save size={15} />
          {saved ? 'Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(1)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('campaign_name', 'amazon_zalando')
      .order('mail_step', { ascending: true })
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
    { step: 1, label: 'Mail 1 — J0', icon: FileText },
    { step: 2, label: 'Mail 2 — J+3', icon: FileText },
    { step: 3, label: 'Mail 3 — J+6', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Templates</h1>
        <p className="text-muted text-sm mt-0.5">Campagne : amazon_zalando</p>
      </div>

      {/* Info switch */}
      <div className="card border border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <Zap size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Mode A/B & Performance</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Le switch Mode A/B Test / Performance est configuré directement dans n8n (nœud <code className="bg-amber-100 px-1 rounded">Set — Config mode</code>). En V2, ce paramètre sera contrôlable depuis une table <code className="bg-amber-100 px-1 rounded">workflow_config</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabDef.map(({ step, label }) => (
          <button
            key={step}
            onClick={() => setTab(step)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === step
                ? 'border-[#1B3A5C] text-[#1B3A5C]'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-12">Chargement...</div>
      ) : (byStep[tab] || []).length === 0 ? (
        <div className="text-center text-muted py-12">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucun template pour cette étape</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(byStep[tab] || []).map((t) => (
            <TemplateCard key={t.id} template={t} onSave={load} />
          ))}
        </div>
      )}
    </div>
  )
}
