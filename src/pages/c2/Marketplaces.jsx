import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowLeftRight, X, TrendingUp, Users, Globe, Percent, Building2, Star, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchMarketplaces, fetchMatches, fitBandLabel, fitBandColor } from '../../lib/c2'

export default function C2Marketplaces() {
  const [marketplaces, setMarketplaces] = useState([])
  const [matches, setMatches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)
  const [compareA, setCompareA]         = useState(null)
  const [compareB, setCompareB]         = useState(null)
  const [mode, setMode]                 = useState('directory') // 'directory' | 'compare'

  async function load() {
    setLoading(true)
    const [m, mx] = await Promise.all([fetchMarketplaces(), fetchMatches({ limit: 2000 })])
    setMarketplaces(m.data)
    setMatches(mx.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Per-marketplace stats derived from matches
  const mpStats = useMemo(() => {
    const stats = {}
    for (const m of matches) {
      const id = m.marketplace_id
      if (!stats[id]) stats[id] = { count: 0, highFit: 0, totalScore: 0 }
      stats[id].count++
      stats[id].totalScore += m.compatibility_score ?? 0
      if ((m.compatibility_score ?? 0) >= 80) stats[id].highFit++
    }
    for (const id in stats) {
      stats[id].avgScore = stats[id].count ? stats[id].totalScore / stats[id].count : 0
    }
    return stats
  }, [matches])

  const enriched = useMemo(() => marketplaces.map(mp => ({
    ...mp,
    ...(mpStats[mp.marketplace_id] ?? { count: 0, highFit: 0, avgScore: 0 }),
  })), [marketplaces, mpStats])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return enriched.filter(mp => {
      if (s) return mp.marketplace_name?.toLowerCase().includes(s) || mp.main_categories?.toLowerCase().includes(s)
      return true
    })
  }, [enriched, search])

  const selectedMatches = useMemo(() =>
    selected ? matches.filter(m => m.marketplace_id === selected.marketplace_id).sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0)) : [],
    [selected, matches])

  // Chart data
  const chartData = enriched
    .filter(mp => mp.count > 0)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 12)
    .map(mp => ({ name: mp.marketplace_name?.replace(/ /g, '\n'), avg: parseFloat(mp.avgScore.toFixed(1)), count: mp.count }))

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">Marketplaces</h1>
          <p className="text-sm text-muted mt-0.5">Intelligence directory · Comparison · Fit volume</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode(mode === 'directory' ? 'compare' : 'directory')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === 'compare' ? 'bg-[#2563EB] text-white' : 'btn-secondary'}`}>
            <ArrowLeftRight size={13} /> {mode === 'compare' ? 'Exit Compare' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {/* Avg score chart */}
      {!loading && chartData.length > 0 && (
        <div className="card">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Average compatibility score by marketplace</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}`, 'Avg score']} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={_ .avg >= 75 ? '#2563EB' : _.avg >= 65 ? '#60a5fa' : '#bfdbfe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Directory */}
        <div className="xl:col-span-2 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search marketplace or category..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>

          {loading ? (
            <div className="card text-center text-muted text-sm py-10">Loading marketplaces…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(mp => {
                const isSelected = selected?.marketplace_id === mp.marketplace_id
                const isCompareA = compareA?.marketplace_id === mp.marketplace_id
                const isCompareB = compareB?.marketplace_id === mp.marketplace_id

                return (
                  <motion.div key={mp.marketplace_id} whileHover={{ y: -2 }}
                    onClick={() => mode === 'directory' ? setSelected(isSelected ? null : mp) : null}
                    className={`card cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text text-sm truncate">{mp.marketplace_name}</div>
                        <div className="text-xs text-muted mt-0.5 line-clamp-1">{mp.main_categories ?? '—'}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-[#2563EB]">{mp.avgScore?.toFixed(0) ?? '—'}</div>
                        <div className="text-[10px] text-muted">avg score</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center rounded-lg bg-gray-50 p-1.5">
                        <div className="font-bold text-text">{mp.count}</div>
                        <div className="text-muted">Matches</div>
                      </div>
                      <div className="text-center rounded-lg bg-gray-50 p-1.5">
                        <div className="font-bold text-emerald-600">{mp.highFit}</div>
                        <div className="text-muted">High fit</div>
                      </div>
                      <div className="text-center rounded-lg bg-gray-50 p-1.5">
                        <div className="font-bold text-text">{mp.commission_rate != null ? `${(mp.commission_rate * 100).toFixed(0)}%` : '—'}</div>
                        <div className="text-muted">Commission</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1"><Globe size={10} /> {mp.countries ?? '—'}</span>
                      <span>{mp.monthly_traffic ?? '—'}</span>
                    </div>

                    {mode === 'compare' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setCompareA(mp) }}
                          className={`flex-1 py-1 rounded text-xs font-semibold ${isCompareA ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'}`}>
                          A
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setCompareB(mp) }}
                          className={`flex-1 py-1 rounded text-xs font-semibold ${isCompareB ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-100'}`}>
                          B
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail / Compare panel */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'compare' && compareA && compareB ? (
              <ComparePanel key="compare" a={compareA} b={compareB} matches={matches} onClose={() => { setCompareA(null); setCompareB(null) }} />
            ) : selected ? (
              <MarketplaceDetail key={selected.marketplace_id} mp={selected} topMatches={selectedMatches.slice(0, 10)} onClose={() => setSelected(null)} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card border border-dashed border-gray-200 flex flex-col items-center justify-center h-48 text-center">
                <Building2 size={26} className="text-gray-300 mb-2" />
                <p className="text-sm font-medium text-text">{mode === 'compare' ? 'Select A and B to compare' : 'Select a marketplace'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function MarketplaceDetail({ mp, topMatches, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="card space-y-4 overflow-y-auto max-h-[700px]">
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-text">{mp.marketplace_name}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-muted"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Categories',   mp.main_categories],
          ['Countries',    mp.countries],
          ['Traffic',      mp.monthly_traffic],
          ['Commission',   mp.commission_rate != null ? `${(mp.commission_rate * 100).toFixed(0)}%` : null],
          ['Matched sellers', mp.count],
          ['High fit',     mp.highFit],
          ['Avg score',    mp.avgScore?.toFixed(1)],
        ].filter(([,v]) => v != null).map(([k, v]) => (
          <div key={k}>
            <div className="text-muted">{k}</div>
            <div className="font-semibold text-text">{v}</div>
          </div>
        ))}
      </div>

      {topMatches.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Top matched sellers</div>
          <div className="space-y-1.5">
            {topMatches.map(m => (
              <div key={`${m.seller_id}|${m.marketplace_id}`} className="flex items-center justify-between text-xs rounded-lg bg-gray-50 px-2.5 py-1.5">
                <span className="font-medium text-text">{m.seller_name}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${fitBandColor(m.compatibility_score)}`}>
                  {Number(m.compatibility_score ?? 0).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function ComparePanel({ a, b, matches, onClose }) {
  const statsA = matches.filter(m => m.marketplace_id === a.marketplace_id)
  const statsB = matches.filter(m => m.marketplace_id === b.marketplace_id)
  const avgA = statsA.length ? statsA.reduce((s, m) => s + (m.compatibility_score ?? 0), 0) / statsA.length : 0
  const avgB = statsB.length ? statsB.reduce((s, m) => s + (m.compatibility_score ?? 0), 0) / statsB.length : 0

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text text-sm">Comparison</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-muted"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[{ mp: a, stats: statsA, avg: avgA, color: 'text-blue-600', bg: 'bg-blue-50' },
          { mp: b, stats: statsB, avg: avgB, color: 'text-purple-600', bg: 'bg-purple-50' }].map(({ mp, stats, avg, color, bg }) => (
          <div key={mp.marketplace_id} className={`rounded-xl p-3 ${bg} space-y-2`}>
            <div className={`font-bold text-sm ${color}`}>{mp.marketplace_name}</div>
            <div className="space-y-1 text-xs">
              <div><span className="text-muted">Avg score:</span> <b>{avg.toFixed(1)}</b></div>
              <div><span className="text-muted">Matches:</span> <b>{stats.length}</b></div>
              <div><span className="text-muted">High fit:</span> <b>{stats.filter(m => (m.compatibility_score ?? 0) >= 80).length}</b></div>
              <div><span className="text-muted">Commission:</span> <b>{mp.commission_rate != null ? `${(mp.commission_rate * 100).toFixed(0)}%` : '—'}</b></div>
              <div><span className="text-muted">Traffic:</span> <b>{mp.monthly_traffic ?? '—'}</b></div>
              <div><span className="text-muted">Categories:</span> <b className="line-clamp-2">{mp.main_categories ?? '—'}</b></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-3 text-xs text-text">
        <div className="font-semibold mb-1.5 text-muted uppercase tracking-wide text-[10px]">Analysis</div>
        {avgA >= avgB
          ? <p><b>{a.marketplace_name}</b> shows a higher average compatibility score ({avgA.toFixed(1)} vs {avgB.toFixed(1)}), suggesting better seller-market alignment overall.</p>
          : <p><b>{b.marketplace_name}</b> shows a higher average compatibility score ({avgB.toFixed(1)} vs {avgA.toFixed(1)}), suggesting better seller-market alignment overall.</p>
        }
        {Math.abs(avgA - avgB) < 3 && (
          <p className="mt-1 text-muted">The scores are close — consider commission rates and traffic volume as the deciding factors.</p>
        )}
      </div>
    </motion.div>
  )
}
