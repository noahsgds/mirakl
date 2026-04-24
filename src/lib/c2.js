/**
 * C2 data layer — BDR Outreach Cockpit
 * Hardcoded local snapshot from CSV exports.
 */
import sellersData from '../data/c2_sellers.json'
import marketplacesData from '../data/c2_marketplaces.json'
import matchesData from '../data/c2_matches.json'

const C2_STORAGE_KEY = 'mirakl_c2_store_v1'
const sellersStore = sellersData.map((item) => ({ ...item }))
const marketplacesStore = marketplacesData.map((item) => ({ ...item }))
const matchesStore = matchesData.map((item) => ({ ...item }))
const emailsStore = []
const sequencesStore = []
const workflowConfigStore = new Map()
const DEMO_BATCH_SIZES = [8, 9, 11, 13, 15, 17, 19, 22, 24, 27]
let demoScrapeIndex = 0
let demoApolloIndex = 0
let demoMatchingIndex = 0
let nextSellerId = 1

const WORD_A = ['North', 'Urban', 'Prime', 'Golden', 'Atlas', 'Nova', 'Summit', 'Echo', 'Nimbus', 'Cobalt']
const WORD_B = ['Studio', 'Collective', 'Works', 'Supply', 'House', 'Brands', 'Lab', 'Living', 'Goods', 'Craft']
const CATEGORIES = ['Fashion', 'Home & Lifestyle', 'Beauty', 'Sportswear', 'Outdoor', 'Accessories']
const COUNTRIES = ['FR', 'DE', 'IT', 'ES', 'UK', 'NL', 'SE', 'US']
const TIERS = ['premium', 'mid', 'luxury', 'budget']
const SIZES = ['small', 'medium', 'large', 'enterprise']
const LANGUAGES = ['en', 'fr', 'de', 'it', 'es']
const CONTACT_FIRST = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Avery', 'Riley']
const CONTACT_LAST = ['Martin', 'Leroy', 'Dupont', 'Schmidt', 'Rossi', 'Garcia', 'Brown', 'Silva']
const AESTHETICS = ['minimal', 'modern', 'premium', 'bold', 'heritage', 'eco-friendly', 'design-led']
const CATEGORY_PRODUCT_TAGS = {
  Fashion: ['dresses', 'jackets', 'denim', 'knitwear', 'leather goods', 'premium basics'],
  'Home & Lifestyle': ['decor', 'tableware', 'lighting', 'textiles', 'small furniture', 'gift sets'],
  Beauty: ['skincare', 'serums', 'cleansers', 'fragrance', 'makeup', 'wellness'],
  Sportswear: ['leggings', 'running tops', 'jackets', 'trainers', 'performance gear', 'base layers'],
  Outdoor: ['backpacks', 'hiking shoes', 'outerwear', 'camp accessories', 'travel gear', 'hydration'],
  Accessories: ['handbags', 'jewelry', 'belts', 'sunglasses', 'scarves', 'small leather goods'],
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function highestSellerId(rows) {
  return rows.reduce((max, item) => {
    const id = Number(item?.seller_id ?? 0)
    return Number.isFinite(id) && id > max ? id : max
  }, 0)
}

function replaceArray(target, source) {
  target.splice(0, target.length, ...(source || []).map((item) => ({ ...item })))
}

function persistState() {
  if (!isBrowser()) return
  const payload = {
    sellers: sellersStore,
    matches: matchesStore,
    emails: emailsStore,
    sequences: sequencesStore,
    workflowConfig: Array.from(workflowConfigStore.entries()),
    counters: {
      demoScrapeIndex,
      demoApolloIndex,
      demoMatchingIndex,
      nextSellerId,
    },
  }
  try {
    window.localStorage.setItem(C2_STORAGE_KEY, JSON.stringify(payload))
  } catch (_) {
    // Ignore persistence errors (quota/private mode) and keep in-memory behavior.
  }
}

function hydrateStateFromStorage() {
  if (!isBrowser()) {
    nextSellerId = highestSellerId(sellersStore) + 1
    return
  }
  try {
    const raw = window.localStorage.getItem(C2_STORAGE_KEY)
    if (!raw) {
      nextSellerId = highestSellerId(sellersStore) + 1
      return
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.sellers)) replaceArray(sellersStore, parsed.sellers)
    if (Array.isArray(parsed?.matches)) replaceArray(matchesStore, parsed.matches)
    if (Array.isArray(parsed?.emails)) replaceArray(emailsStore, parsed.emails)
    if (Array.isArray(parsed?.sequences)) replaceArray(sequencesStore, parsed.sequences)

    workflowConfigStore.clear()
    if (Array.isArray(parsed?.workflowConfig)) {
      for (const entry of parsed.workflowConfig) {
        if (Array.isArray(entry) && entry.length >= 2) {
          workflowConfigStore.set(String(entry[0]), String(entry[1]))
        }
      }
    }

    demoScrapeIndex = Number(parsed?.counters?.demoScrapeIndex ?? 0) || 0
    demoApolloIndex = Number(parsed?.counters?.demoApolloIndex ?? 0) || 0
    demoMatchingIndex = Number(parsed?.counters?.demoMatchingIndex ?? 0) || 0
    nextSellerId = Number(parsed?.counters?.nextSellerId ?? 0) || 0
  } catch (_) {
    // Fallback to defaults if local storage is corrupted.
  }
  nextSellerId = Math.max(nextSellerId, highestSellerId(sellersStore) + 1)
}

hydrateStateFromStorage()

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nextBatchSize(kind) {
  if (kind === 'scrape') {
    const size = DEMO_BATCH_SIZES[demoScrapeIndex % DEMO_BATCH_SIZES.length]
    demoScrapeIndex += 1
    return size
  }
  if (kind === 'apollo') {
    const size = DEMO_BATCH_SIZES[demoApolloIndex % DEMO_BATCH_SIZES.length]
    demoApolloIndex += 1
    return size
  }
  const size = DEMO_BATCH_SIZES[demoMatchingIndex % DEMO_BATCH_SIZES.length]
  demoMatchingIndex += 1
  return size
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function makeSellerName(seed) {
  return `${pickOne(WORD_A)} ${pickOne(WORD_B)} ${seed}`
}

function normalizeDomain(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)
}

function randomScore() {
  return Number((55 + Math.random() * 44).toFixed(1))
}

function contactFromSellerName(sellerName) {
  const first = pickOne(CONTACT_FIRST)
  const last = pickOne(CONTACT_LAST)
  const domain = `${normalizeDomain(sellerName)}.com`
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
  }
}

function sampleMany(list, count) {
  const source = [...list]
  const picked = []
  while (source.length > 0 && picked.length < count) {
    const index = randomInt(0, source.length - 1)
    picked.push(source[index])
    source.splice(index, 1)
  }
  return picked
}

function generateSellerProfile(category) {
  const tags = CATEGORY_PRODUCT_TAGS[category] ?? CATEGORY_PRODUCT_TAGS.Fashion
  const selectedTags = sampleMany(tags, 3)
  const nbProducts = randomInt(80, 3200)
  const avgPrice = randomInt(18, 420)
  const shipsInternational = Math.random() > 0.25

  return {
    seller_language: pickOne(LANGUAGES),
    brand_size: pickOne(SIZES),
    nb_products: nbProducts,
    avg_price: avgPrice,
    rating: Number((3.7 + Math.random() * 1.2).toFixed(1)),
    ships_international: shipsInternational,
    key_aesthetic: pickOne(AESTHETICS),
    product_types_list: selectedTags.join(', '),
    top_product_tags: selectedTags.join(', '),
    brand_story_summary: `Independent ${category.toLowerCase()} brand focused on high-quality assortment, strong visual identity, and multichannel expansion readiness.`,
    current_platforms: Math.random() > 0.5 ? 'Shopify, Amazon' : 'Shopify, D2C',
  }
}

function createAutoMatchesForSeller(sellerRow) {
  const already = new Set(matchesStore.map((item) => `${item.seller_id}|${item.marketplace_id}`))
  const marketplacePool = sampleMany(marketplacesStore, Math.min(marketplacesStore.length, randomInt(3, 8)))
  let created = 0
  for (const marketplace of marketplacePool) {
    const key = `${sellerRow.seller_id}|${marketplace.marketplace_id}`
    if (already.has(key)) continue
    matchesStore.push({
      seller_id: sellerRow.seller_id,
      marketplace_id: marketplace.marketplace_id,
      seller_name: sellerRow.seller_name,
      marketplace_name: marketplace.marketplace_name,
      compatibility_score: randomScore(),
      rationale: `${sellerRow.seller_name} aligns with ${marketplace.marketplace_name} on assortment and positioning.`,
      'Top 3 products to push for each marketplace': sellerRow.top_product_tags || sellerRow.product_types_list || null,
      ab_variant: null,
      decision_maker_name: sellerRow.contact_name || null,
      decision_maker_email: sellerRow.contact_email || null,
      decision_maker_title: sellerRow.contact_name ? 'Head of Marketplace' : null,
      decision_maker_linkedin: null,
      statut: Math.random() > 0.6 ? 'enriched' : 'scored',
      enriched: Math.random() > 0.35,
    })
    created += 1
  }
  return created
}

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

export function resolveLeadContact(match, seller = null) {
  const email =
    match?.decision_maker_email ||
    seller?.contact_email ||
    seller?.wholesale_contact_email ||
    null

  const name =
    match?.decision_maker_name ||
    seller?.contact_name ||
    null

  return { email, name }
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
  persistState()

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
  persistState()

  return { data: match ? { ...match } : null, error: null }
}

export async function saveWorkflowConfigKey({ key, value }) {
  workflowConfigStore.set(key, String(value))
  persistState()
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
  const category = payload.categories ?? pickOne(CATEGORIES)
  const generatedProfile = generateSellerProfile(category)
  const row = {
    seller_id: nextSellerId++,
    seller_name: payload.seller_name,
    seller_url: payload.seller_url,
    categories: category,
    country_origin: payload.country_origin ?? null,
    brand_tier: payload.brand_tier ?? null,
    contact_name: payload.contact_name ?? null,
    contact_email: payload.contact_email ?? null,
    brand_name: payload.seller_name,
    seller_language: generatedProfile.seller_language,
    brand_size: generatedProfile.brand_size,
    nb_products: generatedProfile.nb_products,
    avg_price: generatedProfile.avg_price,
    rating: generatedProfile.rating,
    ships_international: generatedProfile.ships_international,
    key_aesthetic: generatedProfile.key_aesthetic,
    product_types_list: generatedProfile.product_types_list,
    top_product_tags: generatedProfile.top_product_tags,
    brand_story_summary: generatedProfile.brand_story_summary,
    current_platforms: generatedProfile.current_platforms,
    created_at: now,
    updated_at: now,
  }
  sellersStore.push(row)
  const matchesCreated = createAutoMatchesForSeller(row)
  persistState()
  return { data: { ...row, matches_created: matchesCreated }, error: null }
}

export async function runScrapingDemoBatch() {
  const batchSize = nextBatchSize('scrape')
  await sleep(1400 + Math.floor(Math.random() * 1800))

  const now = new Date().toISOString()
  const created = []
  for (let i = 0; i < batchSize; i += 1) {
    const seed = nextSellerId + i
    const sellerName = makeSellerName(seed)
    const sellerUrl = `https://${normalizeDomain(sellerName)}.com`

    const duplicate = sellersStore.find(
      (item) => String(item.seller_url ?? '').toLowerCase() === sellerUrl.toLowerCase(),
    )
    if (duplicate) continue

    const row = {
      seller_id: nextSellerId++,
      seller_name: sellerName,
      brand_name: sellerName,
      seller_url: sellerUrl,
      categories: pickOne(CATEGORIES),
      country_origin: pickOne(COUNTRIES),
      brand_tier: pickOne(TIERS),
      created_at: now,
      updated_at: now,
    }
    const profile = generateSellerProfile(row.categories)
    const hasContact = Math.random() > 0.28
    if (hasContact) {
      const contact = contactFromSellerName(sellerName)
      row.contact_name = contact.name
      row.contact_email = contact.email
    } else {
      row.contact_name = null
      row.contact_email = null
    }
    Object.assign(row, profile)
    sellersStore.push(row)
    createAutoMatchesForSeller(row)
    created.push(row)
  }

  const found = created.length + Math.floor(Math.random() * 6)
  const skipped = Math.max(0, found - created.length)
  const errored = Math.floor(Math.random() * 2)
  persistState()

  return {
    data: {
      batchSize,
      found,
      imported: created.length,
      skipped,
      errored,
      rows: created.map((item) => ({ ...item })),
    },
    error: null,
  }
}

export async function runApolloContactDemoBatch() {
  const batchSize = nextBatchSize('apollo')
  await sleep(1300 + Math.floor(Math.random() * 1700))

  const candidates = sellersStore.filter((item) => !item.contact_email && !item.wholesale_contact_email)
  const updates = candidates.slice(0, batchSize).map((seller) => {
    const c = contactFromSellerName(seller.seller_name || seller.brand_name || `seller${seller.seller_id}`)
    seller.contact_name = c.name
    seller.contact_email = c.email
    seller.updated_at = new Date().toISOString()
    return { seller_id: seller.seller_id, seller_name: seller.seller_name, contact_email: seller.contact_email }
  })
  persistState()

  return {
    data: {
      batchSize,
      updated: updates.length,
      remainingWithoutContact: sellersStore.filter((item) => !item.contact_email && !item.wholesale_contact_email).length,
      rows: updates,
    },
    error: null,
  }
}

export async function runMatchingDemoBatch() {
  const batchSize = nextBatchSize('matching')
  await sleep(1500 + Math.floor(Math.random() * 1900))

  const existingPairs = new Set(matchesStore.map((item) => `${item.seller_id}|${item.marketplace_id}`))
  const sellersWithoutAnyMatches = sellersStore.filter((seller) => !matchesStore.some((m) => String(m.seller_id) === String(seller.seller_id)))
  const sellerPool = sellersWithoutAnyMatches.length ? sellersWithoutAnyMatches : sellersStore

  const created = []
  for (const seller of sellerPool) {
    if (created.length >= batchSize) break
    const toCreate = Math.min(3, batchSize - created.length)
    for (let i = 0; i < toCreate; i += 1) {
      const marketplace = marketplacesStore[Math.floor(Math.random() * marketplacesStore.length)]
      if (!marketplace) break
      const key = `${seller.seller_id}|${marketplace.marketplace_id}`
      if (existingPairs.has(key)) continue

      const row = {
        seller_id: seller.seller_id,
        marketplace_id: marketplace.marketplace_id,
        seller_name: seller.seller_name,
        marketplace_name: marketplace.marketplace_name,
        compatibility_score: randomScore(),
        rationale: `Strong category and assortment overlap between ${seller.seller_name} and ${marketplace.marketplace_name}.`,
        'Top 3 products to push for each marketplace': seller.product_sample || seller.top_product_tags || null,
        ab_variant: null,
        decision_maker_name: null,
        decision_maker_email: null,
        decision_maker_title: null,
        decision_maker_linkedin: null,
        statut: 'scored',
        enriched: false,
      }
      matchesStore.push(row)
      existingPairs.add(key)
      created.push(row)
      if (created.length >= batchSize) break
    }
  }
  persistState()

  return {
    data: {
      batchSize,
      added: created.length,
      rows: created.map((item) => ({ ...item })),
    },
    error: null,
  }
}
