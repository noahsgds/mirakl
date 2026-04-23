import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const FUNNEL_ORDER = [
  { key: 'A_SCORER',          label: 'À scorer',    color: '#b5bfc8' },
  { key: 'scored',            label: 'Scorés',      color: '#f59e0b' },
  { key: 'enriched',          label: 'Enrichis',    color: '#7c3aed' },
  { key: 'sequence_en_cours', label: 'En séquence', color: '#2764ff' },
  { key: 'sequence_terminee', label: 'Terminée',    color: '#6b7280' },
  { key: 'HOT',               label: 'HOT',         color: '#dc2626' },
  { key: 'REPLIED',           label: 'Réponses',    color: '#16a34a' },
]

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: 'var(--text)',
      boxShadow: '0 8px 24px rgba(16,43,73,0.12)',
    }}>
      <p style={{ color: 'var(--text-3)', marginBottom: '2px', fontSize: '11px' }}>{label}</p>
      <p style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text)' }}>
        {payload[0].value} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>leads</span>
      </p>
    </div>
  )
}

export default function FunnelChart({ counts }) {
  const data = FUNNEL_ORDER.map(({ key, label, color }) => ({
    name: label,
    value: counts[key] || 0,
    color,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: 'var(--text-2)', fontFamily: 'Outfit, sans-serif' }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
