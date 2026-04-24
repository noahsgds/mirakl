import { useEffect, useState } from 'react'
import {
  X, Star, ExternalLink, Mail, Linkedin, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Save, ChevronDown,
  MessageSquare, TrendingUp, MousePointerClick, Eye,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'

function cleanText(raw) {
  if (!raw) return ''
  return raw
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/\s*Le (lun|mar|mer|jeu|ven|sam|dim)[\s\S]*/i, '')
    .replace(/\s*On (Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]*/i, '')
    .replace(/\s+/g, ' ').trim()
}

function fmt(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtShort(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
      <p className="text-white font-bold text-lg leading-none">{value ?? '—'}</p>
      {sub && <p className="text-white/60 text-xs mt-0.5">{sub}</p>}
      <p className="text-white/50 text-xs mt-1">{label}</p>
    </div>
  )
}

function ScoreCircle({ score }) {
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#e8445a'
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = ((score || 0) / 100) * circ
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {score ?? '—'}
      </span>
    </div>
  )
}

const ALL_STATUTS = [
  'A_SCORER', 'scored', 'enriched', 'sequence_en_cours', 'sequence_terminee',
  'HOT', 'REPLIED', 'BOUNCE', 'UNSUBSCRIBED',
  'enrichment_failed', 'enrichment_failed_final', 'generation_failed', 'REJETE_FILTRE',
]

export default function LeadDrawer({ sellerId, onClose }) {
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusOpen, setStatusOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [relaunching, setRelaunching] = useState(false)

  useEffect(() => {
    if (!sellerId) return
    async function load() {
      setLoading(true)
      setStatusOpen(false)
      const [{ data: sq }, { data: seller }, { data: seq }, { data: msgs }] = await Promise.all([
        supabase.from('seller_qualification').select('*').eq('seller_id', sellerId).single(),
        supabase.from('amazon_sellers').select('*').eq('seller_id', sellerId).single(),
        supabase.from('seller_sequence').select('*').eq('seller_id', sellerId).single(),
        supabase.from('brevo_messages')
          .select('id, received_at, from_name, from_email, subject, text_content')
          .eq('seller_id', sellerId)
          .order('received_at', { ascending: false }),
      ])
      setData({ ...sq, amazon_sellers: seller, seller_sequence: seq })
      setMessages(msgs || [])
      setNotes(sq?.notes || '')
      setLoading(false)
    }
    load()
  }, [sellerId])

  async function handleStatusChange(s) {
    setChangingStatus(true)
    setStatusOpen(false)
    await supabase.from('seller_qualification').update({ statut: s }).eq('seller_id', sellerId)
    setData(d => ({ ...d, statut: s }))
    setChangingStatus(false)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    await supabase.from('seller_qualification').update({ notes }).eq('seller_id', sellerId)
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function handleRelaunch() {
    setRelaunching(true)
    await supabase.from('seller_qualification').update({ statut: 'scored', error_reason: null }).eq('seller_id', sellerId)
    setData(d => ({ ...d, statut: 'scored', error_reason: null }))
    setRelaunching(false)
  }

  if (!sellerId) return null

  const s = data?.amazon_sellers
  const seq = data?.seller_sequence

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Chargement...</div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Lead introuvable</div>
        ) : (
          <>
            {/* ── Hero header ── */}
            <div className="bg-[#03182F] px-6 pt-5 pb-6 relative">
              <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-white/70" />
              </button>

              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white truncate">
                      {s?.seller_name || 'Seller inconnu'}
                    </h2>
                    {s?.seller_url && (
                      <a href={s.seller_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white/80 flex-shrink-0">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {s?.categories && (
                    <span className="inline-block mt-1.5 text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                      {s.categories}
                    </span>
                  )}
                </div>

                {/* Status dropdown */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setStatusOpen(v => !v)}
                    disabled={changingStatus}
                    className="flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    <StatusBadge status={data.statut} />
                    <ChevronDown size={12} className={`text-white/50 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {statusOpen && (
                    <div className="absolute right-0 top-8 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 py-1 max-h-64 overflow-y-auto">
                      {ALL_STATUTS.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${s === data.statut ? 'bg-gray-50' : ''}`}
                        >
                          <StatusBadge status={s} />
                          {s === data.statut && <CheckCircle2 size={12} className="ml-auto text-green-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Amazon stats */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <Stat label="Produits" value={s?.nb_products?.toLocaleString()} />
                <Stat label="Note" value={s?.rating ? `${s.rating}/5` : null} />
                <Stat label="Avis" value={s?.nb_reviews?.toLocaleString()} />
                <Stat label="Prix moy." value={s?.avg_price ? `${s.avg_price.toFixed(0)}€` : null} />
              </div>
            </div>

            {/* ── Error banner ── */}
            {data.error_reason && (
              <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700">Erreur détectée</p>
                  <p className="text-xs text-red-600 mt-0.5">{data.error_reason}</p>
                </div>
                <button onClick={handleRelaunch} disabled={relaunching}
                  className="flex-shrink-0 flex items-center gap-1 bg-red-600 text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                  <RefreshCw size={11} className={relaunching ? 'animate-spin' : ''} /> Retry
                </button>
              </div>
            )}

            <div className="flex-1 px-5 py-4 space-y-4">

              {/* ── Scoring IA ── */}
              {(data.score_total != null || data.insight_principal) && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-4">
                    <ScoreCircle score={data.score_total} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Score IA</p>
                      {data.recommandation && (
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-1 ${data.recommandation === 'PRIORITAIRE' ? 'bg-green-100 text-green-700' : data.recommandation === 'A_CONTACTER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {data.recommandation}
                        </span>
                      )}
                      {data.angle_approche && (
                        <p className="text-xs text-slate-500 truncate">{data.angle_approche}</p>
                      )}
                    </div>
                  </div>
                  {data.insight_principal && (
                    <div className="mt-3 bg-[#F2F8FF] border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-blue-600 mb-1">Insight</p>
                      <p className="text-sm text-[#03182F] leading-relaxed">{data.insight_principal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Contact décideur ── */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Contact</p>
                {data.decision_maker_name ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {data.decision_maker_name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#03182F]">{data.decision_maker_name}</p>
                      {data.decision_maker_title && <p className="text-xs text-slate-500">{data.decision_maker_title}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Contact non enrichi</p>
                )}
                <div className="flex gap-2 mt-3">
                  {data.decision_maker_email && (
                    <a href={`mailto:${data.decision_maker_email}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F2F8FF] border border-blue-100 text-sm font-medium text-[#1B3A5C] hover:bg-blue-100 transition-colors">
                      <Mail size={14} /> Email
                    </a>
                  )}
                  {data.decision_maker_linkedin && (
                    <a href={data.decision_maker_linkedin} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                      <Linkedin size={14} /> LinkedIn
                    </a>
                  )}
                </div>
                {data.decision_maker_email && (
                  <p className="text-xs text-slate-400 mt-2 truncate">{data.decision_maker_email}</p>
                )}
              </div>

              {/* ── Séquence email ── */}
              {seq && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Séquence email</p>

                  {/* Timeline */}
                  <div className="flex items-center gap-1 mb-4">
                    {[
                      { label: 'J0', date: seq.mail1_sent_at },
                      { label: 'J+3', date: seq.mail2_sent_at },
                      { label: 'J+6', date: seq.mail3_sent_at },
                    ].map(({ label, date }, i, arr) => (
                      <div key={label} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${date ? 'bg-[#03182F] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {date ? <CheckCircle2 size={16} /> : <Clock size={14} />}
                          </div>
                          <p className="text-xs font-semibold mt-1 text-slate-600">{label}</p>
                          <p className="text-xs text-slate-400">{date ? fmtShort(date) : '–'}</p>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 rounded ${arr[i + 1].date ? 'bg-[#03182F]' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Engagement */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-xl p-3 text-center ${seq.opened_count > 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <Eye size={16} className={`mx-auto mb-1 ${seq.opened_count > 0 ? 'text-blue-500' : 'text-gray-300'}`} />
                      <p className={`text-lg font-bold ${seq.opened_count > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{seq.opened_count || 0}</p>
                      <p className="text-xs text-slate-400">Ouvertures</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${seq.clicked_count > 0 ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <MousePointerClick size={16} className={`mx-auto mb-1 ${seq.clicked_count > 0 ? 'text-indigo-500' : 'text-gray-300'}`} />
                      <p className={`text-lg font-bold ${seq.clicked_count > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>{seq.clicked_count || 0}</p>
                      <p className="text-xs text-slate-400">Clics</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${seq.replied ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                      <TrendingUp size={16} className={`mx-auto mb-1 ${seq.replied ? 'text-green-500' : 'text-gray-300'}`} />
                      <p className={`text-sm font-bold mt-1 ${seq.replied ? 'text-green-700' : 'text-gray-400'}`}>{seq.replied ? 'Oui' : 'Non'}</p>
                      <p className="text-xs text-slate-400">Répondu</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Réponses Brevo ── */}
              {messages.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={14} className="text-green-600" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Réponses ({messages.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {messages.map(msg => {
                      const text = cleanText(msg.text_content)
                      return (
                        <div key={msg.id} className="bg-white rounded-xl border border-green-100 px-4 py-3">
                          {msg.subject && (
                            <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{msg.subject}</p>
                          )}
                          {text ? (
                            <p className="text-sm text-[#03182F] leading-relaxed line-clamp-4">{text}</p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Notification de réception</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">{fmt(msg.received_at)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Notes internes ── */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Notes internes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Call prévu, objections, contexte..."
                  className="w-full min-h-[90px] resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${notesSaved ? 'bg-green-600 text-white' : 'bg-[#1B3A5C] text-white hover:bg-[#15304e]'} disabled:opacity-50`}
                  >
                    {notesSaved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                    {notesSaved ? 'Sauvegardé' : savingNotes ? '...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
