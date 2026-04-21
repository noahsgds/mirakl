export default function KPICard({ title, value, icon: Icon, color = '#1B3A5C', sub }) {
  return (
    <div className="card flex items-start gap-4">
      <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-muted font-medium">{title}</p>
        <p className="text-2xl font-bold text-text mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
