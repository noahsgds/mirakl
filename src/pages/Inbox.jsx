import { useEffect, useState } from 'react'
import { Mail, Linkedin, ExternalLink, Phone, Trophy, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LeadDrawer from '../components/LeadDrawer'

const OUTCOME_OPTIONS = [
  { value: 'call_planned', label: 'Call planned', icon: Phone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'won', label: 'Won', icon: Trophy, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'lost', label: 'Perdu', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
]

function cleanText(raw) {
  if (!raw) return ''
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    // Strip quoted reply thread — French & English patterns
    .replace(/\s*Le (lun|mar|mer|jeu|ven|sam|dim)[\s\S]*/i, '')
    .replace(/\s*On (Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function initials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
  }
  return (email?.[0] || '?').toUpperCase()
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function Avatar({ name, email }) {
  const text = initials(name, email).toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {text}
    </div>
  )
}

function MessageBubble({ msg, isLatest }) {
  const text = cleanText(msg.text_content)
  if (!text && !msg.subject) return null
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${isLatest ? 'bg-[#F2F8FF] border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
      {msg.subject && (
        <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{msg.subject}</p>
      )}
      {text ? (
        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{text}</p>
      ) : (
        <p className="text-slate-400 italic text-xs">Notification de réception</p>
      )}
      <p className="text-xs text-slate-400 mt-2 text-right">{fmtDate(msg.received_at)}</p>
    </div>
  )
}

function ThreadCard({ thread, sellerMap, onAction, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  const [actioning, setActioning] = useState(false)
  const seller = sellerMap[thread.email] || null
  const sorted = [...thread.messages].sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
  const latest = sorted[0]
  const older = sorted.slice(1).filter(m => cleanText(m.text_content) || m.subject)

  const displayName = seller?.amazon_sellers?.seller_name
    || latest.from_name
    || thread.email

  const latestText = cleanText(latest.text_content)

  async function handleOutcome(outcome) {
    if (!seller) return
    setActioning(true)
    await supabase
      .from('seller_qualification')
      .update({ statut: outcome === 'won' ? 'REPLIED' : seller.statut })
      .eq('seller_id', seller.seller_id)
    onAction?.()
    setActioning(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4">
        <Avatar name={latest.from_name} email={thread.email} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {seller ? (
                <button
                  onClick={() => onOpen(seller.seller_id)}
                  className="font-bold text-[#03182F] hover:text-[#1B3A5C] hover:underline text-base leading-tight text-left"
                >
                  {displayName}
                </button>
              ) : (
                <span className="font-bold text-[#03182F] text-base leading-tight">{displayName}</span>
              )}
              {seller?.amazon_sellers?.categories && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                  {seller.amazon_sellers.categories}
                </span>
              )}
              {seller?.score_total != null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${seller.score_total >= 70 ? 'bg-green-100 text-green-700' : seller.score_total >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                  {seller.score_total}/100
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0 font-medium">{fmtDate(latest.received_at)}</span>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <a href={`mailto:${thread.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#1B3A5C] transition-colors">
              <Mail size={11} /> {thread.email}
            </a>
            {seller?.amazon_sellers?.seller_url && (
              <a href={seller.amazon_sellers.seller_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#1B3A5C] transition-colors">
                <ExternalLink size={11} /> Amazon
              </a>
            )}
            {seller?.decision_maker_linkedin && (
              <a href={seller.decision_maker_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                <Linkedin size={11} /> LinkedIn
              </a>
            )}
            {sorted.length > 1 && (
              <span className="text-xs text-slate-400">{sorted.length} messages</span>
            )}
          </div>
        </div>
      </div>

      {/* Latest message */}
      <div className="px-5 pb-4">
        <MessageBubble msg={latest} isLatest />
      </div>

      {/* Older messages (collapsible) */}
      {older.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs text-slate-500 hover:bg-gray-50 transition-colors font-medium"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Masquer' : `${older.length} message${older.length > 1 ? 's' : ''} précédent${older.length > 1 ? 's' : ''}`}
          </button>
          {expanded && (
            <div className="px-5 pb-4 space-y-2">
              {older.map(msg => <MessageBubble key={msg.id} msg={msg} isLatest={false} />)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {seller && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">Action :</span>
          {OUTCOME_OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handleOutcome(value)}
              disabled={actioning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${color}`}
            >
              {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Icon size={11} />}
              {label}
            </button>
          ))}
          <button
            onClick={() => onOpen(seller.seller_id)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B3A5C] text-white hover:bg-[#15304e] transition-colors"
          >
            Voir fiche →
          </button>
        </div>
      )}
    </div>
  )
}

export default function Inbox() {
  const [threads, setThreads] = useState([])
  const [sellerMap, setSellerMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setLoading(true)

    const { data: msgs } = await supabase
      .from('brevo_messages')
      .select('id, received_at, from_email, from_name, subject, text_content, seller_id')
      .order('received_at', { ascending: false })

    if (!msgs || msgs.length === 0) {
      setThreads([])
      setLoading(false)
      return
    }

    // Group by sender email
    const grouped = {}
    for (const msg of msgs) {
      const key = (msg.from_email || '').toLowerCase()
      if (!key) continue
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(msg)
    }

    const threadList = Object.entries(grouped).map(([email, messages]) => ({ email, messages }))
    setThreads(threadList)

    // Load seller info by email
    const emails = threadList.map(t => t.email)
    if (emails.length > 0) {
      const { data: sellers } = await supabase
        .from('seller_qualification')
        .select('seller_id, decision_maker_email, decision_maker_name, decision_maker_linkedin, statut, score_total, amazon_sellers(seller_name, seller_url, categories)')
        .in('decision_maker_email', emails)

      const map = {}
      for (const s of (sellers || [])) {
        map[(s.decision_maker_email || '').toLowerCase()] = s
      }
      setSellerMap(map)
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brevo_messages' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#03182F]">Inbox</h1>
          <p className="text-slate-500 text-sm mt-0.5">Réponses reçues des sellers via Brevo</p>
        </div>
        {threads.length > 0 && (
          <span className="text-sm font-semibold text-slate-600">
            {threads.length} conversation{threads.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">Chargement...</div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-semibold text-slate-700">Aucune réponse reçue</p>
          <p className="text-sm text-slate-400 mt-1">Les réponses Brevo apparaîtront ici automatiquement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.email}
              thread={thread}
              sellerMap={sellerMap}
              onAction={load}
              onOpen={setSelectedId}
            />
          ))}
        </div>
      )}

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
