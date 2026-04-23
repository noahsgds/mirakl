const RECO_MAP = {
  QUALIFIE: { bg: 'rgba(0,201,123,0.1)',   color: '#00C97B', border: 'rgba(0,201,123,0.22)' },
  A_REVOIR: { bg: 'rgba(255,176,32,0.1)',  color: '#FFB020', border: 'rgba(255,176,32,0.22)' },
  REJETE:   { bg: 'rgba(255,51,88,0.09)',  color: '#FF5577', border: 'rgba(255,51,88,0.2)' },
}

export default function RecoBadge({ value }) {
  if (!value) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>

  const s = RECO_MAP[value] || { bg: 'rgba(120,128,200,0.07)', color: '#8890B8', border: 'rgba(120,128,200,0.14)' }

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
