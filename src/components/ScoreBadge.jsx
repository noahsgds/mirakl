export default function ScoreBadge({ score }) {
  if (score == null) return <span className="text-ink-300 text-xs">—</span>
  const tier =
    score >= 70
      ? { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-200/70', dot: '#10B981' }
      : score >= 50
      ? { bg: 'bg-amber-50',   fg: 'text-amber-700',   ring: 'ring-amber-200/70',   dot: '#D97706' }
      : { bg: 'bg-rose-50',    fg: 'text-rose-600',    ring: 'ring-rose-200/70',    dot: '#E11D48' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-bold tnum ring-1 ring-inset ${tier.bg} ${tier.fg} ${tier.ring}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.dot }} />
      {score}
    </span>
  )
}
