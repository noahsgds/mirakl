import { Target, FileText, ArrowRight, Settings, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function C2Templates() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <Target size={15} className="text-slate-700" />
            </div>
            <h1 className="text-2xl font-bold text-text">Templates — Campaign 2</h1>
          </div>
          <p className="text-muted text-sm">Emails J0 · J+3 · J+6 pour cette campagne</p>
        </div>
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center gap-2 text-sm text-muted border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          Voir templates C1 <ArrowRight size={13} />
        </button>
      </div>

      <div className="card border-2 border-blue-100 bg-blue-50 py-3">
        <div className="flex items-start gap-2">
          <Settings size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Campaign 2 templates can share the same table <code className="bg-blue-100 px-1 rounded text-xs">email_templates</code> que Campaign 1
            with a <code className="bg-blue-100 px-1 rounded text-xs">campaign_name</code> different value.
          </p>
        </div>
      </div>

      {/* Preview of the 3 steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: 1, label: 'Mail 1 — J0',  desc: 'Premier contact · Pitch principal',   color: 'border-blue-200 bg-blue-50' },
          { step: 2, label: 'Email 2 — D+3', desc: 'Follow-up · Added value',             color: 'border-purple-200 bg-purple-50' },
          { step: 3, label: 'Email 3 — D+6', desc: 'Final follow-up · Soft urgency',     color: 'border-pink-200 bg-pink-50' },
        ].map(({ step, label, desc, color }) => (
          <div key={step} className={`card border-2 ${color} py-8 text-center`}>
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 font-bold text-text">
              {step}
            </div>
            <p className="font-semibold text-text text-sm mb-1">{label}</p>
            <p className="text-xs text-muted mb-4">{desc}</p>
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors">
              <Plus size={12} /> Create a template
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
