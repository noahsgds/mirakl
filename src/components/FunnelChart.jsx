import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const FUNNEL_ORDER = [
  { key: 'A_SCORER',          label: 'À scorer',    color: '#4C5180' },
  { key: 'scored',            label: 'Scorés',      color: '#FFB020' },
  { key: 'enriched',          label: 'Enrichis',    color: '#C084FC' },
  { key: 'sequence_en_cours', label: 'En séquence', color: '#7B6FFF' },
  { key: 'sequence_terminee', label: 'Terminée',    color: '#8890B8' },
  { key: 'HOT',               label: 'HOT',         color: '#FF3358' },
  { key: 'REPLIED',           label: 'Réponses',    color: '#00C97B' },
]

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-3)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: 'var(--text)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: 'var(--text-2)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
        {payload[0].value} <span style={{ color: 'var(--text-3)' }}>leads</span>
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
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(120,128,200,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#4C5180', fontFamily: 'DM Mono, monospace' }}
          axisLine={{ stroke: 'rgba(120,128,200,0.1)' }}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: '#8890B8', fontFamily: 'Outfit, sans-serif' }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(120,128,200,0.04)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
