const STYLES = {
  QUALIFIE: 'bg-green-100 text-green-700 border border-green-200',
  A_REVOIR: 'bg-amber-100 text-amber-700 border border-amber-200',
  REJETE: 'bg-red-100 text-red-600 border border-red-200',
}

export default function RecoBadge({ value }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  const style = STYLES[value] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {value}
    </span>
  )
}
