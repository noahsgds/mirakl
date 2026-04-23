import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Shield, ChevronRight, X, CheckCircle2, AlertCircle,
  Linkedin, ExternalLink, TrendingUp, Tag, Users, MessageSquare,
  Crosshair, Zap, ArrowRight, Trophy, Swords,
} from 'lucide-react'
import { fetchMatches, fetchSellers, fitBandLabel, fitBandColor, readinessLabel, readinessColor } from '../../lib/c2'

/* ── Evidence card helper ───────────────────────────── */
function EvidenceCard({ title, explanation, field, strength }) {
  const strengthColor = strength === 'strong' ? 'border-emerald-200 bg-emerald-50'
    : strength === 'medium' ? 'border-amber-200 bg-amber-50'
    : 'border-gray-200 bg-gray-50'
  const dot = strength === 'strong' ? 'bg-emerald-500' : strength === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
  return (
    <div className={`rounded-xl border p-3 space-y-1 ${strengthColor}`}>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <div className="text-xs font-semibold text-text">{title}</div>
      </div>
      <p className="text-xs text-text/80 leading-relaxed pl-3.5">{explanation}</p>
      {field && <div className="text-[10px] text-muted pl-3.5">from: {field}</div>}
    </div>
  )
}

/* ── Score ring ─────────────────────────────────────── */
function ScoreRing({ score, size = 80 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const filled = ((score ?? 0) / 100) * circ
  const color = (score ?? 0) >= 80 ? '#10b981' : (score ?? 0) >= 65 ? '#2563EB' : '#f59e0b'
  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-text">{score != null ? Number(score).toFixed(0) : '—'}</span>
      </div>
    </div>
  )
}

/* ── Match Defense Mode ─────────────────────────────── */
function MatchDefenseMode({ winner, challenger, seller }) {
  function parseSignals(match) {
    const signals = []
    if (match.rationale) signals.push({ title: 'Commercial alignment', explanation: match.rationale?.slice(0, 180), strength: 'strong', field: 'rationale' })
    if (match['Top 3 products to push for each marketplace']) signals.push({ title: 'Product fit', explanation: match['Top 3 products to push for each marketplace']?.slice(0, 140), strength: 'medium', field: 'top_products' })
    if ((match.compatibility_score ?? 0) >= 80) signals.push({ title: 'High compatibility score', explanation: `Score of ${Number(match.compatibility_score).toFixed(1)}/100 — top-tier fit.`, strength: 'strong', field: 'compatibility_score' })
    if (match.decision_maker_email) signals.push({ title: 'Decision maker identified', explanation: `${match.decision_maker_name ?? 'Contact'} reachable at ${match.decision_maker_email}.`, strength: 'strong', field: 'decision_maker' })
    if (!match.decision_maker_email) signals.push({ title: 'No contact found', explanation: 'Enrichment needed before outreach can begin.', strength: 'weak', field: 'decision_maker' })
    return signals
  }

  const winnerSignals    = parseSignals(winner)
  const challengerSignals = parseSignals(challenger)

  const objections = [
    'Already present on a competing marketplace',
    'Commission rate may be above current margin tolerance',
    'Integration effort for a new marketplace platform',
    'Uncertainty about audience fit or brand positioning',
  ]

  const persuasion = winner.rationale
    ? `Focus on the specific category alignment and audience overlap. Lead with the score (${Number(winner.compatibility_score ?? 0).toFixed(0)}/100) as social proof of fit, then use the top products as concrete anchors for the commercial conversation.`
    : `Lead with the marketplace traffic and the seller's existing product-market fit. Frame the opportunity as a low-risk expansion with clear upside.`

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center">
          <Swords size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-text">Match Defense Mode</h3>
          <p className="text-xs text-muted">Why {winner.marketplace_name} wins — and what the challenger misses</p>
        </div>
      </div>

      {/* Split panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Winner */}
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-emerald-600" />
              <span className="font-bold text-emerald-800 text-sm">Why {winner.marketplace_name} wins</span>
            </div>
            <ScoreRing score={winner.compatibility_score} size={56} />
          </div>
          <div className="space-y-2">
            {winnerSignals.map((s, i) => <EvidenceCard key={i} {...s} />)}
          </div>
        </div>

        {/* Challenger */}
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRight size={16} className="text-gray-500" />
              <span className="font-bold text-gray-600 text-sm">Challenger: {challenger.marketplace_name}</span>
            </div>
            <ScoreRing score={challenger.compatibility_score} size={56} />
          </div>
          <div className="space-y-2">
            {challengerSignals.map((s, i) => <EvidenceCard key={i} {...s} />)}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-text">
            <div className="font-semibold text-muted text-[10px] uppercase tracking-wide mb-1">Why it doesn't win</div>
            <p>Score differential of {Math.abs(Number(winner.compatibility_score ?? 0) - Number(challenger.compatibility_score ?? 0)).toFixed(1)} points. {challenger.rationale ? `${challenger.rationale.slice(0, 120)}…` : 'Weaker alignment on category and product type dimensions.'}</p>
          </div>
        </div>
      </div>

      {/* Objections + Persuasion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle size={12} /> Likely seller objections
          </div>
          <div className="space-y-1.5">
            {objections.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text">
                <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                {o}
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare size={12} /> Persuasion strategy
          </div>
          <p className="text-xs text-text leading-relaxed">{persuasion}</p>
          <div className="rounded-lg bg-[#2563EB]/5 border border-[#2563EB]/10 p-2.5 text-xs text-[#2563EB] font-medium">
            Recommended CTA: "Let's explore how {winner.marketplace_name} can accelerate your {seller?.categories ?? 'product'} GMV in 90 days."
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main page ──────────────────────────────────────── */
export default function C2Matching() {
  const [matches, setMatches]   = useState([])
  const [sellers, setSellers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState(null)
  const [activeMatchId, setActiveMatchId] = useState(null)
  const [defenseMode, setDefenseMode] = useState(false)

  async function load() {
    setLoading(true)
    const [m, s] = await Promise.all([fetchMatches({ limit: 2000 }), fetchSellers()])
    setMatches(m.data)
    setSellers(s.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Unique sellers that have matches
  const sellerList = useMemo(() => {
    const ids = [...new Set(matches.map(m => m.seller_id))]
    const sellerMap = Object.fromEntries(sellers.map(s => [s.seller_id, s]))
    const s = search.trim().toLowerCase()
    return ids
      .map(id => sellerMap[id] ?? { seller_id: id, seller_name: matches.find(m => m.seller_id === id)?.seller_name ?? id })
      .filter(s2 => !s || s2.seller_name?.toLowerCase().includes(s))
      .sort((a, b) => (a.seller_name ?? '').localeCompare(b.seller_name ?? ''))
  }, [matches, sellers, search])

  const selectedSeller = useMemo(() => sellers.find(s => s.seller_id === selectedSellerId) ?? null, [sellers, selectedSellerId])

  // Ranked matches for selected seller
  const rankedMatches = useMemo(() => {
    if (!selectedSellerId) return []
    return matches
      .filter(m => m.seller_id === selectedSellerId)
      .sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0))
  }, [matches, selectedSellerId])

  const activeMatch = useMemo(() => {
    if (activeMatchId) return rankedMatches.find(m => m.marketplace_id === activeMatchId) ?? rankedMatches[0]
    return rankedMatches[0] ?? null
  }, [rankedMatches, activeMatchId])

  const challenger = useMemo(() => rankedMatches.find(m => m.marketplace_id !== activeMatch?.marketplace_id) ?? null, [rankedMatches, activeMatch])

  function selectSeller(id) {
    setSelectedSellerId(id)
    setActiveMatchId(null)
    setDefenseMode(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Matching & Reasoning</h1>
          <p className="text-sm text-muted mt-0.5">Score breakdown · Evidence · Match Defense Mode</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Seller selector (1/4) */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search sellers..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          {loading ? (
            <div className="text-center text-muted text-sm py-6">Loading…</div>
          ) : (
            <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1">
              {sellerList.slice(0, 150).map(s => (
                <button key={s.seller_id}
                  onClick={() => selectSeller(s.seller_id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedSellerId === s.seller_id ? 'bg-[#2563EB] text-white' : 'hover:bg-gray-100 text-text'}`}>
                  <div className="font-medium text-xs truncate">{s.seller_name}</div>
                  {s.categories && (
                    <div className={`text-[10px] mt-0.5 truncate ${selectedSellerId === s.seller_id ? 'text-blue-200' : 'text-muted'}`}>{s.categories}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content (3/4) */}
        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            {!selectedSellerId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card border border-dashed border-gray-200 flex flex-col items-center justify-center h-80 text-center">
                <Crosshair size={32} className="text-gray-300 mb-3" />
                <p className="font-medium text-text">Select a seller</p>
                <p className="text-xs text-muted mt-1">View ranked marketplace matches, evidence, and reasoning</p>
              </motion.div>
            ) : (
              <motion.div key={selectedSellerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Seller header */}
                <div className="card">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-bold text-text text-lg">{selectedSeller?.seller_name}</h2>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted">
                        {selectedSeller?.categories && <span className="flex items-center gap-1"><Tag size={10} /> {selectedSeller.categories}</span>}
                        {selectedSeller?.country_origin && <span className="flex items-center gap-1"><Zap size={10} /> {selectedSeller.country_origin}</span>}
                        {selectedSeller?.brand_tier && <span className="flex items-center gap-1"><TrendingUp size={10} /> {selectedSeller.brand_tier}</span>}
                        {selectedSeller?.nb_products != null && <span><span className="font-medium text-text">{selectedSeller.nb_products}</span> products</span>}
                      </div>
                    </div>
                    <div className="text-xs text-muted">
                      <span className="font-bold text-[#2563EB] text-lg">{rankedMatches.length}</span> marketplace matches
                    </div>
                  </div>
                  {selectedSeller?.brand_story_summary && (
                    <p className="text-xs text-text leading-relaxed mt-3 border-t border-gray-100 pt-3 line-clamp-3">{selectedSeller.brand_story_summary}</p>
                  )}
                </div>

                {/* Ranked match list */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {rankedMatches.slice(0, 9).map((m, i) => {
                    const isActive = activeMatch?.marketplace_id === m.marketplace_id
                    return (
                      <motion.button key={m.marketplace_id} whileHover={{ y: -2 }}
                        onClick={() => { setActiveMatchId(m.marketplace_id); setDefenseMode(false) }}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${isActive ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && <Trophy size={12} className="text-amber-500 flex-shrink-0" />}
                            <span className="font-semibold text-xs text-text truncate">{m.marketplace_name}</span>
                          </div>
                          <ScoreRing score={m.compatibility_score} size={42} />
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${fitBandColor(m.compatibility_score)}`}>{fitBandLabel(m.compatibility_score)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${readinessColor(m)}`}>{readinessLabel(m)}</span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Active match detail + Defense mode toggle */}
                {activeMatch && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-text flex items-center gap-2">
                        <Crosshair size={15} className="text-[#2563EB]" />
                        {activeMatch.marketplace_name}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fitBandColor(activeMatch.compatibility_score)}`}>
                          {fitBandLabel(activeMatch.compatibility_score)}
                        </span>
                      </div>
                      {challenger && (
                        <button
                          onClick={() => setDefenseMode(d => !d)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${defenseMode ? 'bg-[#2563EB] text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-[#2563EB]/10 hover:text-[#2563EB]'}`}>
                          <Swords size={13} />
                          Match Defense Mode
                        </button>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {defenseMode && challenger ? (
                        <MatchDefenseMode key="defense" winner={activeMatch} challenger={challenger} seller={selectedSeller} />
                      ) : (
                        <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Evidence */}
                          <div className="card space-y-3">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evidence</div>
                            {[
                              activeMatch.rationale && { title: 'Commercial rationale', explanation: activeMatch.rationale, strength: 'strong', field: 'rationale' },
                              activeMatch['Top 3 products to push for each marketplace'] && { title: 'Top products', explanation: activeMatch['Top 3 products to push for each marketplace'], strength: 'medium', field: 'top_products' },
                              (activeMatch.compatibility_score ?? 0) >= 80 && { title: 'High compatibility', explanation: `${Number(activeMatch.compatibility_score).toFixed(1)}/100 — top quartile.`, strength: 'strong', field: 'score' },
                              activeMatch.decision_maker_email && { title: 'Contact confirmed', explanation: `${activeMatch.decision_maker_name ?? 'Decision maker'} reachable.`, strength: 'strong', field: 'decision_maker' },
                              !activeMatch.decision_maker_email && { title: 'Contact missing', explanation: 'No decision maker found. Enrichment required.', strength: 'weak', field: 'decision_maker' },
                            ].filter(Boolean).map((e, i) => <EvidenceCard key={i} {...e} />)}
                          </div>

                          {/* Reasoning + Contact */}
                          <div className="space-y-4">
                            <div className="card space-y-3">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact confidence</div>
                              {activeMatch.decision_maker_name ? (
                                <div className="space-y-1.5">
                                  <div className="font-semibold text-sm text-text">{activeMatch.decision_maker_name}</div>
                                  {activeMatch.decision_maker_title && <div className="text-xs text-muted">{activeMatch.decision_maker_title}</div>}
                                  <div className="flex items-center gap-2">
                                    {activeMatch.decision_maker_email && (
                                      <a href={`mailto:${activeMatch.decision_maker_email}`} className="text-xs text-[#2563EB] hover:underline">{activeMatch.decision_maker_email}</a>
                                    )}
                                    {activeMatch.decision_maker_linkedin && (
                                      <a href={activeMatch.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2]"><Linkedin size={13} /></a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                                    <CheckCircle2 size={12} /> Decision maker confirmed — ready to send
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                                  <AlertCircle size={13} /> No decision maker found
                                </div>
                              )}
                            </div>

                            <div className="card space-y-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Readiness</div>
                              <div className="space-y-1.5 text-xs">
                                {[
                                  [activeMatch.rationale, 'Rationale', true],
                                  [activeMatch['Top 3 products to push for each marketplace'], 'Top products', true],
                                  [activeMatch.decision_maker_email, 'Contact found', true],
                                  [activeMatch.compatibility_score != null, 'Score available', true],
                                ].map(([val, label]) => (
                                  <div key={label} className="flex items-center justify-between">
                                    <span className="text-muted">{label}</span>
                                    {val
                                      ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> OK</span>
                                      : <span className="flex items-center gap-1 text-red-400"><AlertCircle size={11} /> Missing</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
