import { useEffect, useState } from 'react'
import { Flame, MessageSquare, ExternalLink, Phone, Trophy, XCircle, Mail, Linkedin, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LeadDrawer from '../components/LeadDrawer'

const C1_BREVO_INBOX_WEBHOOK_PATH = '/api/webhooks/c1/brevo-inbox'

const TABS = [
  { key: 'HOT', label: 'HOT leads', icon: Flame, color: '#E8445A', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'REPLIED', label: 'Replies', icon: MessageSquare, color: '#2E7D52', bg: 'bg-green-50', border: 'border-green-200' },
]

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
      {/* Latest message */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-green-800">
              {latest.from_name || latest.from_email}
            </span>
            {latest.subject && (
              <span className="text-xs text-green-700 truncate max-w-[200px]">— {latest.subject}</span>
            )}
          </div>
          <span className="text-xs text-muted flex-shrink-0">{fmt(latest.received_at)}</span>
        </div>
        {latest.text_content && (
          <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3">
            {latest.text_content.trim()}
          </p>
        )}
      </div>

      {/* Older messages */}
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

function LeadCard({ lead, tab, onAction, onOpen }) {
  const [actioning, setActioning] = useState(false)

  async function handleOutcome(outcome) {
    setActioning(true)
    await supabase
      .from('seller_qualification')
      .update({ statut: outcome === 'won' ? 'REPLIED' : lead.statut, notes: outcome })
      .eq('seller_id', lead.seller_id)
    onAction?.()
    setActioning(false)
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpen(lead.seller_id)}
              className="font-semibold text-text hover:text-[#1B3A5C] hover:underline text-left"
            >
              {lead.amazon_sellers?.seller_name || 'Seller inconnu'}
            </button>
            {lead.amazon_sellers?.seller_url && (
              <a href={lead.amazon_sellers.seller_url} target="_blank" rel="noreferrer" className="text-muted hover:text-[#1B3A5C]">
                <ExternalLink size={13} />
              </a>
            )}
            {lead.amazon_sellers?.categories && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {lead.amazon_sellers.categories}
              </span>
            )}
          </div>

          {lead.decision_maker_name && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-sm text-muted">
                <span className="font-medium text-text">{lead.decision_maker_name}</span>
                {lead.decision_maker_title && ` · ${lead.decision_maker_title}`}
              </p>
              {lead.decision_maker_email && (
                <a href={`mailto:${lead.decision_maker_email}`} className="flex items-center gap-1 text-xs text-[#1B3A5C] hover:underline">
                  <Mail size={12} /> {lead.decision_maker_email}
                </a>
              )}
              {lead.decision_maker_linkedin && (
                <a href={lead.decision_maker_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Linkedin size={12} /> LinkedIn
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            {lead.seller_sequence?.opened_count > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {lead.seller_sequence.opened_count} ouverture(s)
              </span>
            )}
            {lead.seller_sequence?.clicked_count > 0 && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {lead.seller_sequence.clicked_count} clic(s)
              </span>
            )}
            {lead.seller_sequence?.mail1_sent_at && (
              <span className="text-xs text-muted">J0 : {fmt(lead.seller_sequence.mail1_sent_at)}</span>
            )}
          </div>

          {/* Conversation thread for REPLIED tab */}
          {tab === 'REPLIED' && (
            <MessageThread messages={lead.brevo_messages} />
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {lead.score_total != null && (
            <div className={`text-lg font-bold mb-1 ${lead.score_total >= 70 ? 'text-green-600' : lead.score_total >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {lead.score_total}
            </div>
          )}
          <p className="text-xs text-muted">{fmt(lead.enriched_at)}</p>
        </div>
      </div>

      {/* Quick actions */}
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
          onClick={() => onOpen(lead.seller_id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1B3A5C] text-white hover:bg-[#15304e] transition-colors"
        >
          Voir fiche →
        </button>
      </div>
    </div>
  )
}

export default function Inbox() {
  const [tab, setTab] = useState('HOT')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${C1_BREVO_INBOX_WEBHOOK_PATH}`
      : C1_BREVO_INBOX_WEBHOOK_PATH

  async function load(status) {
    setLoading(true)
    // Try with brevo_messages join; fall back if table doesn't exist yet
    let data
    const { data: withMessages, error } = await supabase
      .from('seller_qualification')
      .select('*, amazon_sellers(seller_name, seller_url, categories), seller_sequence(opened_count, clicked_count, mail1_sent_at, replied), brevo_messages(id, received_at, from_email, from_name, subject, text_content)')
      .eq('statut', status)
      .order('enriched_at', { ascending: false })

    if (error) {
      // brevo_messages table likely doesn't exist yet — query without it
      const { data: fallback } = await supabase
        .from('seller_qualification')
        .select('*, amazon_sellers(seller_name, seller_url, categories), seller_sequence(opened_count, clicked_count, mail1_sent_at, replied)')
        .eq('statut', status)
        .order('enriched_at', { ascending: false })
      data = fallback
    } else {
      data = withMessages
    }

    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_qualification' }, () => {
        load(tab)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tab])

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 1600)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Inbox</h1>
        <p className="text-muted text-sm mt-0.5">HOT leads and replies to handle</p>
      </div>

      <div className="card border border-blue-100 bg-blue-50/60">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-blue-900">C1 Brevo Reply Webhook</p>
            <p className="mt-1 text-xs text-blue-700">
              Configure cette URL dans Brevo (Inbound Parsing ou Conversations) pour recevoir les réponses ici.
            </p>
            <p className="mt-2 rounded-md bg-white/80 px-2 py-1 font-mono text-xs text-slate-700 break-all">
              {webhookUrl}
            </p>
          </div>
          <button
            onClick={copyWebhookUrl}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3A5C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15304e]"
          >
            {copiedWebhook ? <Check size={12} /> : <Copy size={12} />}
            {copiedWebhook ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon, color, bg, border }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${tab === key ? `${bg} ${border}` : 'bg-white border-gray-200 text-muted hover:border-gray-300'}`}
            style={tab === key ? { color } : {}}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted">Chargement...</div>
      ) : leads.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-4xl mb-3">
            {tab === 'HOT' ? '🔥' : '💬'}
          </div>
          <p className="text-muted">Aucun lead {tab === 'HOT' ? 'HOT' : 'REPLIED'} pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">{leads.length} lead{leads.length > 1 ? 's' : ''}</p>
          {leads.map((lead) => (
            <LeadCard key={lead.seller_id} lead={lead} tab={tab} onAction={() => load(tab)} onOpen={setSelectedId} />
          ))}
        </div>
      )}

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
