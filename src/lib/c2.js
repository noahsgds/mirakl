/**
 * C2 data layer — BDR Outreach Cockpit
 * Hardcoded local snapshot from CSV exports.
 */
import sellersData from '../data/c2_sellers.json'
import marketplacesData from '../data/c2_marketplaces.json'
import matchesData from '../data/c2_matches.json'

const sellersStore = sellersData.map((item) => ({ ...item }))
const marketplacesStore = marketplacesData.map((item) => ({ ...item }))
const matchesStore = matchesData.map((item) => ({ ...item }))
const emailsStore = []
const sequencesStore = []
const workflowConfigStore = new Map()

const maxSellerId = sellersStore.reduce((max, item) => {
  const id = Number(item?.seller_id ?? 0)
  return Number.isFinite(id) && id > max ? id : max
}, 0)
let nextSellerId = maxSellerId + 1

/* ── Derived field helpers ──────────────────────────── */

export function fitBand(score) {
  if (score == null) return 'unknown'
  if (score >= 85)   return 'excellent'
  if (score >= 70)   return 'strong'
  if (score >= 55)   return 'moderate'
  return 'weak'
}

export function fitBandLabel(score) {
  const b = fitBand(score)
  return { excellent: 'Excellent', strong: 'Strong', moderate: 'Moderate', weak: 'Weak', unknown: '—' }[b]
}

export function fitBandColor(score) {
  const b = fitBand(score)
  return {
    excellent: 'bg-emerald-100 text-emerald-700',
    strong:    'bg-blue-100 text-blue-700',
    moderate:  'bg-amber-100 text-amber-700',
    weak:      'bg-red-100 text-red-700',
    unknown:   'bg-gray-100 text-gray-500',
  }[b]
}

export function sendReadiness(match) {
  if (!match.decision_maker_email) return 'missing_contact'
  if (!match.rationale)            return 'missing_reasoning'
  if (match.statut === 'sequence_en_cours') return 'in_campaign'
  if (match.statut === 'sequence_terminee') return 'completed'
  return 'ready'
}

export function readinessLabel(match) {
  return {
    missing_contact:   'No contact',
    missing_reasoning: 'Missing rationale',
    in_campaign:       'In progress',
    completed:         'Completed',
    ready:             'Ready',
  }[sendReadiness(match)] ?? '—'
}

export function readinessColor(match) {
  return {
    missing_contact:   'bg-red-100 text-red-700',
    missing_reasoning: 'bg-amber-100 text-amber-700',
    in_campaign:       'bg-blue-100 text-blue-700',
    completed:         'bg-gray-100 text-gray-500',
    ready:             'bg-emerald-100 text-emerald-700',
  }[sendReadiness(match)] ?? 'bg-gray-100 text-gray-500'
}

/* ── Local hardcoded fetchers ───────────────────────── */

function compareValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export async function fetchMatches({ limit = 500, orderBy = 'compatibility_score', asc = false } = {}) {
  const sorted = [...matchesStore].sort((x, y) => {
    const cmp = compareValues(x?.[orderBy], y?.[orderBy])
    return asc ? cmp : -cmp
  })
  return { data: sorted.slice(0, limit), error: null }
}

export async function fetchSellers({ limit = 500 } = {}) {
  const sorted = [...sellersStore].sort((x, y) => compareValues(x?.seller_name, y?.seller_name))
  return { data: sorted.slice(0, limit), error: null }
}

export async function fetchMarketplaces() {
  const sorted = [...marketplacesStore].sort((x, y) => compareValues(x?.marketplace_name, y?.marketplace_name))
  return { data: sorted, error: null }
}

export async function fetchEmails() {
  return { data: emailsStore.map((item) => ({ ...item })), error: null }
}

export async function fetchSequences() {
  return { data: sequencesStore.map((item) => ({ ...item })), error: null }
}

export async function fetchWorkflowConfig() {
  const data = Array.from(workflowConfigStore.entries()).map(([key, value]) => ({ key, value }))
  return { data, error: null }
}

function findMatchByIds(sellerId, marketplaceId) {
  return matchesStore.find(
    (item) => String(item.seller_id) === String(sellerId) && String(item.marketplace_id) === String(marketplaceId),
  )
}

function buildDefaultEmailRow(sellerId, marketplaceId) {
  const match = findMatchByIds(sellerId, marketplaceId)
  const sellerName = match?.seller_name ?? 'Seller'
  const marketplaceName = match?.marketplace_name ?? 'Marketplace'
  const firstName = match?.decision_maker_name ? String(match.decision_maker_name).split(' ')[0] : 'there'

  return {
    seller_id: sellerId,
    marketplace_id: marketplaceId,
    selected_variant_j0: null,
    selected_variant_j3: null,
    selected_variant_j6: null,
    phase_1_bref_objet: `Mirakl + ${sellerName}: opportunity on ${marketplaceName}`,
    phase_1_bref_html: `<p>Hi ${firstName},</p><p>I would love to share a quick fit summary for <b>${sellerName}</b> on <b>${marketplaceName}</b>.</p><p>Open to a 15-minute chat?</p>`,
    phase_1_full_objet: `${sellerName} x ${marketplaceName}: launch plan`,
    phase_1_full_html: `<p>Hi ${firstName},</p><p>Based on our matching data, <b>${sellerName}</b> looks like a strong fit for <b>${marketplaceName}</b>.</p><p>I can share recommended next steps and expected impact if helpful.</p>`,
    phase_2_bref_objet: `Following up: ${sellerName} on ${marketplaceName}`,
    phase_2_bref_html: `<p>Hi ${firstName},</p><p>Quick follow-up in case my previous note got buried. Happy to send a concise recommendation memo.</p>`,
    phase_2_full_objet: `Second touchpoint: fit details for ${sellerName}`,
    phase_2_full_html: `<p>Hi ${firstName},</p><p>I prepared a detailed rationale for why <b>${sellerName}</b> is a good candidate for <b>${marketplaceName}</b>, including category and positioning alignment.</p>`,
    phase_3_bref_objet: `Last follow-up for ${sellerName}`,
    phase_3_bref_html: `<p>Hi ${firstName},</p><p>Last note from me. Should I close this loop, or would a short call be useful?</p>`,
    phase_3_full_objet: `Closing the loop: ${sellerName} recommendation`,
    phase_3_full_html: `<p>Hi ${firstName},</p><p>Closing the loop on this recommendation. I can adapt the proposal to your priorities if you are interested.</p>`,
    updated_at: new Date().toISOString(),
  }
}

export async function saveEmailSelection({ sellerId, marketplaceId, phaseKey, variant }) {
  const columnByPhase = {
    j0: 'selected_variant_j0',
    j3: 'selected_variant_j3',
    j6: 'selected_variant_j6',
  }
  const column = columnByPhase[phaseKey]
  if (!column) {
    return { data: null, error: { message: `Unknown phase key: ${phaseKey}` } }
  }

  let row = emailsStore.find(
    (item) => String(item.seller_id) === String(sellerId) && String(item.marketplace_id) === String(marketplaceId),
  )
  if (!row) {
    row = buildDefaultEmailRow(sellerId, marketplaceId)
    emailsStore.push(row)
  }
  row[column] = variant
  row.updated_at = new Date().toISOString()

  return { data: { ...row }, error: null }
}

export async function markSequenceInProgress({ sellerId, marketplaceId }) {
  const match = findMatchByIds(sellerId, marketplaceId)
  if (match) {
    match.statut = 'sequence_en_cours'
  }

  const now = new Date().toISOString()
  sequencesStore.push({
    seller_id: sellerId,
    marketplace_id: marketplaceId,
    statut: 'sequence_en_cours',
    launched_at: now,
  })

  return { data: match ? { ...match } : null, error: null }
}

export async function saveWorkflowConfigKey({ key, value }) {
  workflowConfigStore.set(key, String(value))
  return { data: { key, value: String(value) }, error: null }
}

export async function addSellerLocal(payload) {
  const existing = sellersStore.find(
    (item) => String(item.seller_url ?? '').toLowerCase() === String(payload.seller_url ?? '').toLowerCase(),
  )
  if (existing) {
    return { data: null, error: { message: `Domain already exists: "${existing.seller_name}".` } }
  }

  const now = new Date().toISOString()
  const row = {
    seller_id: nextSellerId++,
    seller_name: payload.seller_name,
    seller_url: payload.seller_url,
    categories: payload.categories ?? null,
    country_origin: payload.country_origin ?? null,
    brand_tier: payload.brand_tier ?? null,
    contact_name: payload.contact_name ?? null,
    contact_email: payload.contact_email ?? null,
    created_at: now,
    updated_at: now,
  }
  sellersStore.push(row)
  return { data: { ...row }, error: null }
}
