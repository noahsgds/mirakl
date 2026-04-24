import { useEffect, useState } from 'react'
import { MessageSquare, ExternalLink, Phone, Trophy, XCircle, Mail, Linkedin, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LeadDrawer from '../components/LeadDrawer'

const OUTCOME_OPTIONS = [
  { value: 'call_planned', label: 'Call planned', icon: Phone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'won', label: 'Won', icon: Trophy, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'lost', label: 'Perdu', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
]

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function MessageThread({ messages }) {
  const [expanded, setExpanded] = useState(false)
  if (!messages || messages.length === 0) return null

  const sorted = [...messages].sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
  const latest = sorted[0]
  const rest = sorted.slice(1)

  return (
    <div className="mt-3 rounded-lg border border-green-100 bg-green-50/50 overflow-hidden">
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-green-800">
              {latest.from_name || latest.from_email}
            </span>
            {latest.subject && (
              <span className="text-xs text-green-700 truncate max-w-[260px]">— {latest.subject}</span>
            )}
          </div>
          <span className="text-xs text-muted flex-shrink-0">{fmt(latest.received_at)}</span>
        </div>
        {latest.text_content && (
          <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3">
            {latest.text_content.trim()}
          </p>
        )}
        {!latest.text_content && (
          <p className="text-xs text-slate-400 italic">Notification de réception (pas de contenu)</p>
        )}
      </div>

      {rest.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 border-t border-green-100 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Masquer' : `${rest.length} message${rest.length > 1 ? 's' : ''} précédent${rest.length > 1 ? 's' : ''}`}
          </button>
          {expanded && rest.map((msg) => (
            <div key={msg.id} className="px-3 py-2.5 border-t border-green-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-green-800">
                  {msg.from_name || msg.from_email}
                </span>
                <span className="text-xs text-muted">{fmt(msg.received_at)}</span>
              </div>
              {msg.text_content && (
                <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-2">
                  {msg.text_content.trim()}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function ThreadCard({ thread, sellerMap, onAction, onOpen }) {
  const [actioning, setActioning] = useState(false)
  const seller = sellerMap[thread.email] || null
  const latest = thread.messages[0]

  async function handleOutcome(outcome) {
    if (!seller) return
    setActioning(true)
    await supabase
      .from('seller_qualification')
      .update({ statut: outcome === 'won' ? 'REPLIED' : seller.statut, notes: outcome })
      .eq('seller_id', seller.seller_id)
    onAction?.()
    setActioning(false)
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {seller ? (
              <button
                onClick={() => onOpen(seller.seller_id)}
                className="font-semibold text-text hover:text-[#1B3A5C] hover:underline text-left"
              >
                {seller.amazon_sellers?.seller_name || seller.decision_maker_name || thread.email}
              </button>
            ) : (
              <span className="font-semibold text-text">
                {latest.from_name || thread.email}
              </span>
            )}
            {seller?.amazon_sellers?.seller_url && (
              <a href={seller.amazon_sellers.seller_url} target="_blank" rel="noreferrer" className="text-muted hover:text-[#1B3A5C]">
                <ExternalLink size={13} />
              </a>
            )}
            {seller?.amazon_sellers?.categories && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {seller.amazon_sellers.categories}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <a href={`mailto:${thread.email}`} className="flex items-center gap-1 text-xs text-[#1B3A5C] hover:underline">
              <Mail size={12} /> {thread.email}
            </a>
            {seller?.decision_maker_linkedin && (
              <a href={seller.decision_maker_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Linkedin size={12} /> LinkedIn
              </a>
            )}
            <span className="text-xs text-muted">
              {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''}
            </span>
          </div>

          <MessageThread messages={thread.messages} />
        </div>

        <div className="text-right flex-shrink-0">
          {seller?.score_total != null && (
            <div className={`text-lg font-bold mb-1 ${seller.score_total >= 70 ? 'text-green-600' : seller.score_total >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {seller.score_total}
            </div>
          )}
          <p className="text-xs text-muted">{fmt(latest.received_at)}</p>
        </div>
      </div>

      {seller && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          <p className="text-xs text-muted font-medium mr-1">Action :</p>
          {OUTCOME_OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handleOutcome(value)}
              disabled={actioning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${color}`}
            >
              {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Icon size={11} />}
              {label}
            </button>
          ))}
          <button
            onClick={() => onOpen(seller.seller_id)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1B3A5C] text-white hover:bg-[#15304e] transition-colors"
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

    // 1. All messages from brevo_messages
    const { data: msgs } = await supabase
      .from('brevo_messages')
      .select('id, received_at, from_email, from_name, subject, text_content, seller_id')
      .order('received_at', { ascending: false })

    if (!msgs || msgs.length === 0) {
      setThreads([])
      setLoading(false)
      return
    }

    // 2. Group by sender email → one thread per sender
    const grouped = {}
    for (const msg of msgs) {
      const key = (msg.from_email || '').toLowerCase()
      if (!key) continue
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(msg)
    }

    const threadList = Object.entries(grouped).map(([email, messages]) => ({
      email,
      messages,
    }))

    setThreads(threadList)

    // 3. Try to load seller info for each sender email
    const emails = threadList.map(t => t.email)
    if (emails.length > 0) {
      const { data: sellers } = await supabase
        .from('seller_qualification')
        .select('seller_id, decision_maker_email, decision_maker_name, decision_maker_linkedin, statut, score_total, amazon_sellers(seller_name, seller_url, categories), seller_sequence(opened_count, clicked_count, mail1_sent_at)')
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Inbox</h1>
        <p className="text-muted text-sm mt-0.5">Réponses reçues des sellers via Brevo</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 bg-green-50 border-green-200 text-green-700">
          <MessageSquare size={16} />
          Replies
          {threads.length > 0 && (
            <span className="ml-1 bg-green-200 text-green-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {threads.length}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted">Chargement...</div>
      ) : threads.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-muted">Aucune réponse reçue pour le moment</p>
          <p className="text-xs text-muted mt-1">Les réponses Brevo apparaîtront ici automatiquement</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">{threads.length} conversation{threads.length > 1 ? 's' : ''}</p>
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
