import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const FUNNEL_ORDER = [
  { key: 'A_SCORER', label: 'To score' },
  { key: 'scored', label: 'Scored' },
  { key: 'enriched', label: 'Enrichis' },
  { key: 'sequence_en_cours', label: 'In sequence' },
  { key: 'sequence_terminee', label: 'Completed' },
  { key: 'HOT', label: 'HOT' },
  { key: 'REPLIED', label: 'Replies' },
]

const COLORS = ['#94A3B8', '#F59E0B', '#7C3AED', '#3B82F6', '#6B7280', '#E8445A', '#2E7D52']

export default function FunnelChart({ counts }) {
  const data = FUNNEL_ORDER.map(({ key, label }, i) => ({
    name: label,
    value: counts[key] || 0,
    color: COLORS[i],
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          width={80}
        />
        <Tooltip
          formatter={(v) => [v, 'Leads']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
