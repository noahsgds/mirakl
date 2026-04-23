import { useState } from 'react'
import { Target, UserCheck, Mail, Send, PlayCircle, ArrowRight, CheckCircle2, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STAGE_TABS = [
  { key: 'a_scorer',  label: 'À scorer',  dot: 'bg-gray-300',   count: 0 },
  { key: 'scored',    label: 'Scorés',    dot: 'bg-amber-400',  count: 0 },
  { key: 'enriched',  label: 'Enrichis',  dot: 'bg-purple-500', count: 0 },
  { key: 'sequence',  label: 'Séquence',  dot: 'bg-blue-500',   count: 0 },
  { key: 'failed',    label: 'Erreurs',   dot: 'bg-red-400',    count: 0 },
]

const WEBHOOKS = [
  {
    title: 'Enrichissement',
    sub: 'Récupère le décideur',
    Icon: UserCheck,
    color: '#7C3AED',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    btnBg: 'bg-purple-600',
  },
  {
    title: 'Génération emails',
    sub: 'Crée les 3 emails',
    Icon: Mail,
    color: '#2563EB',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    btnBg: 'bg-blue-600',
  },
  {
    title: 'Séquence',
    sub: 'Envoie J0 / J+3 / J+6',
    Icon: Send,
    color: '#16A34A',
    lightBg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    btnBg: 'bg-green-600',
  },
]

export default function C2Pipeline() {
  const [tab, setTab] = useState('a_scorer')
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Target size={14} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text">Pipeline — Campagne 2</h1>
          </div>
          <p className="text-muted text-sm">Pilotez chaque étape avant de déclencher les workflows</p>
        </div>
      </div>

      {/* Setup required banner */}
      <div className="card border-2 border-blue-100 bg-blue-50 py-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Settings size={15} className="text-blue-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Configuration requise</p>
            <p className="text-sm text-blue-700">
              Connectez vos tables Supabase et vos webhooks n8n pour activer ce pipeline.
            </p>
          </div>
          <button
            onClick={() => navigate('/c2')}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            Configurer <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Webhook cards — structure ready */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {WEBHOOKS.map((wh) => (
          <div key={wh.title} className={`card border-2 ${wh.border} flex flex-col gap-3 opacity-60`}>
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${wh.lightBg}`}>
                <wh.Icon size={18} style={{ color: wh.color }} />
              </div>
              <span className={`text-2xl font-bold ${wh.text}`}>0</span>
            </div>
            <div>
              <p className="font-semibold text-text text-sm">{wh.title}</p>
              <p className="text-xs text-muted mt-0.5">{wh.sub}</p>
            </div>
            <div className={`w-full flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg font-medium ${wh.btnBg} opacity-50 cursor-not-allowed`}>
              <PlayCircle size={14} /> Lancer <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>

      {/* Stage tabs + table */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {STAGE_TABS.map(({ key, label, dot, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div className="py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-text mb-1">Aucun lead dans ce pipeline</p>
          <p className="text-xs text-muted mb-4 max-w-xs mx-auto">
            Connectez vos sources de données pour commencer à alimenter ce pipeline.
          </p>

          {/* Sequence step preview */}
          <div className="max-w-md mx-auto px-6">
            <p className="text-xs font-semibold text-muted uppercase mb-3">Aperçu des étapes de séquence</p>
            <div className="flex items-center gap-0 justify-center">
              {[
                { step: 1, label: 'J0', desc: 'Email initial', color: 'bg-blue-600' },
                { step: 2, label: 'J+3', desc: 'Relance 1', color: 'bg-purple-600' },
                { step: 3, label: 'J+6', desc: 'Relance 2', color: 'bg-[#E8445A]' },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {s.step}
                    </div>
                    <p className="text-xs font-semibold text-text mt-1">{s.label}</p>
                    <p className="text-[10px] text-muted">{s.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="w-10 h-px bg-gray-200 mx-1 mb-5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-muted">0 leads affichés · Pipeline prêt à être configuré</p>
        </div>
      </div>
    </div>
  )
}
