const STATUS_MAP = {
  HOT:                     { bg: 'rgba(255,51,88,0.12)',  color: '#FF3358', border: 'rgba(255,51,88,0.28)',  glow: '0 0 7px rgba(255,51,88,0.18)' },
  REPLIED:                 { bg: 'rgba(0,224,192,0.1)',   color: '#00E0C0', border: 'rgba(0,224,192,0.22)' },
  sequence_en_cours:       { bg: 'rgba(123,111,255,0.1)', color: '#7B6FFF', border: 'rgba(123,111,255,0.22)' },
  sequence_terminee:       { bg: 'rgba(76,81,128,0.15)',  color: '#8890B8', border: 'rgba(76,81,128,0.3)' },
  enriched:                { bg: 'rgba(192,132,252,0.1)', color: '#C084FC', border: 'rgba(192,132,252,0.22)' },
  scored:                  { bg: 'rgba(255,176,32,0.1)',  color: '#FFB020', border: 'rgba(255,176,32,0.22)' },
  enrichment_failed:       { bg: 'rgba(255,51,88,0.07)',  color: '#FF7088', border: 'rgba(255,51,88,0.16)' },
  enrichment_failed_final: { bg: 'rgba(255,51,88,0.07)',  color: '#FF7088', border: 'rgba(255,51,88,0.16)' },
  generation_failed:       { bg: 'rgba(255,51,88,0.07)',  color: '#FF7088', border: 'rgba(255,51,88,0.16)' },
  REJETE_FILTRE:           { bg: 'rgba(255,51,88,0.07)',  color: '#FF7088', border: 'rgba(255,51,88,0.16)' },
  A_SCORER:                { bg: 'rgba(120,128,200,0.07)', color: '#8890B8', border: 'rgba(120,128,200,0.14)' },
  BOUNCE:                  { bg: 'rgba(255,138,50,0.1)',  color: '#FF8A32', border: 'rgba(255,138,50,0.22)' },
  UNSUBSCRIBED:            { bg: 'rgba(76,81,128,0.1)',   color: '#4C5180', border: 'rgba(76,81,128,0.2)' },
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

  const s = STATUS_MAP[status] || { bg: 'rgba(120,128,200,0.07)', color: '#8890B8', border: 'rgba(120,128,200,0.14)' }
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
      boxShadow: s.glow || 'none',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
