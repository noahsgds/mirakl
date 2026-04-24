import { useEffect, useState } from 'react'
import {
  Settings, RefreshCw, Save, CheckCircle2, AlertCircle,
  MessageSquare, Filter, Clock, UserCheck, Target, User, FlaskConical,
} from 'lucide-react'
import { fetchWorkflowConfig, saveWorkflowConfigKey } from '../../lib/c2'

const DEFAULTS = {
  // Copy
  default_tone:              'professional',
  detailed_email_style:      'consultative',
  short_email_style:         'direct',
  subject_line_style:        'benefit-led',
  cta_style:                 'meeting_request',
  personalization_intensity: '3',
  formal_balance:            '3',
  // Qualification
  min_compatibility_score:   '65',
  min_contact_confidence:    '70',
  min_evidence_completeness: '60',
  require_rationale:         'true',
  require_product_evidence:  'false',
  // Sequencing
  nb_followups:              '2',
  delay_j3:                  '3',
  delay_j6:                  '6',
  pause_after_reply:         'true',
  // Approval
  human_approval_required:   'false',
  auto_queue_high_fit:       'true',
  manual_edit_first_send:    'false',
  // Sender
  sender_name:               '',
  sender_title:              'Partnership Manager',
  sender_context:            'Mirakl Connect',
  sender_voice:              'professional',
  // AB
  default_ab_mode:           'ab_test',
  favor_detailed_above:      '75',
}

const SECTIONS = [
  {
    key: 'copy', label: 'Copy Settings', icon: MessageSquare,
    fields: [
      { key: 'default_tone',              label: 'Default tone',           type: 'select', opts: ['professional', 'direct', 'warm', 'formal'] },
      { key: 'detailed_email_style',      label: 'Detailed email style',   type: 'select', opts: ['consultative', 'narrative', 'analytical', 'challenger'] },
      { key: 'short_email_style',         label: 'Short email style',      type: 'select', opts: ['direct', 'provocative', 'question-led'] },
      { key: 'subject_line_style',        label: 'Subject line style',     type: 'select', opts: ['benefit-led', 'question', 'curiosity', 'data-led'] },
      { key: 'cta_style',                 label: 'CTA style',              type: 'select', opts: ['meeting_request', 'soft_ask', 'direct_close', 'intro_call'] },
      { key: 'personalization_intensity', label: 'Personalization (1-5)',  type: 'slider', min: 1, max: 5 },
      { key: 'formal_balance',            label: 'Formal vs casual (1-5)', type: 'slider', min: 1, max: 5 },
    ],
  },
  {
    key: 'qualification', label: 'Qualification', icon: Filter,
    fields: [
      { key: 'min_compatibility_score',   label: 'Min compatibility score', type: 'slider', min: 0, max: 100 },
      { key: 'min_contact_confidence',    label: 'Min contact confidence',  type: 'slider', min: 0, max: 100 },
      { key: 'min_evidence_completeness', label: 'Min evidence completeness', type: 'slider', min: 0, max: 100 },
      { key: 'require_rationale',         label: 'Rationale required',      type: 'toggle' },
      { key: 'require_product_evidence',  label: 'Product evidence required', type: 'toggle' },
    ],
  },
  {
    key: 'sequencing', label: 'Sequencing', icon: Clock,
    fields: [
      { key: 'nb_followups',   label: 'Number of follow-ups',   type: 'slider', min: 0, max: 4 },
      { key: 'delay_j3',       label: 'Delay J+3 (days)',        type: 'slider', min: 1, max: 14 },
      { key: 'delay_j6',       label: 'Delay J+6 (days)',        type: 'slider', min: 2, max: 30 },
      { key: 'pause_after_reply', label: 'Pause after reply',    type: 'toggle' },
    ],
  },
  {
    key: 'approval', label: 'Approval', icon: UserCheck,
    fields: [
      { key: 'human_approval_required',  label: 'Human approval required before send', type: 'toggle' },
      { key: 'auto_queue_high_fit',      label: 'Auto-queue high-fit leads',           type: 'toggle' },
      { key: 'manual_edit_first_send',   label: 'Manual edit required (first send)',   type: 'toggle' },
    ],
  },
  {
    key: 'sender', label: 'Sender Profile', icon: User,
    fields: [
      { key: 'sender_name',    label: 'Sender name',    type: 'text', placeholder: 'Your name' },
      { key: 'sender_title',   label: 'Sender title',   type: 'text', placeholder: 'Partnership Manager' },
      { key: 'sender_context', label: 'Company context', type: 'text', placeholder: 'Mirakl Connect' },
      { key: 'sender_voice',   label: 'Voice preset',   type: 'select', opts: ['professional', 'consultant', 'startup', 'enterprise'] },
    ],
  },
  {
    key: 'ab', label: 'A/B Testing', icon: FlaskConical,
    fields: [
      { key: 'default_ab_mode',    label: 'Default A/B mode',           type: 'select', opts: ['ab_test', 'performance', 'manual'] },
      { key: 'favor_detailed_above', label: 'Favor detailed email above score', type: 'slider', min: 50, max: 100 },
    ],
  },
]

function SaveBtn({ onClick, saved, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'} disabled:opacity-40`}>
      {saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

export default function C2CampaignParams() {
  const [config, setConfig] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [savedKey, setSavedKey] = useState(null)
  const [tableError, setTableError] = useState(false)
  const [unsaved, setUnsaved] = useState({})

  async function load() {
    setLoading(true)
    const { data, error } = await fetchWorkflowConfig()
    if (error || !data) {
      setTableError(true)
      setConfig(DEFAULTS)
    } else {
      const map = data.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {})
      setConfig({ ...DEFAULTS, ...map })
      setTableError(data.length === 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleChange(key, value) {
    setConfig(c => ({ ...c, [key]: String(value) }))
    setUnsaved(u => ({ ...u, [key]: true }))
  }

  async function saveKey(key) {
    await saveWorkflowConfigKey({ key, value: String(config[key]) })
    setSavedKey(key)
    setUnsaved(u => { const n = { ...u }; delete n[key]; return n })
    setTimeout(() => setSavedKey(null), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading configuration…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Campaign Parameters</h1>
        <p className="text-sm text-muted mt-0.5">Tune copy, qualification, sequencing, approval, and A/B rules</p>
      </div>

      {tableError && (
        <div className="card border border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertCircle size={17} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No saved local configuration yet</p>
            <p className="text-sm text-amber-700 mt-1">Showing defaults. Your saves are stored locally in memory.</p>
          </div>
        </div>
      )}

      {Object.keys(unsaved).length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} /> {Object.keys(unsaved).length} unsaved changes
        </div>
      )}

      {SECTIONS.map(({ key, label, icon: Icon, fields }) => (
        <div key={key} className="card space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Icon size={17} className="text-[#2563EB]" />
            <h2 className="font-semibold text-text">{label}</h2>
          </div>
          {fields.map(f => (
            <div key={f.key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-text flex items-center gap-2">
                  {f.label}
                  {unsaved[f.key] && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </label>

                {f.type === 'slider' && (
                  <div className="flex items-center gap-3 mt-2">
                    <input type="range" min={f.min} max={f.max} value={config[f.key] ?? f.min}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className="flex-1 accent-[#2563EB]" />
                    <span className="w-10 text-center text-sm font-bold text-[#2563EB]">{config[f.key] ?? f.min}</span>
                  </div>
                )}

                {f.type === 'toggle' && (
                  <div className="mt-2">
                    <button onClick={() => handleChange(f.key, config[f.key] === 'true' ? 'false' : 'true')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${config[f.key] === 'true' ? 'bg-[#2563EB]' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config[f.key] === 'true' ? 'translate-x-6' : ''}`} />
                    </button>
                    <span className="ml-2 text-xs text-muted">{config[f.key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )}

                {f.type === 'select' && (
                  <select value={config[f.key] ?? ''} onChange={e => handleChange(f.key, e.target.value)}
                    className="mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}

                {f.type === 'text' && (
                  <input type="text" value={config[f.key] ?? ''} onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                )}
              </div>
              <SaveBtn onClick={() => saveKey(f.key)} saved={savedKey === f.key} disabled={tableError && false} />
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={13} /> Reload local values
        </button>
        <button
          onClick={() => { setConfig(DEFAULTS); setUnsaved({}) }}
          className="text-xs text-muted hover:text-text underline">
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
