import { useEffect, useState } from 'react'
import { X, Star, ExternalLink, Mail, Linkedin, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'
import ScoreBadge from './ScoreBadge'
import RecoBadge from './RecoBadge'
import EmailPreview from './EmailPreview'

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}
        />
      ))}
      {rating && <span className="text-xs text-muted ml-1">{rating.toFixed(1)}</span>}
    </div>
  )
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LeadDrawer({ sellerId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [relaunching, setRelaunching] = useState(false)

  useEffect(() => {
    if (!sellerId) return
    async function load() {
      setLoading(true)
      const { data: sq } = await supabase
        .from('seller_qualification')
        .select('*, seller_emails(*)')
        .eq('seller_id', sellerId)
        .single()

      const [{ data: seller }, { data: seq }] = await Promise.all([
        supabase.from('amazon_sellers').select('*').eq('seller_id', sellerId).single(),
        supabase.from('seller_sequence').select('*').eq('seller_id', sellerId).single(),
      ])

      setData({ ...sq, amazon_sellers: seller, seller_sequence: seq })
      setLoading(false)
    }
    load()
  }, [sellerId])

  async function handleRelaunch() {
    setRelaunching(true)
    await supabase
      .from('seller_qualification')
      .update({ statut: 'scored', error_reason: null })
      .eq('seller_id', sellerId)
    setData((d) => ({ ...d, statut: 'scored', error_reason: null }))
    setRelaunching(false)
  }

  if (!sellerId) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-text text-lg">Fiche lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-muted" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted">Chargement...</div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-muted">Lead introuvable</div>
        ) : (
          <div className="flex-1 p-6 space-y-6">
            {/* 1. En-tête */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-text">
                    {data.amazon_sellers?.seller_name || 'Vendeur inconnu'}
                  </h3>
                  {data.amazon_sellers?.seller_url && (
                    <a href={data.amazon_sellers.seller_url} target="_blank" rel="noreferrer" className="text-muted hover:text-[#1B3A5C]">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                {data.amazon_sellers?.categories && (
                  <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {data.amazon_sellers.categories}
                  </span>
                )}
                <div className="mt-2">
                  <StarRating rating={data.amazon_sellers?.rating} />
                </div>
              </div>
              <StatusBadge status={data.statut} />
            </div>

            {/* Error banner */}
            {data.error_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700">Erreur détectée</p>
                  <p className="text-sm text-red-600 mt-0.5">{data.error_reason}</p>
                </div>
                <button
                  onClick={handleRelaunch}
                  disabled={relaunching}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={relaunching ? 'animate-spin' : ''} />
                  Relancer
                </button>
              </div>
            )}

            {/* 2. Scoring */}
            <div className="card">
              <h4 className="text-sm font-semibold text-text mb-3">Scoring IA</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${data.score_total || 0}%`,
                      background: (data.score_total || 0) >= 70 ? '#16a34a' : (data.score_total || 0) >= 50 ? '#f59e0b' : '#e8445a',
                    }}
                  />
                </div>
                <ScoreBadge score={data.score_total} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <RecoBadge value={data.recommandation} />
                {data.contexte_detecte && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {data.contexte_detecte}
                  </span>
                )}
              </div>
              {data.insight_principal && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-0.5">Insight principal</p>
                  <p className="text-sm text-blue-800">{data.insight_principal}</p>
                </div>
              )}
              {data.angle_approche && (
                <p className="text-sm text-muted mt-2">
                  <span className="font-medium">Angle :</span> {data.angle_approche}
                </p>
              )}
            </div>

            {/* 3. Décideur */}
            <div className="card">
              <h4 className="text-sm font-semibold text-text mb-3">Contact décideur</h4>
              {data.decision_maker_name ? (
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-text">{data.decision_maker_name}</p>
                    {data.decision_maker_title && (
                      <p className="text-sm text-muted">{data.decision_maker_title}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.decision_maker_email && (
                      <a
                        href={`mailto:${data.decision_maker_email}`}
                        className="flex items-center gap-1.5 text-sm text-[#1B3A5C] hover:underline"
                      >
                        <Mail size={14} />
                        {data.decision_maker_email}
                      </a>
                    )}
                    {data.decision_maker_linkedin && (
                      <a
                        href={data.decision_maker_linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                      >
                        <Linkedin size={14} />
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {data.enriched_source && (
                    <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {data.enriched_source}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Décideur non encore enrichi</p>
              )}
            </div>

            {/* 4. Emails générés */}
            {data.seller_emails && (
              <div className="card">
                <h4 className="text-sm font-semibold text-text mb-3">Emails générés</h4>
                <EmailPreview emails={data.seller_emails} />
              </div>
            )}

            {/* 5. Timeline séquence */}
            {data.seller_sequence && (
              <div className="card">
                <h4 className="text-sm font-semibold text-text mb-3">Timeline séquence</h4>
                <div className="space-y-2">
                  {[
                    { label: 'J0', date: data.seller_sequence.mail1_sent_at, step: 1 },
                    { label: 'J+3', date: data.seller_sequence.mail2_sent_at, step: 2 },
                    { label: 'J+6', date: data.seller_sequence.mail3_sent_at, step: 3 },
                  ].map(({ label, date, step }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${date ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {date ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-text">{label}</span>
                        <span className="text-sm text-muted ml-2">{fmt(date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.seller_sequence.opened_count > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {data.seller_sequence.opened_count} ouverture(s)
                    </span>
                  )}
                  {data.seller_sequence.clicked_count > 0 && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {data.seller_sequence.clicked_count} clic(s)
                    </span>
                  )}
                  {data.seller_sequence.replied && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Répondu</span>
                  )}
                  {data.seller_sequence.bounced && (
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">Bounced</span>
                  )}
                  {data.seller_sequence.unsubscribed && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Désabonné</span>
                  )}
                </div>
              </div>
            )}

            {/* Amazon data */}
            {data.amazon_sellers && (
              <div className="card">
                <h4 className="text-sm font-semibold text-text mb-3">Données Amazon</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted">Produits</span><p className="font-medium">{data.amazon_sellers.nb_products?.toLocaleString() || '—'}</p></div>
                  <div><span className="text-muted">Avis</span><p className="font-medium">{data.amazon_sellers.nb_reviews?.toLocaleString() || '—'}</p></div>
                  <div><span className="text-muted">Prix moyen</span><p className="font-medium">{data.amazon_sellers.avg_price ? `${data.amazon_sellers.avg_price.toFixed(2)} €` : '—'}</p></div>
                  <div><span className="text-muted">Note</span><p className="font-medium">{data.amazon_sellers.rating || '—'} / 5</p></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
