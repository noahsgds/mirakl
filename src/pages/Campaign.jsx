import { useEffect, useState } from 'react'
import { Settings, Power, Save, AlertTriangle, Check, RefreshCw, Clock, Users, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CONFIG_DEFAULTS = {
  campaign_active: 'true',
  ab_mode: 'ab_test',
  max_leads_per_day: '50',
  delay_j3: '3',
  delay_j6: '6',
  min_score_threshold: '50',
  enrichment_provider: 'apollo',
}

const SQL_HINT = `-- Run in Supabase SQL Editor (one time)
CREATE TABLE IF NOT EXISTS workflow_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO workflow_config (key, value) VALUES
  ('campaign_active', 'true'),
  ('ab_mode', 'ab_test'),
  ('max_leads_per_day', '50'),
  ('delay_j3', '3'),
  ('delay_j6', '6'),
  ('min_score_threshold', '50'),
  ('enrichment_provider', 'apollo')
ON CONFLICT (key) DO NOTHING;`

export default function Campaign() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState(null)
  const [tableError, setTableError] = useState(false)
  const [showSQL, setShowSQL] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('workflow_config').select('*')
    if (error || !data) {
      setTableError(true)
      setConfig(CONFIG_DEFAULTS)
    } else {
      const map = data.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {})
      setConfig({ ...CONFIG_DEFAULTS, ...map })
      setTableError(false)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save(key, value) {
    setSaving(true)
    await supabase
      .from('workflow_config')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setConfig((c) => ({ ...c, [key]: value }))
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 2000)
    setSaving(false)
  }

  const isActive = config.campaign_active === 'true'

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Campaign configuration</h1>
        <p className="text-muted text-sm mt-0.5">Real-time n8n pipeline control</p>
      </div>

      {tableError && (
        <div className="card border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Missing workflow_config table</p>
              <p className="text-sm text-amber-700 mt-0.5 mb-3">
                Create the table in Supabase to enable pipeline control.
              </p>
              <button onClick={() => setShowSQL((v) => !v)} className="text-sm font-medium text-amber-800 underline">
                {showSQL ? 'Hide' : 'View SQL to run'}
              </button>
              {showSQL && (
                <pre className="mt-3 bg-amber-100 rounded-lg p-3 text-xs text-amber-900 overflow-x-auto whitespace-pre-wrap">{SQL_HINT}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master ON/OFF */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-red-50'}`}>
              <Power size={20} className={isActive ? 'text-green-600' : 'text-red-500'} />
            </div>
            <div>
              <p className="font-semibold text-text">Campaign {isActive ? 'active' : 'paused'}</p>
              <p className="text-sm text-muted">
                {isActive ? 'Leads are processed automatically by n8n' : 'The pipeline is stopped, no emails sent'}
              </p>
            </div>
          </div>
          <button
            onClick={() => save('campaign_active', isActive ? 'false' : 'true')}
            disabled={saving || tableError}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Sequence timing */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Sequence timing</h2>
        </div>

        {[
          { key: 'delay_j3', label: 'Delay Email 2 (days after J0)', min: 1, max: 14 },
          { key: 'delay_j6', label: 'Delay Email 3 (days after J0)', min: 2, max: 30 },
        ].map(({ key, label, min, max }) => (
          <div key={key} className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <label className="text-sm font-medium text-text">{label}</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={config[key] || min}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                  className="flex-1 accent-[#1B3A5C]"
                />
                <span className="w-12 text-center font-semibold text-[#1B3A5C] text-sm">
                  J+{config[key] || min}
                </span>
              </div>
            </div>
            <SaveBtn onClick={() => save(key, config[key])} saved={savedKey === key} disabled={tableError} />
          </div>
        ))}
      </div>

      {/* Volume & scoring */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Volume & scoring</h2>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-text">Max leads processed / day</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={config.max_leads_per_day || 50}
                onChange={(e) => setConfig((c) => ({ ...c, max_leads_per_day: e.target.value }))}
                className="flex-1 accent-[#1B3A5C]"
              />
              <span className="w-16 text-center font-semibold text-[#1B3A5C] text-sm">
                {config.max_leads_per_day || 50} / day
              </span>
            </div>
          </div>
          <SaveBtn onClick={() => save('max_leads_per_day', config.max_leads_per_day)} saved={savedKey === 'max_leads_per_day'} disabled={tableError} />
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-text">Minimum score for enrichment</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={config.min_score_threshold || 50}
                onChange={(e) => setConfig((c) => ({ ...c, min_score_threshold: e.target.value }))}
                className="flex-1 accent-[#1B3A5C]"
              />
              <span className="w-12 text-center font-semibold text-[#1B3A5C] text-sm">
                {config.min_score_threshold || 50}
              </span>
            </div>
          </div>
          <SaveBtn onClick={() => save('min_score_threshold', config.min_score_threshold)} saved={savedKey === 'min_score_threshold'} disabled={tableError} />
        </div>
      </div>

      {/* A/B mode */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Template selection mode</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'ab_test', label: 'A/B Test', desc: 'Alternates between the least used templates' },
            { value: 'performance', label: 'Performance', desc: 'Utilise toujours le template au meilleur score' },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => { setConfig((c) => ({ ...c, ab_mode: value })); save('ab_mode', value) }}
              disabled={tableError}
              className={`p-4 rounded-xl border-2 text-left transition-all ${config.ab_mode === value ? 'border-[#1B3A5C] bg-[#1B3A5C]/5' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="font-semibold text-text text-sm">{label}</p>
              <p className="text-xs text-muted mt-1">{desc}</p>
              {config.ab_mode === value && <Check size={14} className="text-[#1B3A5C] mt-2" />}
            </button>
          ))}
        </div>
      </div>

      {/* Enrichissement */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-[#1B3A5C]" />
          <h2 className="font-semibold text-text">Enrichment provider</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'apollo', label: 'Apollo.io v1', desc: 'Official Apollo API — limited quota' },
            { value: 'apollo_v2_scrape', label: 'Apollo.io v2 Scrape', desc: 'Scraping Apollo — plus de volume' },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => { setConfig((c) => ({ ...c, enrichment_provider: value })); save('enrichment_provider', value) }}
              disabled={tableError}
              className={`p-4 rounded-xl border-2 text-left transition-all ${config.enrichment_provider === value ? 'border-[#1B3A5C] bg-[#1B3A5C]/5' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="font-semibold text-text text-sm">{label}</p>
              <p className="text-xs text-muted mt-1">{desc}</p>
              {config.enrichment_provider === value && <Check size={14} className="text-[#1B3A5C] mt-2" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 btn-secondary">
          <RefreshCw size={14} />
          Recharger depuis Supabase
        </button>
      </div>
    </div>
  )
}

function SaveBtn({ onClick, saved, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'} disabled:opacity-40`}
    >
      {saved ? <Check size={12} /> : <Save size={12} />}
      {saved ? 'OK' : 'Save'}
    </button>
  )
}
