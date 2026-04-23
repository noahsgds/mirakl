export default function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>

  const [bg, color, border] =
    score >= 70 ? ['rgba(22,163,74,0.08)',  '#16a34a', 'rgba(22,163,74,0.22)']
    : score >= 50 ? ['rgba(217,119,6,0.08)', '#d97706', 'rgba(217,119,6,0.22)']
    : ['rgba(220,38,38,0.08)', '#dc2626', 'rgba(220,38,38,0.22)']

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
