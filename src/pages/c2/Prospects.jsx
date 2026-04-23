import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, RefreshCw, ExternalLink, Linkedin,
  CheckCircle2, AlertCircle, X, Filter, Download,
  Tag, Globe, Star, Users, Package, Building2, ChevronDown,
} from 'lucide-react'
import { fetchSellers, fetchMatches } from '../../lib/c2'
import { supabase } from '../../lib/supabase'

function enrichmentScore(seller) {
  const fields = [
    'brand_story_summary', 'key_aesthetic', 'contact_email',
    'brand_tier', 'country_origin', 'product_types_list', 'top_product_tags',
  ]
  const filled = fields.filter(f => seller[f]).length
  return Math.round((filled / fields.length) * 100)
}

function EnrichmentBar({ score }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted w-8 text-right">{score}%</span>
    </div>
  )
}

const TIER_COLORS = {
  premium:  'bg-purple-100 text-purple-700',
  mid:      'bg-blue-100 text-blue-700',
  budget:   'bg-gray-100 text-gray-600',
  luxury:   'bg-amber-100 text-amber-700',
}

export default function C2Prospects() {
  const [sellers, setSellers]       = useState([])
  const [matchCounts, setMatchCounts] = useState({}) // seller_id → match count
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(null)
  const [filterTier, setFilterTier] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [scraping, setScraping]     = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [form, setForm]             = useState({ seller_name: '', seller_url: '', categories: '', country_origin: '', brand_tier: '', contact_name: '', contact_email: '' })
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)

  async function load() {
    setLoading(true)
    const [s, m] = await Promise.all([fetchSellers({ limit: 1000 }), fetchMatches({ limit: 2000 })])
    setSellers(s.data)
    const counts = {}
    for (const match of m.data) {
      counts[match.seller_id] = (counts[match.seller_id] ?? 0) + 1
    }
    setMatchCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const tiers    = useMemo(() => [...new Set(sellers.map(s => s.brand_tier).filter(Boolean))].sort(), [sellers])
  const countries = useMemo(() => [...new Set(sellers.map(s => s.country_origin).filter(Boolean))].sort(), [sellers])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return sellers.filter(seller => {
      if (filterTier    && seller.brand_tier     !== filterTier)    return false
      if (filterCountry && seller.country_origin !== filterCountry) return false
      if (s) {
        const hay = `${seller.seller_name ?? ''} ${seller.brand_name ?? ''} ${seller.seller_url ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [sellers, search, filterTier, filterCountry])

  function mockScrape() {
    setScraping(true)
    setScrapeResult(null)
    setTimeout(() => {
      setScraping(false)
      setScrapeResult({ found: 24, imported: 18, skipped: 5, errored: 1 })
    }, 2200)
  }

  async function addProspect() {
    setFormError('')
    if (!form.seller_name.trim()) { setFormError('Seller name is required.'); return }
    if (!form.seller_url.trim() || !form.seller_url.startsWith('http')) { setFormError('Valid URL required (must start with http).'); return }
    setSaving(true)
    const dup = sellers.find(s => s.seller_url?.toLowerCase() === form.seller_url.toLowerCase())
    if (dup) { setFormError(`Domain already exists: "${dup.seller_name}".`); setSaving(false); return }
    const { error } = await supabase.from('sellers').insert([{
      seller_name:    form.seller_name.trim(),
      seller_url:     form.seller_url.trim(),
      categories:     form.categories.trim() || null,
      country_origin: form.country_origin.trim() || null,
      brand_tier:     form.brand_tier || null,
      contact_name:   form.contact_name.trim() || null,
      contact_email:  form.contact_email.trim() || null,
    }])
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowAdd(false)
    setForm({ seller_name: '', seller_url: '', categories: '', country_origin: '', brand_tier: '', contact_name: '', contact_email: '' })
    load()
  }

  function exportCSV() {
    const header = 'seller_name,brand_name,seller_url,categories,country_origin,brand_tier,contact_email,enrichment'
    const rows = filtered.map(s => [
      s.seller_name, s.brand_name, s.seller_url, s.categories, s.country_origin, s.brand_tier, s.contact_email, enrichmentScore(s),
    ].map(v => `"${v ?? ''}"`).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'prospects.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">Prospects</h1>
          <p className="text-sm text-muted mt-0.5">Seller acquisition · Enrichment · Matching readiness</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
            <Download size={13} /> Export
          </button>
          <button
            onClick={mockScrape}
            disabled={scraping}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1B3A5C] text-white hover:bg-[#15304e] disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={13} className={scraping ? 'animate-spin' : ''} />
            {scraping ? 'Scraping…' : 'Run Scraping'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1d4ed8] transition-colors"
          >
            <Plus size={13} /> Add Prospect
          </button>
        </div>
      </div>

      {/* Scrape result */}
      {scrapeResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card border border-emerald-200 bg-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="font-semibold text-emerald-800">Scraping completed</span>
              <span className="text-emerald-700">Found: <b>{scrapeResult.found}</b></span>
              <span className="text-emerald-700">Imported: <b>{scrapeResult.imported}</b></span>
              <span className="text-amber-700">Skipped: <b>{scrapeResult.skipped}</b></span>
              <span className="text-red-600">Errored: <b>{scrapeResult.errored}</b></span>
            </div>
            <button onClick={() => setScrapeResult(null)} className="text-muted hover:text-text"><X size={14} /></button>
          </div>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total prospects',     value: sellers.length,                                           icon: Users },
          { label: 'With contact',        value: sellers.filter(s => s.contact_email).length,              icon: CheckCircle2 },
          { label: 'With matches',        value: Object.keys(matchCounts).length,                          icon: Building2 },
          { label: 'Fully enriched (≥75)',value: sellers.filter(s => enrichmentScore(s) >= 75).length,     icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
                <Icon size={17} className="text-[#2563EB]" />
              </div>
              <div>
                <div className="text-xl font-bold text-text">{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller, brand, URL..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
            </div>
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
              <option value="">All tiers</option>
              {tiers.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
              <option value="">All countries</option>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="self-center text-xs text-muted">{filtered.length} / {sellers.length}</span>
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-muted text-sm">Loading prospects…</div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-3 py-2.5">Seller</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Tier</th>
                      <th className="px-3 py-2.5">Contact</th>
                      <th className="px-3 py-2.5">Enrichment</th>
                      <th className="px-3 py-2.5 text-right">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 300).map(s => {
                      const isSelected = selected?.seller_id === s.seller_id
                      const score = enrichmentScore(s)
                      return (
                        <tr key={s.seller_id} onClick={() => setSelected(isSelected ? null : s)}
                          className={`border-t border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-xs text-text">{s.seller_name}</div>
                            {s.brand_name && <div className="text-xs text-muted">{s.brand_name}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted">{s.categories ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            {s.brand_tier
                              ? <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${TIER_COLORS[s.brand_tier?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'}`}>{s.brand_tier}</span>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {s.contact_email
                              ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Found</span>
                              : <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} /> None</span>}
                          </td>
                          <td className="px-3 py-2.5 min-w-[100px]">
                            <EnrichmentBar score={score} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-[#2563EB]">{matchCounts[s.seller_id] ?? 0}</span>
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

        {/* Seller detail drawer */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.seller_id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.15 }}
              className="card space-y-4 overflow-y-auto max-h-[600px]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-text">{selected.seller_name}</h3>
                  {selected.brand_name && <p className="text-xs text-muted">{selected.brand_name}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 text-muted"><X size={14} /></button>
              </div>

              {selected.seller_url && (
                <a href={selected.seller_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#2563EB] flex items-center gap-1 hover:underline">
                  <ExternalLink size={11} /> {selected.seller_url}
                </a>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Country',   selected.country_origin],
                  ['Language',  selected.seller_language],
                  ['Tier',      selected.brand_tier],
                  ['Size',      selected.brand_size],
                  ['Products',  selected.nb_products?.toLocaleString()],
                  ['Avg price', selected.avg_price ? `€${Number(selected.avg_price).toFixed(0)}` : null],
                  ['Rating',    selected.rating ? `${selected.rating} ★` : null],
                  ['Ships intl', selected.ships_international ? 'Yes' : 'No'],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-muted">{k}</div>
                    <div className="font-medium text-text">{v}</div>
                  </div>
                ))}
              </div>

              {selected.brand_story_summary && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Brand story</div>
                  <p className="text-xs text-text leading-relaxed">{selected.brand_story_summary}</p>
                </div>
              )}

              {selected.key_aesthetic && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Aesthetic</div>
                  <p className="text-xs text-text">{selected.key_aesthetic}</p>
                </div>
              )}

              {selected.top_product_tags && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Top tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.top_product_tags.split(',').slice(0, 8).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="rounded-lg border border-gray-200 p-2.5 space-y-1">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contact</div>
                {selected.contact_name  && <div className="text-xs font-medium text-text">{selected.contact_name}</div>}
                {selected.contact_email && <a href={`mailto:${selected.contact_email}`} className="text-xs text-[#2563EB] hover:underline">{selected.contact_email}</a>}
                {!selected.contact_email && <div className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} /> No contact found</div>}
              </div>

              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Enrichment completeness</div>
                <EnrichmentBar score={enrichmentScore(selected)} />
              </div>

              <div>
                <div className="text-xs font-semibold text-muted mb-1">Matches</div>
                <div className="text-2xl font-bold text-[#2563EB]">{matchCounts[selected.seller_id] ?? 0}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card border border-dashed border-gray-200 flex flex-col items-center justify-center h-64 text-center">
              <Users size={28} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium text-text">Select a prospect</p>
              <p className="text-xs text-muted mt-1">Click a row to view full profile</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text text-lg">Add Manual Prospect</h3>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-muted"><X size={16} /></button>
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'seller_name',    label: 'Seller name *',  placeholder: 'Ex: Brand SARL' },
                  { key: 'seller_url',     label: 'Website URL *',  placeholder: 'https://...' },
                  { key: 'categories',     label: 'Category',       placeholder: 'mode, beauté…' },
                  { key: 'country_origin', label: 'Country',        placeholder: 'FR, DE…' },
                  { key: 'contact_name',   label: 'Contact name',   placeholder: 'Jean Dupont' },
                  { key: 'contact_email',  label: 'Contact email',  placeholder: 'j.dupont@…' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className={key === 'seller_url' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                    <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brand tier</label>
                  <select value={form.brand_tier} onChange={e => setForm(f => ({ ...f, brand_tier: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                    <option value="">—</option>
                    {['luxury', 'premium', 'mid', 'budget'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={addProspect} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-60 transition-colors">
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  {saving ? 'Saving…' : 'Add Prospect'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
