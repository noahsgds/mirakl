export default function KPICard({ title, value, icon: Icon, color = '#FF3358', sub }) {
  return (
    <div
      className="card relative overflow-hidden"
      style={{ transition: 'border-color 0.2s, background 0.2s' }}
    >
      {/* Corner glow */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: color + '0A', filter: 'blur(24px)' }}
      />

      <div className="relative flex items-start gap-3.5">
        <div
          className="rounded-lg p-2.5 flex-shrink-0"
          style={{
            background: color + '12',
            border: `1px solid ${color}22`,
          }}
        >
          <Icon size={17} style={{ color }} />
        </div>

        <div className="min-w-0">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-3)', letterSpacing: '0.1em' }}
          >
            {title}
          </p>
          <p
            className="mt-1 font-mono font-medium leading-none"
            style={{
              fontSize: '1.7rem',
              letterSpacing: '-0.04em',
              color: 'var(--text)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {value ?? '—'}
          </p>
          {sub && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
