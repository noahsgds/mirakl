const STATUS_MAP = {
  HOT:                     { bg: 'rgba(220,38,38,0.08)',  color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
  REPLIED:                 { bg: 'rgba(22,163,74,0.08)',  color: '#16a34a', border: 'rgba(22,163,74,0.2)' },
  sequence_en_cours:       { bg: 'rgba(39,100,255,0.08)', color: '#2764ff', border: 'rgba(39,100,255,0.2)' },
  sequence_terminee:       { bg: 'rgba(107,114,128,0.08)', color: '#6b7280', border: 'rgba(107,114,128,0.18)' },
  enriched:                { bg: 'rgba(124,58,237,0.07)', color: '#7c3aed', border: 'rgba(124,58,237,0.18)' },
  scored:                  { bg: 'rgba(217,119,6,0.08)',  color: '#d97706', border: 'rgba(217,119,6,0.2)' },
  enrichment_failed:       { bg: 'rgba(220,38,38,0.06)',  color: '#dc2626', border: 'rgba(220,38,38,0.15)' },
  enrichment_failed_final: { bg: 'rgba(220,38,38,0.06)',  color: '#dc2626', border: 'rgba(220,38,38,0.15)' },
  generation_failed:       { bg: 'rgba(220,38,38,0.06)',  color: '#dc2626', border: 'rgba(220,38,38,0.15)' },
  REJETE_FILTRE:           { bg: 'rgba(220,38,38,0.06)',  color: '#ef4444', border: 'rgba(220,38,38,0.15)' },
  A_SCORER:                { bg: 'rgba(107,114,128,0.07)', color: '#6b7280', border: 'rgba(107,114,128,0.16)' },
  BOUNCE:                  { bg: 'rgba(234,88,12,0.08)',  color: '#ea580c', border: 'rgba(234,88,12,0.2)' },
  UNSUBSCRIBED:            { bg: 'rgba(107,114,128,0.06)', color: '#9ca3af', border: 'rgba(107,114,128,0.14)' },
}

const STATUS_LABELS = {
  sequence_en_cours:       'En séquence',
  sequence_terminee:       'Terminée',
  enrichment_failed:       'Enrich. échoué',
  enrichment_failed_final: 'Enrich. échoué (final)',
  generation_failed:       'Génér. échouée',
  REJETE_FILTRE:           'Rejeté filtre',
  A_SCORER:                'À scorer',
}

export default function StatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>

  const s = STATUS_MAP[status] || { bg: 'rgba(107,114,128,0.07)', color: '#6b7280', border: 'rgba(107,114,128,0.16)' }
  const label = STATUS_LABELS[status] || status

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: 'Outfit, sans-serif',
      letterSpacing: '0.01em',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
