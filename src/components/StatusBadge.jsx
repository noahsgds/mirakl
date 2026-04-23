const STATUS_STYLES = {
  HOT:                     'bg-crimson-50 text-crimson-600 ring-1 ring-inset ring-crimson-200/70',
  REPLIED:                 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70',
  sequence_en_cours:       'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/70',
  sequence_terminee:       'bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-100',
  enriched:                'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200/70',
  scored:                  'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70',
  enrichment_failed:       'bg-rose-50/70 text-rose-600 ring-1 ring-inset ring-rose-100',
  enrichment_failed_final: 'bg-rose-50/70 text-rose-600 ring-1 ring-inset ring-rose-100',
  generation_failed:       'bg-rose-50/70 text-rose-600 ring-1 ring-inset ring-rose-100',
  REJETE_FILTRE:           'bg-rose-50/70 text-rose-600 ring-1 ring-inset ring-rose-100',
  A_SCORER:                'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70',
  BOUNCE:                  'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200/70',
  UNSUBSCRIBED:            'bg-ink-50 text-ink-400 ring-1 ring-inset ring-ink-100',
}

const STATUS_DOT = {
  HOT:                     '#E8445A',
  REPLIED:                 '#10B981',
  sequence_en_cours:       '#3B82F6',
  sequence_terminee:       '#94A3B8',
  enriched:                '#8B5CF6',
  scored:                  '#D97706',
  enrichment_failed:       '#E11D48',
  enrichment_failed_final: '#E11D48',
  generation_failed:       '#E11D48',
  REJETE_FILTRE:           '#E11D48',
  A_SCORER:                '#64748B',
  BOUNCE:                  '#EA580C',
  UNSUBSCRIBED:            '#9CA3AF',
}

const STATUS_LABELS = {
  sequence_en_cours:       'En séquence',
  sequence_terminee:       'Terminée',
  enrichment_failed:       'Enrichissement échoué',
  enrichment_failed_final: 'Enrichissement échoué (final)',
  generation_failed:       'Génération échouée',
  REJETE_FILTRE:           'Rejeté filtre',
  A_SCORER:                'À scorer',
}

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-ink-300 text-xs">—</span>
  const style = STATUS_STYLES[status] || 'bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-100'
  const dot   = STATUS_DOT[status]    || '#94A3B8'
  const label = STATUS_LABELS[status] || status
  const pulse = status === 'HOT' || status === 'REPLIED'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-semibold ${style}`}>
      <span className="relative inline-flex">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
        {pulse && (
          <span
            className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping"
            style={{ background: dot, opacity: 0.6 }}
          />
        )}
      </span>
      {label}
    </span>
  )
}
