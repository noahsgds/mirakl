import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function ABTestChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="metric" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#6B7280' }} />
        <Tooltip
          formatter={(v) => [`${v.toFixed(1)}%`]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Legend />
        <Bar dataKey="A" name="Variant A" fill="#1B3A5C" radius={[4, 4, 0, 0]} />
        <Bar dataKey="B" name="Variant B" fill="#E8445A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
