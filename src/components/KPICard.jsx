export default function KPICard({ title, value, icon: Icon, color = '#2764ff', sub }) {
  return (
    <div
      className="card relative overflow-hidden"
      style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,43,73,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: `linear-gradient(to right, ${color}60, transparent)` }}
      />

      <div className="flex items-start gap-3.5 pt-1">
        <div
          className="rounded-xl p-2.5 flex-shrink-0"
          style={{
            background: color + '12',
            border: `1px solid ${color}20`,
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.08em' }}>
            {title}
          </p>
          <p
            className="mt-1 font-mono font-medium leading-none"
            style={{ fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}
          >
            {value ?? '—'}
          </p>
          {sub && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
          )}
        </div>
      </div>
    </div>
  )
}
