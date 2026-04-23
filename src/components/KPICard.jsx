export default function KPICard({ title, value, icon: Icon, color = '#1B3A5C', sub }) {
  return (
    <div className="card group relative overflow-hidden">
      {/* soft corner glow tied to the metric color */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.08] group-hover:opacity-[0.14] transition-opacity duration-500"
        style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
      />
      <div className="relative flex items-start gap-4">
        <div
          className="rounded-xl p-2.5 flex-shrink-0 ring-1 ring-inset"
          style={{
            background: color + '14',
            color,
            boxShadow: `inset 0 1px 0 ${color}10`,
          }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{title}</p>
          <p className="font-display text-[34px] leading-[1.05] tracking-tightest text-text mt-1 tnum">
            {value ?? <span className="text-ink-200">—</span>}
          </p>
          {sub && <p className="text-2xs text-muted mt-1.5 leading-snug">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
