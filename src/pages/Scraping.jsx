import { useEffect, useMemo, useState, useRef } from 'react'
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
  Target,
  Zap,
  AlertTriangle,
  Search,
  Download,
  ExternalLink,
  Star,
  ArrowUpDown,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategory, categoryLabel } from '../lib/categories'

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtEUR(v) {
  if (v == null) return '—'
  return `${Number(v).toFixed(2)} €`
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

function CategoryBadge({ categoryKey, size = 'sm' }) {
  const cat = getCategory(categoryKey)
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const txt = size === 'sm' ? 'text-[11px]' : 'text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 ${px} rounded-full font-semibold bg-gray-100 text-gray-700 ${txt}`}
    >
      <span>{cat.emoji}</span>
      <span>{cat.label}</span>
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

function Rating({ value }) {
  if (value == null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Star size={11} className="fill-amber-400 text-amber-400" />
      <span className="font-medium text-gray-700">{Number(value).toFixed(1)}</span>
    </span>
  )
}

function CountryFlag({ country }) {
  if (!country) return <span className="text-gray-300">—</span>
  const map = { 'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸', 'UK': '🇬🇧', 'GB': '🇬🇧', 'US': '🇺🇸', 'CN': '🇨🇳', 'NL': '🇳🇱', 'BE': '🇧🇪', 'PL': '🇵🇱' }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-700">
      <span>{map[country.toUpperCase()] || '🌍'}</span>
      <span>{country}</span>
    </span>
  )
}

export default function Scraping() {
  const [sellerStats, setSellerStats] = useState({ total: 0, today: 0, lastAt: null })
  const [countries, setCountries] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [form, setForm] = useState({
    category: 'mode',
    target_count: 100,
    parallel: 2,
    skip_existing: true,
  })
  const [toast, setToast] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null)

  // Sellers drill-down
  const [sellers, setSellers] = useState([])
  const [sellersLoading, setSellersLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null) // null = all
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [selectedSeller, setSelectedSeller] = useState(null)
  const sellersRef = useRef(null)

  async function loadAll() {
    setLoading(true)

    const [sellersRes, countryRes, jobsRes] = await Promise.all([
      supabase.from('amazon_sellers').select('amazon_seller_id, created_at, category'),
      supabase.from('amazon_sellers').select('country'),
      supabase.from('scraping_jobs').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    const rows = sellersRes.data || []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = rows.filter((r) => new Date(r.created_at) >= todayStart).length
    const lastAt = rows.map((r) => r.created_at).sort().pop()
    setSellerStats({ total: rows.length, today, lastAt })

    const catMap = rows.reduce((acc, r) => {
      const k = r.category || 'mode'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    setCategoryCounts(catMap)

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

  async function loadSellers(category) {
    setSellersLoading(true)
    let query = supabase
      .from('amazon_sellers')
      .select('seller_id, amazon_seller_id, seller_name, seller_url, category, country, nb_products, rating, nb_reviews, avg_price, positive_feedback_pct, seller_language, created_at, on_zalando, zalando_url, business_name, member_since')
      .order('created_at', { ascending: false })
      .limit(500)
    if (category) query = query.eq('category', category)
    const { data } = await query
    setSellers(data || [])
    setSellersLoading(false)
  }

  useEffect(() => {
    loadAll()
    loadSellers(null)

    const channel = supabase
      .channel('scraping-jobs-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scraping_jobs' }, () => loadAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'amazon_sellers' }, () => {
        loadAll()
        loadSellers(activeCategory)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    loadSellers(activeCategory)
  }, [activeCategory])

  const activeJobsByCategory = useMemo(() => {
    const map = {}
    for (const j of jobs) {
      if (j.status === 'pending' || j.status === 'running') {
        if (!map[j.category]) map[j.category] = j
      }
    }
    return map
  }, [jobs])

  const filteredSellers = useMemo(() => {
    const s = search.toLowerCase().trim()
    let out = sellers
    if (s) {
      out = out.filter(
        (r) =>
          r.seller_name?.toLowerCase().includes(s) ||
          r.business_name?.toLowerCase().includes(s) ||
          r.amazon_seller_id?.toLowerCase().includes(s) ||
          r.country?.toLowerCase().includes(s)
      )
    }
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = a[key], vb = b[key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul
      return String(va).localeCompare(String(vb)) * mul
    })
    return out
  }, [sellers, search, sort])

  function toggleSort(key) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  }

  function openCategory(cat) {
    setActiveCategory(cat)
    setForm((f) => ({ ...f, category: cat }))
    setTimeout(() => {
      sellersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function requestLaunch(overrides = {}) {
    const payload = {
      category: overrides.category || form.category,
      target_count: overrides.target_count ?? form.target_count,
      parallel: overrides.parallel ?? form.parallel,
      skip_existing: overrides.skip_existing ?? form.skip_existing,
    }
    const active = activeJobsByCategory[payload.category]
    if (active) {
      const cat = getCategory(payload.category)
      const statusLabel = active.status === 'running' ? 'en cours' : 'en attente'
      setToast({
        type: 'error',
        msg: `Un scraping ${cat.label} ${cat.emoji} est déjà ${statusLabel} (créé ${fmtDate(active.created_at)}). Attends qu'il finisse.`,
      })
      setTimeout(() => setToast(null), 5000)
      return
    }
    setPendingConfirm(payload)
  }

  async function confirmLaunch() {
    if (!pendingConfirm) return
    setLaunching(true)
    const { data: existing, error: checkErr } = await supabase
      .from('scraping_jobs')
      .select('id, status, created_at')
      .eq('category', pendingConfirm.category)
      .in('status', ['pending', 'running'])
      .limit(1)

    if (checkErr) {
      setLaunching(false)
      setToast({ type: 'error', msg: `Erreur vérif : ${checkErr.message}` })
      setTimeout(() => setToast(null), 4000)
      return
    }
    if (existing && existing.length > 0) {
      setLaunching(false)
      setPendingConfirm(null)
      const cat = getCategory(pendingConfirm.category)
      setToast({
        type: 'error',
        msg: `Job ${cat.label} déjà actif — lancement bloqué pour éviter un doublon.`,
      })
      setTimeout(() => setToast(null), 5000)
      loadAll()
      return
    }

    const { error } = await supabase.from('scraping_jobs').insert({
      ...pendingConfirm,
      status: 'pending',
      triggered_by: 'dashboard',
    })
    setLaunching(false)
    setPendingConfirm(null)
    if (error) {
      setToast({ type: 'error', msg: `Erreur : ${error.message}` })
    } else {
      const cat = getCategory(pendingConfirm.category)
      setToast({
        type: 'ok',
        msg: `Job créé : ${pendingConfirm.target_count} sellers ${cat.label} ${cat.emoji} — le runner va le lancer.`,
      })
      loadAll()
    }
    setTimeout(() => setToast(null), 4000)
  }

  async function cancelJob(jobId) {
    const { error } = await supabase
      .from('scraping_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .eq('status', 'pending')
    if (error) {
      setToast({ type: 'error', msg: `Annulation : ${error.message}` })
    } else {
      setToast({ type: 'ok', msg: 'Job annulé.' })
      loadAll()
    }
    setTimeout(() => setToast(null), 3000)
  }

  function exportSellersCSV() {
    const rows = filteredSellers
    if (rows.length === 0) {
      setToast({ type: 'error', msg: 'Aucun seller à exporter.' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    const cols = [
      'seller_name', 'amazon_seller_id', 'category', 'country', 'seller_language',
      'nb_products', 'rating', 'nb_reviews', 'positive_feedback_pct', 'avg_price',
      'member_since', 'seller_url', 'on_zalando', 'zalando_url', 'business_name', 'created_at',
    ]
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`)
    const header = cols.join(',')
    const lines = rows.map((r) => cols.map((c) => esc(r[c])).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const tag = activeCategory || 'all'
    a.href = url
    a.download = `amazon-sellers-${tag}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast({ type: 'ok', msg: `Export : ${rows.length} sellers → CSV` })
    setTimeout(() => setToast(null), 3000)
  }

  const selectedCat = getCategory(form.category)

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
            Pipeline de qualification multi-catégories — {sellerStats.total} sellers en base, click sur une catégorie pour drill down.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadAll(); loadSellers(activeCategory) }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <Stat icon={Database}  label="Vendeurs en base"   value={sellerStats.total}            color="#1B3A5C" />
        <Stat icon={Users}     label="Ajoutés aujourd'hui" value={sellerStats.today}            color="#2E7D52" />
        <Stat icon={Clock}     label="Dernier scrape"     value={fmtDate(sellerStats.lastAt)}  color="#3B82F6" sub="Timestamp du dernier insert" />
        <Stat icon={Globe2}    label="Pays distincts"     value={countries.length}              color="#E8445A" />
      </div>

      {/* Catégories — click to drill down */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sellers par catégorie</h2>
            <p className="text-xs text-gray-500 mt-1">
              Click sur une catégorie pour afficher ses sellers · bouton <Zap size={10} className="inline -mt-0.5" /> pour scraper
            </p>
          </div>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3A5C] text-white rounded-lg text-xs font-medium"
            >
              <XCircle size={12} />
              Voir toutes ({sellerStats.total})
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map((c) => {
            const count = categoryCounts[c.key] || 0
            const isActive = activeCategory === c.key
            const activeJob = activeJobsByCategory[c.key]
            const isBusy = Boolean(activeJob)
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => openCategory(c.key)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30 ${
                  isActive
                    ? 'border-[#1B3A5C] bg-[#1B3A5C]/5 shadow-sm'
                    : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{c.emoji}</span>
                  {isBusy && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                      <Loader2 size={10} className="animate-spin" />
                      {activeJob.status === 'running' ? 'En cours' : 'En file'}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-[#1B3A5C]">{count}</p>
                  <span className="text-xs text-gray-400">sellers</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                  → {c.marketplaces.slice(0, 2).join(' · ')}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-md bg-gray-100 text-gray-700">
                    <Eye size={11} />
                    Voir
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      requestLaunch({ category: c.key })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        requestLaunch({ category: c.key })
                      }
                    }}
                    title={isBusy ? 'Job déjà actif' : `Scraper ${c.label}`}
                    aria-disabled={launching || isBusy}
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-md cursor-pointer ${
                      isBusy
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'text-white bg-[#E8445A] hover:bg-[#d13a4f]'
                    }`}
                  >
                    <Zap size={11} />
                    Scraper
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sellers table (drill-down) */}
      <div ref={sellersRef} className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeCategory ? `Sellers ${getCategory(activeCategory).emoji} ${getCategory(activeCategory).label}` : 'Tous les sellers'}
            </h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {filteredSellers.length}
              {filteredSellers.length !== sellers.length ? ` / ${sellers.length}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un vendeur…"
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] w-64"
              />
            </div>
            <button
              onClick={exportSellersCSV}
              disabled={filteredSellers.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1B3A5C] hover:bg-[#16314d] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export CSV des sellers filtrés"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <SortTh label="Vendeur" sortKey="seller_name" sort={sort} onClick={toggleSort} />
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Pays</th>
                <SortTh label="Note" sortKey="rating" sort={sort} onClick={toggleSort} align="right" />
                <SortTh label="Reviews" sortKey="nb_reviews" sort={sort} onClick={toggleSort} align="right" />
                <SortTh label="Feedback" sortKey="positive_feedback_pct" sort={sort} onClick={toggleSort} align="right" />
                <SortTh label="Produits" sortKey="nb_products" sort={sort} onClick={toggleSort} align="right" />
                <SortTh label="Prix moy" sortKey="avg_price" sort={sort} onClick={toggleSort} align="right" />
                <SortTh label="Scrapé" sortKey="created_at" sort={sort} onClick={toggleSort} />
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sellersLoading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
              ) : filteredSellers.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">
                  {search ? 'Aucun seller ne matche la recherche.' : 'Aucun seller pour cette catégorie.'}
                </td></tr>
              ) : (
                filteredSellers.map((s) => (
                  <tr
                    key={s.seller_id}
                    onClick={() => setSelectedSeller(s)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-gray-900 max-w-[220px]">
                        <span className="truncate">{s.seller_name || s.amazon_seller_id || '—'}</span>
                        {s.on_zalando && <span title="Déjà sur Zalando" className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">Z</span>}
                      </div>
                      {s.business_name && s.business_name !== s.seller_name && (
                        <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{s.business_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><CategoryBadge categoryKey={s.category || 'mode'} /></td>
                    <td className="px-4 py-3"><CountryFlag country={s.country} /></td>
                    <td className="px-4 py-3 text-right"><Rating value={s.rating} /></td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.nb_reviews ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.positive_feedback_pct != null ? `${s.positive_feedback_pct}%` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.nb_products ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtEUR(s.avg_price)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.seller_url && (
                        <a
                          href={s.seller_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#1B3A5C]"
                          title="Ouvrir sur Amazon"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Lancer un scraping — {selectedCat.emoji} {selectedCat.label}
        </h2>
        <p className="text-sm text-gray-500 mb-1">
          Sellers ciblés pour : <strong>{selectedCat.marketplaces.join(', ')}</strong>
        </p>
        <p className="text-xs text-gray-400 mb-5">{selectedCat.description}</p>

        <div className="grid grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Nb sellers cible</label>
            <input
              type="number" min="10" max="5000" step="10"
              value={form.target_count}
              onChange={(e) => setForm({ ...form, target_count: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Workers</label>
            <input
              type="number" min="1" max="8"
              value={form.parallel}
              onChange={(e) => setForm({ ...form, parallel: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Doublons</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, skip_existing: !form.skip_existing })}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left ${
                form.skip_existing ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] border border-[#1B3A5C]/20' : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {form.skip_existing ? 'Skip existants' : 'Inclure tous'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => requestLaunch()}
            disabled={launching || Boolean(activeJobsByCategory[form.category])}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8445A] hover:bg-[#d13a4f] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {launching ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
            {launching
              ? 'Création du job…'
              : activeJobsByCategory[form.category]
              ? `${selectedCat.label} déjà en cours`
              : `Lancer — ${selectedCat.label}`}
          </button>
          <p className="text-xs text-gray-400">
            Durée estimée : ~{Math.max(5, Math.round(form.target_count / 8))} min · {form.parallel} worker{form.parallel > 1 ? 's' : ''} parallèle{form.parallel > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Two-column: country + jobs history */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition pays</h2>
          {countries.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {countries.map((c) => {
                const pct = sellerStats.total ? Math.round((c.count / sellerStats.total) * 100) : 0
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{c.name}</span>
                      <span className="text-gray-500 text-xs">{c.count} · {pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-[#1B3A5C] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
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
                    <th className="py-2">Catégorie</th>
                    <th className="py-2">Créé</th>
                    <th className="py-2">Cible</th>
                    <th className="py-2">Scrapés</th>
                    <th className="py-2">Durée</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const dur = j.started_at && j.finished_at
                      ? Math.round((new Date(j.finished_at) - new Date(j.started_at)) / 1000 / 60) + ' min'
                      : j.status === 'running' ? 'en cours…' : '—'
                    return (
                      <tr key={j.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3"><StatusPill status={j.status} /></td>
                        <td className="py-3"><CategoryBadge categoryKey={j.category || 'mode'} /></td>
                        <td className="py-3 text-gray-600">{fmtDate(j.created_at)}</td>
                        <td className="py-3 text-gray-900 font-medium">{j.target_count}</td>
                        <td className="py-3 text-gray-900 font-medium">{j.sellers_scraped ?? 0}</td>
                        <td className="py-3 text-gray-500">{dur}</td>
                        <td className="py-3 text-right">
                          {j.status === 'pending' && (
                            <button
                              onClick={() => cancelJob(j.id)}
                              className="text-xs text-gray-400 hover:text-red-600"
                              title="Annuler"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Floating toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <div className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Seller details drawer */}
      {selectedSeller && (
        <SellerDrawer seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
      )}

      {/* Confirm modal */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !launching && setPendingConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmer le lancement</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Le scraper va interroger Amazon FR pendant ~{Math.max(5, Math.round((pendingConfirm.target_count || 100) / 8))} min.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <Row k="Catégorie" v={<>{getCategory(pendingConfirm.category).emoji} {getCategory(pendingConfirm.category).label}</>} />
              <Row k="Nb sellers cible" v={pendingConfirm.target_count} />
              <Row k="Workers parallèles" v={pendingConfirm.parallel} />
              <Row k="Skip doublons" v={pendingConfirm.skip_existing ? 'Oui' : 'Non'} />
            </div>

            <p className="text-xs text-gray-500 mb-5">
              Un seul job par catégorie peut tourner à la fois — un double-clic sera bloqué côté serveur.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                disabled={launching}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmLaunch}
                disabled={launching}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#E8445A] hover:bg-[#d13a4f] rounded-lg disabled:opacity-60"
              >
                {launching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="white" />}
                {launching ? 'Création…' : 'Lancer le scraping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortTh({ label, sortKey, sort, onClick, align = 'left' }) {
  const active = sort.key === sortKey
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-[#1B3A5C] ${active ? 'text-[#1B3A5C]' : ''}`}
      >
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowUpDown size={10} className="opacity-40" />}
      </button>
    </th>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="font-semibold text-gray-900">{v}</span>
    </div>
  )
}

function SellerDrawer({ seller, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy(v) {
    if (!v) return
    navigator.clipboard.writeText(v)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const cat = getCategory(seller.category || 'mode')
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-md h-full shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Vendeur Amazon</p>
              <h2 className="text-xl font-bold text-gray-900">{seller.seller_name || seller.amazon_seller_id}</h2>
              {seller.business_name && seller.business_name !== seller.seller_name && (
                <p className="text-sm text-gray-500 mt-0.5">{seller.business_name}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <XCircle size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CategoryBadge categoryKey={cat.key} size="md" />
            <CountryFlag country={seller.country} />
            {seller.on_zalando && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                Sur Zalando
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Note" value={seller.rating != null ? Number(seller.rating).toFixed(1) : '—'} icon={Star} />
            <MiniStat label="Avis" value={seller.nb_reviews ?? '—'} icon={Users} />
            <MiniStat label="Feedback +" value={seller.positive_feedback_pct != null ? `${seller.positive_feedback_pct}%` : '—'} icon={CheckCircle2} />
            <MiniStat label="Produits" value={seller.nb_products ?? '—'} icon={Database} />
            <MiniStat label="Prix moy" value={fmtEUR(seller.avg_price)} icon={Target} />
            <MiniStat label="Langue" value={seller.seller_language || '—'} icon={Globe2} />
          </div>

          {seller.member_since && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sur Amazon depuis</p>
              <p className="text-sm text-gray-900">{seller.member_since}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Marketplaces cibles Mirakl</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.marketplaces.map((m) => (
                <span key={m} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {seller.amazon_seller_id && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Seller ID Amazon</p>
              <button
                onClick={() => copy(seller.amazon_seller_id)}
                className="inline-flex items-center gap-2 text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 w-full text-left"
              >
                <span className="flex-1 truncate">{seller.amazon_seller_id}</span>
                <Copy size={13} className="text-gray-400" />
              </button>
              {copied && <p className="text-[10px] text-green-600 mt-1">Copié ✓</p>}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {seller.seller_url && (
              <a
                href={seller.seller_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1B3A5C] text-white rounded-lg text-sm font-semibold hover:bg-[#16314d]"
              >
                <ExternalLink size={14} />
                Ouvrir sur Amazon
              </a>
            )}
            {seller.zalando_url && (
              <a
                href={seller.zalando_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
              >
                <ExternalLink size={14} />
                Voir sur Zalando
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-gray-400" />
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
