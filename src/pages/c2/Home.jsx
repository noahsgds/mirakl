import { useNavigate } from 'react-router-dom'
import {
  Target, GitBranch, Users, FileText, Settings,
  ArrowRight, CheckCircle2, Circle, PlayCircle, Zap,
} from 'lucide-react'

const SETUP_STEPS = [
  {
    id: 'tables',
    title: 'Connect Supabase tables',
    desc: 'Create or map your tables (leads, pipeline, sequences) in Supabase.',
    done: false,
  },
  {
    id: 'webhooks',
    title: 'Configure n8n webhooks',
    desc: 'Connect your 3 workflows: enrichment, generation, sequence.',
    done: false,
  },
  {
    id: 'templates',
    title: 'Create email templates',
    desc: 'Write your 3 emails (D0, D+3, D+6) in the Templates tab.',
    done: false,
  },
  {
    id: 'scoring',
    title: 'Define scoring criteria',
    desc: 'Configure qualification rules in Campaign.',
    done: false,
  },
]

const SHORTCUTS = [
  { label: 'Pipeline',  icon: GitBranch, to: '/c2/pipeline', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
  { label: 'Leads',     icon: Users,     to: '/c2/leads',    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
  { label: 'Templates', icon: FileText,  to: '/c2/templates', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
  { label: 'Campaign',  icon: Settings,  to: '/c2/campagne', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
]

export default function C2Home() {
  const navigate = useNavigate()
  const done = SETUP_STEPS.filter((s) => s.done).length
  const pct  = Math.round((done / SETUP_STEPS.length) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <Target size={15} className="text-slate-700" />
            </div>
            <h1 className="text-2xl font-bold text-text">Campaign 2</h1>
          </div>
          <p className="text-muted text-sm">Configure this pipeline to launch your second campaign</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-blue-700 text-xs font-semibold">Setup in progress</span>
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text">Setup progress</p>
          <span className="text-sm font-bold text-blue-700">{done}/{SETUP_STEPS.length} steps</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-3">
          {SETUP_STEPS.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-3 p-3 rounded-xl border ${step.done ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex-shrink-0 mt-0.5">
                {step.done
                  ? <CheckCircle2 size={18} className="text-green-500" />
                  : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 font-bold">{i + 1}</span>
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-green-800 line-through' : 'text-text'}`}>{step.title}</p>
                <p className="text-xs text-muted mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick navigation */}
      <div>
        <p className="text-sm font-semibold text-text mb-3">Campaign sections</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SHORTCUTS.map(({ label, icon: Icon, to, color, bg, border }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`card flex flex-col items-center gap-2 py-5 border-2 ${border} ${bg} hover:shadow-md transition-all group`}
            >
              <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <Icon size={18} className={color} />
              </div>
              <span className={`text-sm font-semibold ${color}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info card */}
      <div className="card border-2 border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] flex-shrink-0">
            <Zap size={15} className="text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">How to configure this campaign?</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              This campaign is identical to <strong>Amazon FR</strong> in its structure.
              It uses the same Supabase table types and n8n workflows.
              Create your tables, connect your webhooks, and the campaign will be operational.
            </p>
            <button
              onClick={() => navigate('/c2/campagne')}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
            >
              <PlayCircle size={14} /> Start setup <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
