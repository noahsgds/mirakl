const RECO_MAP = {
  QUALIFIE: { bg: 'rgba(22,163,74,0.08)',  color: '#16a34a', border: 'rgba(22,163,74,0.22)' },
  A_REVOIR: { bg: 'rgba(217,119,6,0.08)',  color: '#d97706', border: 'rgba(217,119,6,0.22)' },
  REJETE:   { bg: 'rgba(220,38,38,0.07)',  color: '#dc2626', border: 'rgba(220,38,38,0.18)' },
}

export default function RecoBadge({ value }) {
  if (!value) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>

  const s = RECO_MAP[value] || { bg: 'rgba(107,114,128,0.07)', color: '#6b7280', border: 'rgba(107,114,128,0.16)' }

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
    }}>
      {value}
    </span>
  )
}
