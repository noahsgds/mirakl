import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mail,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Rocket,
  Linkedin,
  Building2,
  Sparkles,
  FileText,
  Clock,
  Filter,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const WEBHOOK_URL = 'https://noahsgds.app.n8n.cloud/webhook/lancer-sequence'
const AUTO_REFRESH_MS = 60_000

const STATUS_TABS = [
  { key: 'all',               label: 'Tous',             color: 'bg-gray-100 text-gray-700' },
  { key: 'scored',            label: 'Scorés',           color: 'bg-indigo-50 text-indigo-700' },
  { key: 'pending_selection', label: 'À valider',        color: 'bg-amber-50 text-amber-700' },
  { key: 'sequence_en_cours', label: 'Séquence en cours',color: 'bg-blue-50 text-blue-700' },
  { key: 'sequence_terminee', label: 'Séquence terminée',color: 'bg-green-50 text-green-700' },
  { key: 'failed',            label: 'Échecs',           color: 'bg-red-50 text-red-700' },
]

const PHASES = [
  { key: 'j0', phase: 1, label: 'J0',   sub: 'Premier contact',  column: 'selected_variant_j0' },
  { key: 'j3', phase: 2, label: 'J+3',  sub: 'Relance 1',        column: 'selected_variant_j3' },
  { key: 'j6', phase: 3, label: 'J+6',  sub: 'Relance 2',        column: 'selected_variant_j6' },
]

function scoreColor(s) {
  if (s == null) return 'bg-gray-100 text-gray-600'
  if (s >= 80) return 'bg-green-100 text-green-700'
  if (s >= 70) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function StatutBadge({ statut }) {
  const map = {
    scored:             { bg: 'bg-indigo-50',  text: 'text-indigo-700',  label: 'Scoré' },
    pending_selection:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'À valider' },
    sequence_en_cours:  { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Séquence en cours' },
    sequence_terminee:  { bg: 'bg-green-50',   text: 'text-green-700',   label: 'Terminée' },
    generation_failed:  { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Génération échouée' },
    enrichment_failed:  { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Enrichissement échoué' },
  }
  const m = map[statut] || { bg: 'bg-gray-100', text: 'text-gray-700', label: statut || '—' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  )
}

function Toast({ toast, onClose }) {
  if (!toast) return null
  const palette = toast.kind === 'error'
    ? 'bg-red-600 text-white'
    : toast.kind === 'info'
      ? 'bg-[#1B3A5C] text-white'
      : 'bg-green-600 text-white'
  const Icon = toast.kind === 'error' ? AlertCircle : toast.kind === 'info' ? Loader2 : CheckCircle2
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${palette} rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[260px]`}>
      <Icon size={18} className={toast.kind === 'info' ? 'animate-spin' : ''} />
      <span className="text-sm font-medium flex-1">{toast.msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

export default function CampagneEmail() {
  const [matches, setMatches] = useState([])
  const [emailsBySeller, setEmailsBySeller] = useState({}) // key: seller_id|marketplace_id
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [minScore, setMinScore] = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [toast, setToast] = useState(null)
  const toastRef = useRef()

  function showToast(kind, msg, ttl = 3000) {
    setToast({ kind, msg })
    clearTimeout(toastRef.current)
    if (ttl) toastRef.current = setTimeout(() => setToast(null), ttl)
  }

  async function loadAll() {
    setRefreshing(true)
    const [matchesRes, emailsRes] = await Promise.all([
      supabase
        .from('seller_marketplace_matches')
        .select('*')
        .order('compatibility_score', { ascending: false })
        .limit(1000),
      supabase
        .from('seller_emails_campagne_1')
        .select('*'),
    ])

    if (matchesRes.error) {
      showToast('error', 'Erreur chargement matches : ' + matchesRes.error.message)
    } else {
      setMatches(matchesRes.data || [])
    }

    if (!emailsRes.error) {
      const map = {}
      for (const row of emailsRes.data || []) {
        map[`${row.seller_id}|${row.marketplace_id}`] = row
      }
      setEmailsBySeller(map)
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, AUTO_REFRESH_MS)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stats
  const stats = useMemo(() => {
    const total = matches.length
    const avgScore = total ? matches.reduce((a, m) => a + (m.compatibility_score || 0), 0) / total : 0
    const enriched = matches.filter((m) => m.enriched).length
    const withEmails = matches.filter((m) => emailsBySeller[`${m.seller_id}|${m.marketplace_id}`]).length
    return { total, avgScore, enriched, withEmails }
  }, [matches, emailsBySeller])

  // Filter pipeline
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return matches.filter((m) => {
      if (tab !== 'all') {
        if (tab === 'failed') {
          if (!['generation_failed', 'enrichment_failed'].includes(m.statut)) return false
        } else if (m.statut !== tab) return false
      }
      if (minScore !== '' && (m.compatibility_score ?? 0) < parseFloat(minScore)) return false
      if (s) {
        const hay = `${m.seller_name || ''} ${m.marketplace_name || ''} ${m.decision_maker_name || ''} ${m.decision_maker_email || ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [matches, search, tab, minScore])

  // Counts per tab
  const tabCounts = useMemo(() => {
    const counts = { all: matches.length, failed: 0 }
    for (const m of matches) {
      counts[m.statut] = (counts[m.statut] || 0) + 1
      if (['generation_failed', 'enrichment_failed'].includes(m.statut)) counts.failed++
    }
    return counts
  }, [matches])

  function openDrawer(match) {
    const email = emailsBySeller[`${match.seller_id}|${match.marketplace_id}`]
    setSelectedMatch({ ...match, email })
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Mail size={22} className="text-[#1B3A5C]" />
            Campagne Email
          </h1>
          <p className="text-muted text-sm mt-0.5">
            Validation des séquences email générées pour les matchs seller × marketplace
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Sparkles}  label="Matchs scorés"           value={stats.total}                        color="indigo" />
        <KpiCard icon={FileText}  label="Score moyen"             value={stats.avgScore.toFixed(1)}           color="blue" />
        <KpiCard icon={Building2} label="Avec décideur"           value={stats.enriched}                     color="amber" />
        <KpiCard icon={Mail}      label="Emails générés"          value={stats.withEmails}                   color="green" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const count = tabCounts[t.key] ?? 0
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                active ? 'bg-[#1B3A5C] text-white shadow' : `${t.color} hover:shadow-sm`
              }`}
            >
              {t.label}
              <span className={`text-xs rounded-full px-1.5 min-w-[1.25rem] text-center ${active ? 'bg-white/20' : 'bg-white/60'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + filter bar */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher seller, marketplace, décideur, email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20"
            >
              <option value="">Score : tous</option>
              <option value="90">≥ 90</option>
              <option value="80">≥ 80</option>
              <option value="70">≥ 70</option>
              <option value="60">≥ 60</option>
            </select>
          </div>
          <div className="text-sm text-muted">
            <strong className="text-text">{filtered.length}</strong> / {matches.length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Chargement des matchs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Aucun match ne correspond aux filtres.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Seller × Marketplace</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3">Décideur</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Emails</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const key = `${m.seller_id}|${m.marketplace_id}`
                  const email = emailsBySeller[key]
                  const variantsSelected = email
                    ? [email.selected_variant_j0, email.selected_variant_j3, email.selected_variant_j6].filter(Boolean).length
                    : 0
                  return (
                    <tr key={key} className="border-t border-gray-100 hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{m.seller_name || '—'}</div>
                        <div className="text-xs text-muted flex items-center gap-1">
                          <Building2 size={11} />
                          {m.marketplace_name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${scoreColor(m.compatibility_score)}`}>
                          {m.compatibility_score != null ? Number(m.compatibility_score).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.decision_maker_name ? (
                          <div>
                            <div className="font-medium text-text flex items-center gap-1.5">
                              {m.decision_maker_name}
                              {m.decision_maker_linkedin && (
                                <a
                                  href={m.decision_maker_linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#0A66C2] hover:text-[#0056a0]"
                                >
                                  <Linkedin size={12} />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-muted truncate max-w-[260px]">
                              {m.decision_maker_title || ''}{m.decision_maker_title && m.decision_maker_email ? ' · ' : ''}{m.decision_maker_email || ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Pas enrichi</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={m.statut} />
                      </td>
                      <td className="px-4 py-3">
                        {email ? (
                          <span className="text-xs text-muted">
                            {variantsSelected}/3 variants choisis
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Pas encore générés</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openDrawer(m)}
                          disabled={!email}
                          className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          title={email ? 'Voir les emails' : 'Aucun email généré'}
                        >
                          Voir les emails
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMatch && (
        <MatchDrawer
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onEmailUpdate={(newEmail) => {
            const k = `${newEmail.seller_id}|${newEmail.marketplace_id}`
            setEmailsBySeller((m) => ({ ...m, [k]: newEmail }))
            setSelectedMatch((sm) => (sm ? { ...sm, email: newEmail } : sm))
          }}
          onSequenceLaunched={(seller_id, marketplace_id) => {
            setMatches((prev) =>
              prev.map((x) =>
                x.seller_id === seller_id && x.marketplace_id === marketplace_id
                  ? { ...x, statut: 'sequence_en_cours' }
                  : x
              )
            )
            showToast('success', '🚀 Séquence lancée ! Les emails seront envoyés via n8n.', 4500)
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ---------------------------- KPI ---------------------------- */

function KpiCard({ icon: Icon, label, value, color }) {
  const palette = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
    green:  'bg-green-50 text-green-600',
  }[color] || 'bg-gray-100 text-gray-600'
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${palette}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold text-text leading-tight">{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------- Drawer (VUE 2) ------------------------- */

function MatchDrawer({ match, onClose, onEmailUpdate, onSequenceLaunched, showToast }) {
  const initial = match.email || {}
  const [selections, setSelections] = useState({
    j0: initial.selected_variant_j0 || null,
    j3: initial.selected_variant_j3 || null,
    j6: initial.selected_variant_j6 || null,
  })
  const [savingPhase, setSavingPhase] = useState(null)
  const [launching, setLaunching] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const allSelected = selections.j0 && selections.j3 && selections.j6
  const email = match.email
  const canLaunch = allSelected && !launching && match.statut !== 'sequence_en_cours' && match.statut !== 'sequence_terminee'

  async function updateSelection(phaseKey, variant) {
    const column = PHASES.find((p) => p.key === phaseKey).column
    setSelections((s) => ({ ...s, [phaseKey]: variant }))
    setSavingPhase(phaseKey)

    const { data, error } = await supabase
      .from('seller_emails_campagne_1')
      .update({ [column]: variant, updated_at: new Date().toISOString() })
      .eq('seller_id', match.seller_id)
      .eq('marketplace_id', match.marketplace_id)
      .select()
      .single()

    setSavingPhase(null)
    if (error) {
      showToast('error', `Erreur sauvegarde ${phaseKey.toUpperCase()} : ${error.message}`)
    } else if (data) {
      onEmailUpdate(data)
    }
  }

  async function launchSequence() {
    setLaunching(true)
    showToast('info', 'Lancement de la séquence en cours...', 0)
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: match.seller_id,
          marketplace_id: match.marketplace_id,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      await supabase
        .from('seller_marketplace_matches')
        .update({ statut: 'sequence_en_cours' })
        .eq('seller_id', match.seller_id)
        .eq('marketplace_id', match.marketplace_id)

      onSequenceLaunched(match.seller_id, match.marketplace_id)
      onClose()
    } catch (e) {
      showToast('error', `Échec du lancement : ${e.message}`)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text">{match.seller_name}</h2>
              <span className="text-muted">×</span>
              <span className="font-semibold text-[#1B3A5C] flex items-center gap-1">
                <Building2 size={14} />
                {match.marketplace_name}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${scoreColor(match.compatibility_score)}`}>
                Score {Number(match.compatibility_score || 0).toFixed(1)}
              </span>
              <StatutBadge statut={match.statut} />
            </div>
            {match.decision_maker_name && (
              <div className="text-sm text-muted mt-1 flex flex-wrap items-center gap-3">
                <span className="font-medium text-text">{match.decision_maker_name}</span>
                {match.decision_maker_title && <span>· {match.decision_maker_title}</span>}
                {match.decision_maker_email && (
                  <a href={`mailto:${match.decision_maker_email}`} className="text-[#1B3A5C] hover:underline">
                    {match.decision_maker_email}
                  </a>
                )}
                {match.decision_maker_linkedin && (
                  <a href={match.decision_maker_linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:text-[#0056a0] inline-flex items-center gap-1">
                    <Linkedin size={12} /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={launchSequence}
              disabled={!canLaunch}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                canLaunch
                  ? 'bg-[#E8445A] text-white hover:bg-[#d03b4f] shadow'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title={!allSelected ? 'Sélectionnez les 3 variants d\'abord' : 'Lancer la séquence email'}
            >
              {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {launching ? 'Envoi...' : 'Lancer la séquence email'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Rationale */}
        {match.rationale && (
          <div className="px-6 pt-4">
            <div className="rounded-xl bg-[#1B3A5C]/5 border border-[#1B3A5C]/10 p-4">
              <div className="text-xs font-semibold text-[#1B3A5C] uppercase tracking-wide mb-1">
                Pourquoi ce match ?
              </div>
              <p className="text-sm text-text leading-relaxed">{match.rationale}</p>
            </div>
          </div>
        )}

        {/* Phases */}
        {!email ? (
          <div className="p-12 text-center text-muted">
            <Mail size={36} className="mx-auto mb-3 text-gray-300" />
            <p>Aucun email n'a encore été généré pour ce match.</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PHASES.map((p) => (
              <PhaseCard
                key={p.key}
                phase={p}
                email={email}
                selected={selections[p.key]}
                saving={savingPhase === p.key}
                onSelect={(variant) => updateSelection(p.key, variant)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------- Phase card ---------------------------- */

function PhaseCard({ phase, email, selected, saving, onSelect }) {
  const [variant, setVariant] = useState(selected || 'bref')

  // Follow selected when it changes externally (after save)
  useEffect(() => {
    if (selected) setVariant(selected)
  }, [selected])

  const objet = email[`phase_${phase.phase}_${variant}_objet`]
  const html  = email[`phase_${phase.phase}_${variant}_html`]
  const brefMissing = !email[`phase_${phase.phase}_bref_html`]
  const fullMissing = !email[`phase_${phase.phase}_full_html`]

  return (
    <div className={`rounded-xl border-2 overflow-hidden flex flex-col ${selected ? 'border-[#1B3A5C]' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#1B3A5C]" />
            <span className="font-bold text-text text-sm">{phase.label}</span>
            <span className="text-xs text-muted">· {phase.sub}</span>
          </div>
        </div>
        {selected && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
            <CheckCircle2 size={11} /> {selected}
          </span>
        )}
      </div>

      {/* Bref/Full toggle */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <button
          onClick={() => setVariant('bref')}
          disabled={brefMissing}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
            variant === 'bref' ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${brefMissing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Bref
        </button>
        <button
          onClick={() => setVariant('full')}
          disabled={fullMissing}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
            variant === 'full' ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${fullMissing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Full
        </button>
      </div>

      {/* Subject */}
      <div className="px-4 pt-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Objet</div>
        <div className="text-sm text-text font-medium line-clamp-2" title={objet || ''}>
          {objet || <span className="italic text-gray-400">Aucun objet</span>}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="px-4 pt-2 pb-3 flex-1">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Prévisualisation</div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden h-[280px]">
          {html ? (
            <iframe
              title={`phase-${phase.phase}-${variant}`}
              sandbox=""
              srcDoc={html}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
              Pas de contenu HTML
            </div>
          )}
        </div>
      </div>

      {/* Select button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onSelect(variant)}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            selected === variant
              ? 'bg-green-600 text-white'
              : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'
          } disabled:opacity-60`}
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</>
          ) : selected === variant ? (
            <><CheckCircle2 size={14} /> Variant "{variant}" choisi</>
          ) : (
            <>Choisir "{variant}" pour {phase.label}</>
          )}
        </button>
      </div>
    </div>
  )
}
