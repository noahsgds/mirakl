const STATUS_STYLES = {
  HOT: 'bg-red-100 text-[#E8445A] border border-red-200',
  REPLIED: 'bg-green-100 text-[#2E7D52] border border-green-200',
  sequence_en_cours: 'bg-blue-100 text-blue-700 border border-blue-200',
  sequence_terminee: 'bg-gray-100 text-gray-600 border border-gray-200',
  enriched: 'bg-purple-100 text-purple-700 border border-purple-200',
  scored: 'bg-amber-100 text-amber-700 border border-amber-200',
  enrichment_failed: 'bg-red-50 text-red-600 border border-red-100',
  enrichment_failed_final: 'bg-red-50 text-red-600 border border-red-100',
  generation_failed: 'bg-red-50 text-red-600 border border-red-100',
  REJETE_FILTRE: 'bg-red-50 text-red-600 border border-red-100',
  A_SCORER: 'bg-slate-100 text-slate-600 border border-slate-200',
  BOUNCE: 'bg-orange-100 text-orange-700 border border-orange-200',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const STATUS_LABELS = {
  sequence_en_cours: 'In sequence',
  sequence_terminee: 'Completed',
  enrichment_failed: 'Enrichment failed',
  enrichment_failed_final: 'Enrichment failed (final)',
  generation_failed: 'Generation failed',
  REJETE_FILTRE: 'Filter rejected',
  A_SCORER: 'To score',
}

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'
  const label = STATUS_LABELS[status] || status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
