export default function ScoreBadge({ score }) {
  if (score == null) return <span className="text-gray-400 text-xs">—</span>
  const color =
    score >= 70
      ? 'bg-green-100 text-green-700 border border-green-200'
      : score >= 50
      ? 'bg-amber-100 text-amber-700 border border-amber-200'
      : 'bg-red-100 text-red-600 border border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}
