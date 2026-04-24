import { Target, Users, ArrowRight, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function C2Leads() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <Target size={15} className="text-slate-700" />
            </div>
            <h1 className="text-2xl font-bold text-text">Leads — Campaign 2</h1>
          </div>
          <p className="text-muted text-sm">Base de prospects de cette campagne</p>
        </div>
      </div>

      <div className="card border-2 border-blue-100 bg-blue-50 py-3">
        <div className="flex items-start gap-2">
          <Settings size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Connect your Supabase leads table in{' '}
            <button onClick={() => navigate('/c2')} className="underline font-medium">configuration de la campagne</button>.
          </p>
        </div>
      </div>

      <div className="card py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <Users size={24} className="text-slate-600" />
        </div>
        <p className="text-sm font-semibold text-text mb-1">No lead pour cette campagne</p>
        <p className="text-xs text-muted mb-4">Configure your data sources to feed this list.</p>
        <button
          onClick={() => navigate('/c2')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Settings size={14} /> Configure campaign <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}
