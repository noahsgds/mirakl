const STYLES = {
  QUALIFIE: { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-200/70', dot: '#10B981' },
  A_REVOIR: { bg: 'bg-amber-50',   fg: 'text-amber-700',   ring: 'ring-amber-200/70',   dot: '#D97706' },
  REJETE:   { bg: 'bg-rose-50',    fg: 'text-rose-600',    ring: 'ring-rose-200/70',    dot: '#E11D48' },
}

const LABELS = {
  QUALIFIE: 'Qualifié',
  A_REVOIR: 'À revoir',
  REJETE:   'Rejeté',
}

export default function RecoBadge({ value }) {
  if (!value) return <span className="text-ink-300 text-xs">—</span>
  const s = STYLES[value] || { bg: 'bg-ink-50', fg: 'text-ink-500', ring: 'ring-ink-100', dot: '#94A3B8' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide ring-1 ring-inset ${s.bg} ${s.fg} ${s.ring}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {LABELS[value] || value}
    </span>
  )
}
