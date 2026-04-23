import { useEffect, useState } from 'react'
import { Flame, MessageSquare, ExternalLink, Phone, Trophy, XCircle, Mail, Linkedin, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LeadDrawer from '../components/LeadDrawer'

const TABS = [
  { key: 'HOT',     label: 'HOT leads',  icon: Flame,          accentColor: '#dc2626' },
  { key: 'REPLIED', label: 'Réponses',   icon: MessageSquare,  accentColor: '#16a34a' },
]

const OUTCOME_OPTIONS = [
  { value: 'call_planned', label: 'Appel planifié', icon: Phone,    color: '#2764ff' },
  { value: 'won',          label: 'Gagné',          icon: Trophy,   color: '#16a34a' },
  { value: 'lost',         label: 'Perdu',          icon: XCircle,  color: '#dc2626' },
]

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function LeadCard({ lead, onAction, onOpen }) {
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

  const isHot = lead.statut === 'HOT'
  const glowColor = isHot ? '#dc2626' : '#16a34a'

  return (
    <div
      className="card"
      style={{
        borderColor: `${glowColor}18`,
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${glowColor}28`; e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${glowColor}18`; e.currentTarget.style.background = 'var(--surface)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Seller name + links */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpen(lead.seller_id)}
              className="font-semibold text-sm transition-colors"
              style={{ color: 'var(--text)', fontFamily: 'Outfit, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.color = glowColor}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
            >
              {lead.amazon_sellers?.seller_name || 'Vendeur inconnu'}
            </button>
            {lead.amazon_sellers?.seller_url && (
              <a href={lead.amazon_sellers.seller_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)' }}>
                <ExternalLink size={12} />
              </a>
            )}
            {lead.amazon_sellers?.categories && (
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: '999px',
                background: 'rgba(16,43,73,0.06)',
                color: 'var(--text-2)',
                border: '1px solid rgba(16,43,73,0.1)',
              }}>
                {lead.amazon_sellers.categories}
              </span>
            )}
          </div>

          {/* Decision maker */}
          {lead.decision_maker_name && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{lead.decision_maker_name}</span>
                {lead.decision_maker_title && (
                  <span style={{ color: 'var(--text-3)' }}> · {lead.decision_maker_title}</span>
                )}
              </p>
              {lead.decision_maker_email && (
                <a href={`mailto:${lead.decision_maker_email}`}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#2764ff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                >
                  <Mail size={11} /> {lead.decision_maker_email}
                </a>
              )}
              {lead.decision_maker_linkedin && (
                <a href={lead.decision_maker_linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs"
                  style={{ color: '#2764ff' }}
                >
                  <Linkedin size={11} /> LinkedIn
                </a>
              )}
            </div>
          )}

          {/* Engagement stats */}
          <div className="flex items-center gap-2.5 mt-3 flex-wrap">
            {lead.seller_sequence?.opened_count > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px',
                background: 'rgba(39,100,255,0.1)', color: '#2764ff', border: '1px solid rgba(39,100,255,0.2)',
              }}>
                {lead.seller_sequence.opened_count} ouverture(s)
              </span>
            )}
            {lead.seller_sequence?.clicked_count > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px',
                background: 'rgba(8,145,178,0.08)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)',
              }}>
                {lead.seller_sequence.clicked_count} clic(s)
              </span>
            )}
            {lead.seller_sequence?.mail1_sent_at && (
              <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                J0 : {fmt(lead.seller_sequence.mail1_sent_at)}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0">
          {lead.score_total != null && (
            <p style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '1.4rem',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: lead.score_total >= 70 ? '#16a34a' : lead.score_total >= 50 ? '#d97706' : '#dc2626',
            }}>
              {lead.score_total}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
            {fmt(lead.enriched_at)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 mt-4 pt-4 flex-wrap"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-xs font-medium mr-1" style={{ color: 'var(--text-3)' }}>Action :</p>
        {OUTCOME_OPTIONS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => handleOutcome(value)}
            disabled={actioning}
            className="flex items-center gap-1.5 transition-all"
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'Outfit, sans-serif',
              background: color + '10',
              color,
              border: `1px solid ${color}22`,
              cursor: actioning ? 'not-allowed' : 'pointer',
              opacity: actioning ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {actioning ? <RefreshCw size={10} className="animate-spin" /> : <Icon size={10} />}
            {label}
          </button>
        ))}
        <button
          onClick={() => onOpen(lead.seller_id)}
          className="ml-auto flex items-center gap-1.5 transition-all"
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'Outfit, sans-serif',
            background: glowColor + '10',
            color: glowColor,
            border: `1px solid ${glowColor}22`,
            cursor: 'pointer',
          }}
        >
          Voir fiche →
        </button>
      </div>
    </div>
  )
}

export default function Inbox() {
  const [tab, setTab]       = useState('HOT')
  const [leads, setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  async function load(status) {
    setLoading(true)
    const { data } = await supabase
      .from('seller_qualification')
      .select('*, amazon_sellers(seller_name, seller_url, categories), seller_sequence(opened_count, clicked_count, mail1_sent_at, replied)')
      .eq('statut', status)
      .order('enriched_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seller_qualification' }, () => { load(tab) })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tab])

  const currentTab = TABS.find(t => t.key === tab)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="fade-up">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.1 }}>
          Inbox
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
          Leads chauds et réponses à traiter
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 fade-up-1">
        {TABS.map(({ key, label, icon: Icon, accentColor }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'Outfit, sans-serif',
                cursor: 'pointer',
                background: active ? accentColor + '14' : 'var(--surface)',
                color: active ? accentColor : 'var(--text-3)',
                border: `1px solid ${active ? accentColor + '28' : 'var(--border-strong)'}`,
                boxShadow: active ? `0 0 16px ${accentColor}12` : 'none',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3" style={{ color: 'var(--text-3)' }}>
          <div className="w-3.5 h-3.5 rounded-full live-dot" style={{ background: currentTab?.accentColor }} />
          <span className="text-sm">Chargement…</span>
        </div>
      ) : leads.length === 0 ? (
        <div
          className="card py-16 text-center fade-up"
          style={{ borderStyle: 'dashed' }}
        >
          <div className="text-3xl mb-3">{tab === 'HOT' ? '🔥' : '💬'}</div>
          <p style={{ color: 'var(--text-3)' }}>
            Aucun lead {tab === 'HOT' ? 'HOT' : 'REPLIED'} pour le moment
          </p>
        </div>
      ) : (
        <div className="space-y-3 fade-up-2">
          <p className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
            {leads.length} lead{leads.length > 1 ? 's' : ''}
          </p>
          {leads.map((lead) => (
            <LeadCard key={lead.seller_id} lead={lead} onAction={() => load(tab)} onOpen={setSelectedId} />
          ))}
        </div>
      )}

      <LeadDrawer sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
