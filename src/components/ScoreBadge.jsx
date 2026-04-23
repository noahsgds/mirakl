export default function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>

  const [bg, color, border] =
    score >= 70 ? ['rgba(0,201,123,0.1)', '#00C97B', 'rgba(0,201,123,0.22)']
    : score >= 50 ? ['rgba(255,176,32,0.1)', '#FFB020', 'rgba(255,176,32,0.22)']
    : ['rgba(255,51,88,0.1)', '#FF3358', 'rgba(255,51,88,0.22)']

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: 'DM Mono, monospace',
      letterSpacing: '-0.01em',
      background: bg,
      color,
      border: `1px solid ${border}`,
    }}>
      {score}
    </span>
  )
}
