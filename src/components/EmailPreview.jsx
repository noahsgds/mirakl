import { useState } from 'react'

export default function EmailPreview({ emails }) {
  const [tab, setTab] = useState(0)
  const tabs = [
    { label: 'J0', objet: emails?.mail1_objet, html: emails?.mail1_html },
    { label: 'J+3', objet: emails?.mail2_objet, html: emails?.mail2_html },
    { label: 'J+6', objet: emails?.mail3_objet, html: emails?.mail3_html },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              tab === i ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs[tab].objet && (
        <div className="mb-2 text-sm">
          <span className="font-medium text-muted">Objet :</span>{' '}
          <span className="text-text">{tabs[tab].objet}</span>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {tabs[tab].html ? (
          <iframe
            srcDoc={tabs[tab].html}
            sandbox="allow-same-origin"
            className="w-full min-h-[320px]"
            title={`Email ${tabs[tab].label}`}
          />
        ) : (
          <div className="p-8 text-center text-muted text-sm">Email non généré pour cette étape</div>
        )}
      </div>
    </div>
  )
}
