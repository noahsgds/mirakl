import { Target, Users, ArrowRight, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function C2Leads() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Target size={14} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text">Leads — Campagne 2</h1>
          </div>
          <p className="text-muted text-sm">Base de prospects de cette campagne</p>
        </div>
      </div>

      <div className="card border-2 border-blue-100 bg-blue-50 py-3">
        <div className="flex items-start gap-2">
          <Settings size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Connectez votre table de leads Supabase dans la{' '}
            <button onClick={() => navigate('/c2')} className="underline font-medium">configuration de la campagne</button>.
          </p>
        </div>
      </div>

      <div className="card py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Users size={24} className="text-blue-400" />
        </div>
        <p className="text-sm font-semibold text-text mb-1">Aucun lead pour cette campagne</p>
        <p className="text-xs text-muted mb-4">Configurez vos sources de données pour alimenter cette liste.</p>
        <button
          onClick={() => navigate('/c2')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Settings size={14} /> Configurer la campagne <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}
