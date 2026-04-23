import { useEffect, useState } from 'react'
import {
  X, Star, ExternalLink, Mail, Linkedin, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Save, ChevronDown,
  Target, ShoppingBag,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'
import ScoreBadge from './ScoreBadge'
import RecoBadge from './RecoBadge'
import EmailPreview from './EmailPreview'
import { getCategory } from '../lib/categories'

const ALL_STATUTS = [
  'A_SCORER', 'scored', 'enriched', 'sequence_en_cours', 'sequence_terminee',
  'HOT', 'REPLIED', 'BOUNCE', 'UNSUBSCRIBED',
  'enrichment_failed', 'enrichment_failed_final', 'generation_failed', 'REJETE_FILTRE',
]

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          style={{
            color: i <= Math.round(rating || 0) ? '#FFB020' : '#4C5180',
            fill: i <= Math.round(rating || 0) ? '#FFB020' : '#4C5180',
          }}
        />
      ))}
      {rating && (
        <span className="text-xs ml-1.5" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DrawerSection({ title, children }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <h4
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}
      >
        {title}
      </h4>
      {children}
    </div>
  )
}

export default function LeadDrawer({ sellerId, onClose }) {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [relaunching, setRelaunching] = useState(false)
  const [newStatut, setNewStatut]   = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [notes, setNotes]           = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    if (!sellerId) return
    async function load() {
      setLoading(true)
      setStatusOpen(false)

      const { data: sq } = await supabase
        .from('seller_qualification')
        .select('*, seller_emails(*)')
        .eq('seller_id', sellerId)
        .single()

      const [{ data: seller }, { data: seq }] = await Promise.all([
        supabase.from('amazon_sellers').select('*').eq('seller_id', sellerId).single(),
        supabase.from('seller_sequence').select('*').eq('seller_id', sellerId).single(),
      ])

      const full = { ...sq, amazon_sellers: seller, seller_sequence: seq }
      setData(full)
      setNewStatut(sq?.statut || '')
      setNotes(sq?.notes || '')
      setLoading(false)
    }
    load()
  }, [sellerId])

  async function handleRelaunch() {
    setRelaunching(true)
    await supabase.from('seller_qualification').update({ statut: 'scored', error_reason: null }).eq('seller_id', sellerId)
    setData((d) => ({ ...d, statut: 'scored', error_reason: null }))
    setNewStatut('scored')
    setRelaunching(false)
  }

  async function handleStatusChange(s) {
    setChangingStatus(true)
    setStatusOpen(false)
    await supabase.from('seller_qualification').update({ statut: s }).eq('seller_id', sellerId)
    setData((d) => ({ ...d, statut: s }))
    setNewStatut(s)
    setChangingStatus(false)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    await supabase.from('seller_qualification').update({ notes }).eq('seller_id', sellerId)
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  if (!sellerId) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="relative w-full max-w-2xl flex flex-col overflow-y-auto"
        style={{
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--text)',
          }}>
            Fiche lead
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3" style={{ color: 'var(--text-3)' }}>
            <div className="w-3.5 h-3.5 rounded-full live-dot" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
            Lead introuvable
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-4">

            {/* 1. Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                    {data.amazon_sellers?.seller_name || 'Vendeur inconnu'}
                  </h3>
                  {data.amazon_sellers?.seller_url && (
                    <a href={data.amazon_sellers.seller_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                {data.amazon_sellers?.categories && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: 'rgba(120,128,200,0.08)',
                    color: 'var(--text-2)',
                    border: '1px solid rgba(120,128,200,0.14)',
                  }}>
                    {data.amazon_sellers.categories}
                  </span>
                )}
                <div className="mt-2">
                  <StarRating rating={data.amazon_sellers?.rating} />
                </div>
              </div>

              {/* Statut dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStatusOpen((v) => !v)}
                  disabled={changingStatus}
                  className="flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                >
                  <StatusBadge status={data.statut} />
                  <ChevronDown
                    size={12}
                    style={{ color: 'var(--text-3)', transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </button>
                {statusOpen && (
                  <div
                    className="absolute right-0 top-8 w-52 z-20 rounded-xl overflow-hidden py-1 max-h-72 overflow-y-auto"
                    style={{
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-strong)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    }}
                  >
                    {ALL_STATUTS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
                        style={{ background: s === data.statut ? 'rgba(120,128,200,0.08)' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(120,128,200,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = s === data.statut ? 'rgba(120,128,200,0.08)' : 'transparent'}
                      >
                        <StatusBadge status={s} />
                        {s === data.statut && <CheckCircle2 size={11} className="ml-auto" style={{ color: '#00C97B' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error banner */}
            {data.error_reason && (
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(255,51,88,0.07)', border: '1px solid rgba(255,51,88,0.18)' }}
              >
                <AlertTriangle size={15} style={{ color: '#FF3358', flexShrink: 0, marginTop: '1px' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#FF3358' }}>Erreur détectée</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{data.error_reason}</p>
                </div>
                <button
                  onClick={handleRelaunch}
                  disabled={relaunching}
                  className="flex-shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'rgba(255,51,88,0.15)',
                    color: '#FF3358',
                    border: '1px solid rgba(255,51,88,0.28)',
                  }}
                >
                  <RefreshCw size={11} className={relaunching ? 'animate-spin' : ''} />
                  Relancer
                </button>
              </div>
            )}

            {/* 2. Scoring */}
            <DrawerSection title="Scoring IA">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: '6px', background: 'rgba(120,128,200,0.12)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${data.score_total || 0}%`,
                      borderRadius: '999px',
                      background: (data.score_total || 0) >= 70 ? '#00C97B' : (data.score_total || 0) >= 50 ? '#FFB020' : '#FF3358',
                      boxShadow: `0 0 8px ${(data.score_total || 0) >= 70 ? 'rgba(0,201,123,0.4)' : (data.score_total || 0) >= 50 ? 'rgba(255,176,32,0.4)' : 'rgba(255,51,88,0.4)'}`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <ScoreBadge score={data.score_total} />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <RecoBadge value={data.recommandation} />
                {data.contexte_detecte && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: 'rgba(120,128,200,0.08)',
                    color: 'var(--text-2)',
                    border: '1px solid rgba(120,128,200,0.14)',
                  }}>
                    {data.contexte_detecte}
                  </span>
                )}
              </div>
              {data.insight_principal && (
                <div
                  className="rounded-lg p-3 mt-2"
                  style={{ background: 'rgba(123,111,255,0.07)', border: '1px solid rgba(123,111,255,0.15)' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: '#7B6FFF' }}>Insight principal</p>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{data.insight_principal}</p>
                </div>
              )}
              {data.angle_approche && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-2)' }}>Angle :</span> {data.angle_approche}
                </p>
              )}
            </DrawerSection>

            {/* 3. Décideur */}
            <DrawerSection title="Contact décideur">
              {data.decision_maker_name ? (
                <div className="space-y-2">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text)' }}>{data.decision_maker_name}</p>
                    {data.decision_maker_title && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{data.decision_maker_title}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {data.decision_maker_email && (
                      <a
                        href={`mailto:${data.decision_maker_email}`}
                        className="flex items-center gap-1.5 text-sm transition-colors"
                        style={{ color: 'var(--text-2)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#7B6FFF'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
                      >
                        <Mail size={13} /> {data.decision_maker_email}
                      </a>
                    )}
                    {data.decision_maker_linkedin && (
                      <a
                        href={data.decision_maker_linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: '#7B6FFF' }}
                      >
                        <Linkedin size={13} /> LinkedIn
                      </a>
                    )}
                  </div>
                  {data.enriched_source && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '1px 8px',
                      borderRadius: '999px',
                      background: 'rgba(192,132,252,0.1)',
                      color: '#C084FC',
                      border: '1px solid rgba(192,132,252,0.2)',
                    }}>
                      {data.enriched_source}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Décideur non encore enrichi</p>
              )}
            </DrawerSection>

            {/* 4. Notes */}
            <DrawerSection title="Notes internes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter une note sur ce lead (appel prévu, contexte, objections…)"
                className="input"
                style={{ minHeight: '90px', resize: 'vertical', fontSize: '13px', lineHeight: '1.5' }}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1.5 transition-all disabled:opacity-50"
                  style={{
                    padding: '5px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'Outfit, sans-serif',
                    background: notesSaved ? 'rgba(0,201,123,0.12)' : 'rgba(255,51,88,0.12)',
                    color: notesSaved ? '#00C97B' : '#FF3358',
                    border: notesSaved ? '1px solid rgba(0,201,123,0.25)' : '1px solid rgba(255,51,88,0.25)',
                  }}
                >
                  {notesSaved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                  {notesSaved ? 'Sauvegardé !' : savingNotes ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </DrawerSection>

            {/* 5. Emails générés */}
            {data.seller_emails && (
              <DrawerSection title="Emails générés">
                <EmailPreview emails={data.seller_emails} />
              </DrawerSection>
            )}

            {/* 6. Timeline séquence */}
            {data.seller_sequence && (
              <DrawerSection title="Timeline séquence">
                <div className="space-y-2.5">
                  {[
                    { label: 'J0',  date: data.seller_sequence.mail1_sent_at },
                    { label: 'J+3', date: data.seller_sequence.mail2_sent_at },
                    { label: 'J+6', date: data.seller_sequence.mail3_sent_at },
                  ].map(({ label, date }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: date ? 'rgba(0,201,123,0.12)' : 'rgba(120,128,200,0.08)',
                          border: date ? '1px solid rgba(0,201,123,0.25)' : '1px solid rgba(120,128,200,0.14)',
                        }}
                      >
                        {date
                          ? <CheckCircle2 size={12} style={{ color: '#00C97B' }} />
                          : <Clock size={12} style={{ color: 'var(--text-3)' }} />
                        }
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', minWidth: '32px' }}>{label}</span>
                      <span className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{fmt(date)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.seller_sequence.opened_count > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(123,111,255,0.1)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.2)' }}>
                      {data.seller_sequence.opened_count} ouverture(s)
                    </span>
                  )}
                  {data.seller_sequence.clicked_count > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(0,224,192,0.08)', color: '#00E0C0', border: '1px solid rgba(0,224,192,0.18)' }}>
                      {data.seller_sequence.clicked_count} clic(s)
                    </span>
                  )}
                  {data.seller_sequence.replied && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(0,201,123,0.1)', color: '#00C97B', border: '1px solid rgba(0,201,123,0.2)' }}>
                      Répondu
                    </span>
                  )}
                  {data.seller_sequence.bounced && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(255,138,50,0.1)', color: '#FF8A32', border: '1px solid rgba(255,138,50,0.2)' }}>
                      Bounced
                    </span>
                  )}
                  {data.seller_sequence.unsubscribed && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(76,81,128,0.1)', color: '#8890B8', border: '1px solid rgba(76,81,128,0.2)' }}>
                      Désabonné
                    </span>
                  )}
                </div>
              </DrawerSection>
            )}

            {/* 7. Marketplaces */}
            {data.amazon_sellers && (data.amazon_sellers.target_marketplaces?.length > 0 || data.amazon_sellers.present_marketplaces?.length > 0) && (
              <DrawerSection title="Marketplaces">
                {data.amazon_sellers.target_marketplaces?.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target size={12} style={{ color: '#FF3358' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)', letterSpacing: '0.08em' }}>
                        Cibles Mirakl ({data.amazon_sellers.target_marketplaces.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.amazon_sellers.target_marketplaces.map((m) => (
                        <span key={m} style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(255,51,88,0.08)', color: '#FF3358', border: '1px solid rgba(255,51,88,0.18)' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.amazon_sellers.present_marketplaces?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShoppingBag size={12} style={{ color: '#00C97B' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)', letterSpacing: '0.08em' }}>
                        Déjà présent ({data.amazon_sellers.present_marketplaces.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.amazon_sellers.present_marketplaces.map((m) => (
                        <span key={m} style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(0,201,123,0.1)', color: '#00C97B', border: '1px solid rgba(0,201,123,0.2)' }}>
                          ✓ {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </DrawerSection>
            )}

            {/* 8. Amazon data */}
            {data.amazon_sellers && (
              <DrawerSection title="Données Amazon">
                {data.amazon_sellers.category && (() => {
                  const cat = getCategory(data.amazon_sellers.category)
                  return (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{cat.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: 'rgba(120,128,200,0.08)', color: 'var(--text-2)', border: '1px solid rgba(120,128,200,0.14)' }}>
                        {cat.label}
                      </span>
                    </div>
                  )
                })()}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Produits',    value: data.amazon_sellers.nb_products?.toLocaleString() },
                    { label: 'Avis',        value: data.amazon_sellers.nb_reviews?.toLocaleString() },
                    { label: 'Prix moyen',  value: data.amazon_sellers.avg_price ? `${data.amazon_sellers.avg_price.toFixed(2)} €` : null },
                    { label: 'Note',        value: data.amazon_sellers.rating ? `${data.amazon_sellers.rating} / 5` : null },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                        {value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
