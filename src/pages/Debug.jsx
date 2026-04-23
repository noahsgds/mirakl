import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Database, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

const TABLES = [
  {
    name: 'seller_qualification',
    keyCols: ['statut', 'recommandation', 'ab_variant', 'contexte_detecte', 'enriched_source'],
  },
  {
    name: 'amazon_sellers',
    keyCols: ['category', 'target_marketplaces', 'present_marketplaces'],
  },
  {
    name: 'seller_sequence',
    keyCols: ['statut_sequence', 'ab_variant', 'replied', 'bounced', 'unsubscribed'],
  },
  {
    name: 'seller_emails',
    keyCols: ['ab_variant'],
  },
  {
    name: 'email_templates',
    keyCols: ['campaign_name', 'mail_step', 'is_active'],
  },
  {
    name: 'workflow_config',
    keyCols: ['key', 'value'],
  },
  {
    name: 'scraping_jobs',
    keyCols: ['category', 'status', 'platform'],
  },
]

function TableCard({ name, keyCols }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function analyze() {
      setLoading(true)

      const { count, error: countErr } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: true })

      if (countErr) {
        setInfo({ error: countErr.message, exists: false })
        setLoading(false)
        return
      }

      const { data: sample } = await supabase.from(name).select('*').limit(5)
      const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : []

      const nullStats = {}
      if (sample && sample.length > 0) {
        columns.forEach((col) => {
          const nullCount = sample.filter(
            (r) => r[col] == null || r[col] === '' || (Array.isArray(r[col]) && r[col].length === 0)
          ).length
          nullStats[col] = nullCount
        })
      }

      const distributions = {}
      for (const col of keyCols) {
        if (!columns.includes(col)) {
          distributions[col] = '__MISSING__'
          continue
        }
        const { data: all } = await supabase.from(name).select(col).limit(500)
        if (all) {
          const dist = all.reduce((acc, r) => {
            const raw = r[col]
            const v = raw == null
              ? '(null)'
              : Array.isArray(raw)
              ? raw.length === 0 ? '(tableau vide)' : `[${raw.slice(0, 2).join(', ')}${raw.length > 2 ? '…' : ''}]`
              : String(raw)
            acc[v] = (acc[v] || 0) + 1
            return acc
          }, {})
          distributions[col] = Object.entries(dist).sort((a, b) => b[1] - a[1])
        }
      }

      setInfo({ exists: true, count, columns, nullStats, distributions, sample })
      setLoading(false)
    }
    analyze()
  }, [name])

  const missingKeyCols = info?.exists
    ? keyCols.filter((c) => info.distributions[c] === '__MISSING__')
    : []

  return (
    <div className={`card border-2 ${!loading && !info?.exists ? 'border-red-200' : missingKeyCols.length > 0 ? 'border-amber-200' : 'border-transparent'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {loading ? (
            <RefreshCw size={16} className="text-muted animate-spin" />
          ) : info?.exists ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          <h3 className="font-mono font-semibold text-text">{name}</h3>
          {missingKeyCols.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              {missingKeyCols.length} colonne(s) manquante(s)
            </span>
          )}
        </div>
        {!loading && info?.exists && (
          <span className="text-sm font-bold text-[#1B3A5C]">
            {info.count?.toLocaleString('fr-FR')} lignes
          </span>
        )}
      </div>

      {loading && <p className="text-muted text-sm">Analyse en cours...</p>}

      {!loading && !info?.exists && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">Table introuvable ou accès refusé</p>
          <p className="text-xs text-red-600 mt-1 font-mono">{info?.error}</p>
        </div>
      )}

      {!loading && info?.exists && (
        <div className="space-y-4">
          {/* Colonnes */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase mb-2">
              Colonnes ({info.columns.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {info.columns.map((col) => {
                const isKeyCol = keyCols.includes(col)
                const allNull = info.nullStats[col] === (info.sample?.length || 0) && info.sample?.length > 0
                return (
                  <span
                    key={col}
                    title={allNull ? 'Toutes les valeurs sont nulles dans le sample' : undefined}
                    className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                      allNull
                        ? 'bg-red-50 text-red-500 border-red-200'
                        : isKeyCol
                        ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] border-[#1B3A5C]/20 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {col}{allNull ? ' ⚠' : ''}
                  </span>
                )
              })}
              {missingKeyCols.map((col) => (
                <span key={col} className="text-xs px-2 py-0.5 rounded-full font-mono border bg-amber-50 text-amber-600 border-amber-200">
                  {col} ✗ absent
                </span>
              ))}
            </div>
          </div>

          {/* Distributions */}
          {Object.entries(info.distributions).filter(([, v]) => v !== '__MISSING__').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase mb-2">Distributions (500 lignes)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(info.distributions)
                  .filter(([, v]) => v !== '__MISSING__')
                  .map(([col, vals]) => {
                    const total = vals.reduce((s, [, c]) => s + c, 0)
                    return (
                      <div key={col} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-text mb-2 font-mono">{col}</p>
                        <div className="space-y-1">
                          {vals.slice(0, 8).map(([val, count]) => {
                            const w = Math.round((count / total) * 100)
                            return (
                              <div key={val} className="flex items-center gap-2">
                                <div className="flex-1 bg-white rounded h-4 overflow-hidden border border-gray-200">
                                  <div className="h-full bg-[#1B3A5C]/25 rounded" style={{ width: `${w}%` }} />
                                </div>
                                <span className="text-xs font-mono w-36 truncate text-text" title={val}>{val}</span>
                                <span className="text-xs text-muted w-8 text-right">{count}</span>
                              </div>
                            )
                          })}
                          {vals.length > 8 && (
                            <p className="text-xs text-muted mt-1">+ {vals.length - 8} autres valeurs</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Exemple de ligne */}
          {info.sample && info.sample.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted font-medium hover:text-text select-none">
                Voir un exemple de ligne
              </summary>
              <pre className="mt-2 bg-gray-50 rounded-lg p-3 overflow-x-auto text-slate-700 text-xs leading-relaxed border border-gray-200">
                {JSON.stringify(info.sample[0], null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export default function Debug() {
  const [key, setKey] = useState(0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Database size={22} />
            Diagnostic Supabase
          </h1>
          <p className="text-muted text-sm mt-0.5">
            Analyse live des tables — colonnes en <span className="font-mono font-semibold text-[#1B3A5C]">bleu</span> = colonnes clés attendues,
            en <span className="text-amber-600 font-semibold">ambre ✗</span> = absentes, en <span className="text-red-500 font-semibold">rouge ⚠</span> = toujours nulles
          </p>
        </div>
        <button onClick={() => setKey((k) => k + 1)} className="flex items-center gap-2 btn-secondary">
          <RefreshCw size={14} />
          Relancer
        </button>
      </div>

      <div className="card border border-amber-200 bg-amber-50 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Page réservée au diagnostic — distributions calculées sur les 500 premières lignes.
            Partage cette page avec Claude pour qu'il adapte le dashboard au schéma réel.
          </p>
        </div>
      </div>

      <div className="space-y-4" key={key}>
        {TABLES.map((t) => (
          <TableCard key={t.name} name={t.name} keyCols={t.keyCols} />
        ))}
      </div>
    </div>
  )
}
