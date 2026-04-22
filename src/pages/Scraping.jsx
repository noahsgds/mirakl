import { useEffect, useState } from 'react'
import {
  Bot,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Users,
  Globe2,
  Database,
  Terminal,
  Copy,
  CheckCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }) {
  const map = {
    pending:   { label: 'En attente',  bg: 'bg-amber-100',  fg: 'text-amber-700',  icon: Clock },
    running:   { label: 'En cours',    bg: 'bg-blue-100',   fg: 'text-blue-700',   icon: Loader2, spin: true },
    success:   { label: 'Succès',      bg: 'bg-green-100',  fg: 'text-green-700',  icon: CheckCircle2 },
    error:     { label: 'Erreur',      bg: 'bg-red-100',    fg: 'text-red-700',    icon: XCircle },
    cancelled: { label: 'Annulé',      bg: 'bg-gray-100',   fg: 'text-gray-600',   icon: XCircle },
  }
  const s = map[status] || map.pending
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.fg}`}>
      <Icon size={12} className={s.spin ? 'animate-spin' : ''} />
      {s.label}
    </span>
  )
}

function Stat({ icon: Icon, label, value, sub, color = '#1B3A5C' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Scraping() {
  const [sellerStats, setSellerStats] = useState({ total: 0, today: 0, lastAt: null })
  const [countries, setCountries] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [form, setForm] = useState({ target_count: 1000, parallel: 4, skip_existing: true })
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)

  async function loadAll() {
    setLoading(true)

    const [sellersRes, countryRes, jobsRes] = await Promise.all([
      supabase.from('amazon_sellers').select('amazon_seller_id, created_at', { count: 'exact' }),
      supabase.from('amazon_sellers').select('country'),
      supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const rows = sellersRes.data || []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = rows.filter((r) => new Date(r.created_at) >= todayStart).length
    const lastAt = rows
      .map((r) => r.created_at)
      .sort()
      .pop()

    setSellerStats({ total: rows.length, today, lastAt })

    const countryMap = (countryRes.data || []).reduce((acc, r) => {
      const c = (r.country || 'Inconnu').trim() || 'Inconnu'
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {})
    const countryList = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))
    setCountries(countryList)

    setJobs(jobsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel('scraping-jobs-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scraping_jobs' },
        () => loadAll()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function launch() {
    setLaunching(true)
    const { error } = await supabase.from('scraping_jobs').insert({
      target_count: form.target_count,
      parallel: form.parallel,
      skip_existing: form.skip_existing,
      status: 'pending',
      triggered_by: 'dashboard',
    })
    setLaunching(false)
    if (error) {
      setToast({ type: 'error', msg: `Erreur : ${error.message}` })
    } else {
      setToast({ type: 'ok', msg: 'Job créé — le runner le lancera automatiquement.' })
      loadAll()
    }
    setTimeout(() => setToast(null), 4000)
  }

  const launchCmd = `python scraper.py --count ${form.target_count} --parallel ${form.parallel}${form.skip_existing ? '' : ' --no-dedup'}`

  function copyCmd() {
    navigator.clipboard.writeText(launchCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B3A5C] flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Scraping Amazon FR</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Pipeline de prospection — collecte automatique de nouveaux vendeurs tiers chaque matin
          </p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <Stat icon={Database}  label="Vendeurs en base"   value={sellerStats.total}              color="#1B3A5C" />
        <Stat icon={Users}     label="Ajoutés aujourd'hui" value={sellerStats.today}              color="#2E7D52" />
        <Stat icon={Clock}     label="Dernier scrape"     value={fmtDate(sellerStats.lastAt)}   color="#3B82F6" sub="Timestamp du dernier insert" />
        <Stat icon={Globe2}    label="Pays distincts"     value={countries.length}                color="#E8445A" />
      </div>

      {/* Launch panel + config */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Lancer un scraping</h2>
          <p className="text-sm text-gray-500 mb-5">
            Un job est créé dans Supabase puis exécuté par le runner. Les doublons sont filtrés automatiquement.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Nb vendeurs cible
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                value={form.target_count}
                onChange={(e) => setForm({ ...form, target_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Workers parallèles
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={form.parallel}
                onChange={(e) => setForm({ ...form, parallel: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Dédup Supabase
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, skip_existing: !form.skip_existing })}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.skip_existing
                    ? 'bg-[#1B3A5C] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {form.skip_existing ? 'Actif — skip doublons' : 'Désactivé'}
              </button>
            </div>
          </div>

          <button
            onClick={launch}
            disabled={launching}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8445A] hover:bg-[#d13a4f] text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {launching ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
            {launching ? 'Création du job…' : 'Lancer le scraping'}
          </button>

          {toast && (
            <div
              className={`mt-4 text-sm px-3 py-2 rounded-lg ${
                toast.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {toast.msg}
            </div>
          )}
        </div>

        <div className="bg-[#141A47] rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={16} className="text-[#F5B301]" />
            <p className="text-xs font-semibold text-[#F5B301] uppercase tracking-wider">
              Équivalent CLI
            </p>
          </div>
          <p className="text-xs text-white/60 mb-3">
            Même action en ligne de commande (pour dev local)
          </p>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-white mb-3 break-all">
            {launchCmd}
          </div>
          <button
            onClick={copyCmd}
            className="inline-flex items-center gap-2 text-xs text-white/80 hover:text-white"
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Two-column: country breakdown + jobs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition pays</h2>
          {countries.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {countries.map((c) => {
                const pct = Math.round((c.count / sellerStats.total) * 100)
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{c.name}</span>
                      <span className="text-gray-500 text-xs">
                        {c.count} · {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#1B3A5C] h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Historique des runs</h2>
            <span className="text-xs text-gray-400">{jobs.length} derniers</span>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun job pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2">Statut</th>
                    <th className="py-2">Créé</th>
                    <th className="py-2">Cible</th>
                    <th className="py-2">Workers</th>
                    <th className="py-2">Scrapés</th>
                    <th className="py-2">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const dur = j.started_at && j.finished_at
                      ? Math.round(
                          (new Date(j.finished_at) - new Date(j.started_at)) / 1000 / 60
                        ) + ' min'
                      : j.status === 'running' ? 'en cours…' : '—'
                    return (
                      <tr key={j.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3">
                          <StatusPill status={j.status} />
                        </td>
                        <td className="py-3 text-gray-600">{fmtDate(j.created_at)}</td>
                        <td className="py-3 text-gray-900 font-medium">{j.target_count}</td>
                        <td className="py-3 text-gray-600">{j.parallel}</td>
                        <td className="py-3 text-gray-900 font-medium">{j.sellers_scraped ?? 0}</td>
                        <td className="py-3 text-gray-500">{dur}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
