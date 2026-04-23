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
  Filter,
  SlidersHorizontal,
  X,
  Languages,
  TrendingUp,
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

const LANG_META = {
  en: { flag: '🇬🇧', label: 'EN' },
  fr: { flag: '🇫🇷', label: 'FR' },
  de: { flag: '🇩🇪', label: 'DE' },
  it: { flag: '🇮🇹', label: 'IT' },
  es: { flag: '🇪🇸', label: 'ES' },
  nl: { flag: '🇳🇱', label: 'NL' },
  pl: { flag: '🇵🇱', label: 'PL' },
}

function LangFlag({ lang }) {
  if (!lang) return <span className="text-gray-300">—</span>
  const m = LANG_META[lang.toLowerCase()] || { flag: '🌍', label: lang.toUpperCase() }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-700">
      <span>{m.flag}</span>
      <span>{m.label}</span>
    </span>
  )
}

const DEFAULT_FILTERS = {
  languages: [],       // ['en','fr','de','it']
  ratingMin: '',       // number 0-5
  feedbackMin: '',     // number 0-100
  productsMin: '',     // int
  since: '',           // 'today' | '7d' | '30d' | ''
}

export default function Scraping() {
  const [sellerStats, setSellerStats] = useState({ total: 0, today: 0, lastAt: null, avgRating: 0 })
  const [langCounts, setLangCounts] = useState([])
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
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const sellersRef = useRef(null)

  async function loadAll() {
    setLoading(true)

    const [sellersRes, jobsRes] = await Promise.all([
      supabase.from('amazon_sellers').select('amazon_seller_id, created_at, category, seller_language, rating'),
      supabase.from('scraping_jobs').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    const rows = sellersRes.data || []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = rows.filter((r) => new Date(r.created_at) >= todayStart).length
    const lastAt = rows.map((r) => r.created_at).sort().pop()
    const rated = rows.filter((r) => r.rating != null)
    const avgRating = rated.length
      ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length
      : 0
    setSellerStats({ total: rows.length, today, lastAt, avgRating })

    const catMap = rows.reduce((acc, r) => {
      const k = r.category || 'mode'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    setCategoryCounts(catMap)

    const langMap = rows.reduce((acc, r) => {
      const l = (r.seller_language || '').toLowerCase() || 'unknown'
      acc[l] = (acc[l] || 0) + 1
      return acc
    }, {})
    const langList = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }))
    setLangCounts(langList)

    setJobs(jobsRes.data || [])
    setLoading(false)
  }

  async function loadSellers(category) {
    setSellersLoading(true)
    let query = supabase
      .from('amazon_sellers')
      .select('seller_id, amazon_seller_id, seller_name, seller_url, category, country, nb_products, rating, nb_reviews, avg_price, positive_feedback_pct, seller_language, created_at, on_zalando, zalando_url, business_name, member_since, scraped_email, scraped_phone, email_confidence, phone_confidence, decision_maker_name, decision_maker_email, decision_maker_phone, criteres_detail')
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

    // Filters
    if (filters.languages.length > 0) {
      out = out.filter((r) => filters.languages.includes((r.seller_language || '').toLowerCase()))
    }
    if (filters.ratingMin !== '' && filters.ratingMin != null) {
      const v = parseFloat(filters.ratingMin)
      out = out.filter((r) => r.rating != null && Number(r.rating) >= v)
    }
    if (filters.feedbackMin !== '' && filters.feedbackMin != null) {
      const v = parseFloat(filters.feedbackMin)
      out = out.filter((r) => r.positive_feedback_pct != null && Number(r.positive_feedback_pct) >= v)
    }
    if (filters.productsMin !== '' && filters.productsMin != null) {
      const v = parseInt(filters.productsMin)
      out = out.filter((r) => r.nb_products != null && r.nb_products >= v)
    }
    if (filters.since) {
      const now = Date.now()
      const ms = filters.since === 'today' ? 86400000 : filters.since === '7d' ? 7 * 86400000 : 30 * 86400000
      out = out.filter((r) => r.created_at && now - new Date(r.created_at).getTime() <= ms)
    }

    if (s) {
      out = out.filter(
        (r) =>
          r.seller_name?.toLowerCase().includes(s) ||
          r.business_name?.toLowerCase().includes(s) ||
          r.amazon_seller_id?.toLowerCase().includes(s) ||
          r.seller_language?.toLowerCase().includes(s)
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
  }, [sellers, search, sort, filters])

  const activeFilterCount =
    filters.languages.length +
    (filters.ratingMin !== '' ? 1 : 0) +
    (filters.feedbackMin !== '' ? 1 : 0) +
    (filters.productsMin !== '' ? 1 : 0) +
    (filters.since ? 1 : 0)

  function toggleLang(code) {
    setFilters((f) => ({
      ...f,
      languages: f.languages.includes(code) ? f.languages.filter((x) => x !== code) : [...f.languages, code],
    }))
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

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
        <Stat icon={Database}  label="Vendeurs en base"   value={sellerStats.total}                         color="#1B3A5C" />
        <Stat icon={Users}     label="Ajoutés aujourd'hui" value={sellerStats.today}                         color="#2E7D52" />
        <Stat icon={Clock}     label="Dernier scrape"     value={fmtDate(sellerStats.lastAt)}               color="#3B82F6" sub="Dernier insert" />
        <Stat icon={TrendingUp} label="Note moyenne"      value={sellerStats.avgRating ? sellerStats.avgRating.toFixed(2) : '—'} color="#E8445A" sub="sur les sellers notés" />
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
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] w-56"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filtres
              {activeFilterCount > 0 && (
                <span className="bg-white/25 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Réinitialiser les filtres"
              >
                <X size={15} />
              </button>
            )}
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

        {showFilters && (
          <div className="p-5 border-b border-gray-100 bg-gray-50/60 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <Languages size={11} className="inline -mt-0.5 mr-1" />
                Langue du seller
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['en', 'fr', 'de', 'it', 'es', 'nl', 'pl'].map((code) => {
                  const meta = LANG_META[code] || { flag: '🌍', label: code.toUpperCase() }
                  const active = filters.languages.includes(code)
                  const count = langCounts.find((l) => l.code === code)?.count || 0
                  return (
                    <button
                      key={code}
                      onClick={() => toggleLang(code)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      } ${count === 0 ? 'opacity-40' : ''}`}
                    >
                      <span>{meta.flag}</span>
                      {meta.label}
                      <span className={active ? 'text-white/70' : 'text-gray-400'}>({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Note min ★</label>
                <select
                  value={filters.ratingMin}
                  onChange={(e) => setFilters((f) => ({ ...f, ratingMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
                >
                  <option value="">Toutes</option>
                  <option value="3.5">≥ 3.5</option>
                  <option value="4.0">≥ 4.0</option>
                  <option value="4.5">≥ 4.5</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Feedback min %</label>
                <select
                  value={filters.feedbackMin}
                  onChange={(e) => setFilters((f) => ({ ...f, feedbackMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
                >
                  <option value="">Tous</option>
                  <option value="75">≥ 75%</option>
                  <option value="85">≥ 85%</option>
                  <option value="90">≥ 90%</option>
                  <option value="95">≥ 95%</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Catalogue min</label>
                <select
                  value={filters.productsMin}
                  onChange={(e) => setFilters((f) => ({ ...f, productsMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
                >
                  <option value="">Tous</option>
                  <option value="10">≥ 10 produits</option>
                  <option value="20">≥ 20 produits</option>
                  <option value="50">≥ 50 produits</option>
                  <option value="100">≥ 100 produits</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Scrapé depuis</label>
                <select
                  value={filters.since}
                  onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
                >
                  <option value="">Toujours</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onZalandoOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, onZalandoOnly: e.target.checked }))}
                  className="rounded border-gray-300 text-[#1B3A5C] focus:ring-[#1B3A5C]/30"
                />
                <span>Uniquement déjà sur Zalando</span>
              </label>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <SortTh label="Vendeur" sortKey="seller_name" sort={sort} onClick={toggleSort} />
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Langue</th>
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
                    <td className="px-4 py-3"><LangFlag lang={s.seller_language} /></td>
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

      {/* Two-column: language + jobs history */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Répartition par langue</h2>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">seller Amazon</span>
          </div>
          {langCounts.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {langCounts.map((l) => {
                const pct = sellerStats.total ? Math.round((l.count / sellerStats.total) * 100) : 0
                const meta = LANG_META[l.code] || { flag: l.code === 'unknown' ? '❓' : '🌍', label: l.code.toUpperCase() }
                return (
                  <button
                    key={l.code}
                    onClick={() => l.code !== 'unknown' && toggleLang(l.code)}
                    className={`w-full text-left block group ${l.code === 'unknown' ? 'cursor-default' : 'hover:bg-gray-50 rounded-lg'} p-1 -m-1`}
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <span>{meta.flag}</span>
                        <span>{meta.label === 'UNKNOWN' ? 'Inconnue' : meta.label}</span>
                      </span>
                      <span className="text-gray-500 text-xs">{l.count} · {pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-[#1B3A5C] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
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
            <LangFlag lang={seller.seller_language} />
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

          {/* Legal / contact info scraped from /sp page */}
          {(seller.scraped_email || seller.scraped_phone || seller.decision_maker_name || seller.decision_maker_email || seller.criteres_detail?.vat_number || seller.criteres_detail?.business_address) && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Infos légales & contact</p>
              {seller.criteres_detail?.business_type && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Type</span>
                  <span className="font-medium text-gray-900 text-right">{seller.criteres_detail.business_type}</span>
                </div>
              )}
              {seller.criteres_detail?.vat_number && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">TVA</span>
                  <span className="font-mono text-xs font-semibold text-gray-900">{seller.criteres_detail.vat_number}</span>
                </div>
              )}
              {seller.criteres_detail?.trade_register_number && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Registre</span>
                  <span className="font-mono text-xs text-gray-700">{seller.criteres_detail.trade_register_number}</span>
                </div>
              )}
              {seller.scraped_email && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Email</span>
                  <div className="flex items-center gap-1.5">
                    <a href={`mailto:${seller.scraped_email}`} className="font-medium text-blue-700 hover:underline text-xs truncate max-w-[180px]">{seller.scraped_email}</a>
                    {seller.email_confidence === 'high' && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">vérifié</span>}
                    <button onClick={() => copy(seller.scraped_email)} className="text-gray-400 hover:text-gray-600"><Copy size={11} /></button>
                  </div>
                </div>
              )}
              {seller.scraped_phone && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Tél</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 text-xs">{seller.scraped_phone}</span>
                    {seller.phone_confidence === 'high' && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">vérifié</span>}
                    <button onClick={() => copy(seller.scraped_phone)} className="text-gray-400 hover:text-gray-600"><Copy size={11} /></button>
                  </div>
                </div>
              )}
              {seller.decision_maker_name && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Contact</span>
                  <span className="font-semibold text-gray-900 text-right">{seller.decision_maker_name}</span>
                </div>
              )}
              {seller.decision_maker_email && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Email DM</span>
                  <a href={`mailto:${seller.decision_maker_email}`} className="font-medium text-blue-700 hover:underline text-xs truncate max-w-[180px]">{seller.decision_maker_email}</a>
                </div>
              )}
              {seller.decision_maker_phone && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 flex-shrink-0">Tél DM</span>
                  <span className="font-medium text-gray-900 text-xs">{seller.decision_maker_phone}</span>
                </div>
              )}
              {seller.criteres_detail?.business_address && (
                <div className="flex items-start gap-2 text-sm pt-1 border-t border-blue-100">
                  <span className="text-gray-500 flex-shrink-0">Adresse</span>
                  <span className="text-gray-700 text-xs leading-relaxed">{seller.criteres_detail.business_address}</span>
                </div>
              )}
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
