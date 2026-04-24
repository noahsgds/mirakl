/**
 * Config central — 8 catégories produit avec leurs marketplaces cibles.
 *
 * Chaque catégorie map vers :
 *   - label : nom FR affiché
 *   - emoji : deprecated (kept for backward compatibility)
 *   - color : palette Tailwind-compat (pour badges / tuiles)
 *   - marketplaces : array de partenaires Mirakl auxquels on pitche ces sellers
 *
 * Utilisé par :
 *   - Scraping.jsx (selector + breakdown)
 *   - Leads.jsx (filtre + badges)
 *   - Analytics.jsx (per-category KPIs)
 *   - Home.jsx (subtitle dynamique)
 *   - Layout.jsx (footer)
 *
 * NB : les keys ici DOIVENT matcher `amazon_sellers.category` et
 * `scraping_jobs.category` côté Supabase (check constraint).
 */

export const CATEGORIES = [
  {
    key: 'mode',
    label: 'Mode',
    emoji: '',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    marketplaces: ['Zalando', 'Galeries Lafayette', 'La Redoute', 'ASOS'],
    description: 'Vêtements, chaussures, accessoires, lingerie, maroquinerie',
  },
  {
    key: 'beaute',
    label: 'Beauté',
    emoji: '',
    color: 'from-fuchsia-500 to-purple-500',
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    marketplaces: ['Sephora', 'Nocibé', 'Marionnaud', 'Douglas'],
    description: 'Parfum, maquillage, soins visage & corps, cheveux',
  },
  {
    key: 'maison',
    label: 'Maison',
    emoji: '',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    marketplaces: ['Maisons du Monde', 'La Redoute Intérieurs', 'Conforama', 'But'],
    description: 'Déco, mobilier, linge de maison, luminaires',
  },
  {
    key: 'sport',
    label: 'Sport',
    emoji: '',
    color: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    marketplaces: ['Decathlon', 'Go Sport', 'Intersport', 'Nike Direct'],
    description: 'Équipement sport, running, fitness, outdoor',
  },
  {
    key: 'enfant',
    label: 'Enfant & Bébé',
    emoji: '',
    color: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    marketplaces: ['Oxybul', 'King Jouet', 'JouéClub', 'La Grande Récré'],
    description: 'Jouets, puériculture, vêtements enfant',
  },
  {
    key: 'electronique',
    label: 'Électronique',
    emoji: '',
    color: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    marketplaces: ['Fnac', 'Boulanger', 'Darty', 'Cdiscount'],
    description: 'High-tech, audio, accessoires mobile, gaming',
  },
  {
    key: 'culture',
    label: 'Culture',
    emoji: '',
    color: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    marketplaces: ['Fnac', 'Cultura', 'Gibert', 'Decitre'],
    description: 'Livres, BD, musique, films, jeux vidéo',
  },
  {
    key: 'bricolage',
    label: 'Bricolage',
    emoji: '',
    color: 'from-orange-600 to-red-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    marketplaces: ['Leroy Merlin', 'Castorama', 'Mr Bricolage', 'ManoMano'],
    description: 'Outillage, peinture, jardinage, matériel de construction',
  },
]

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
)

/**
 * Retourne un objet catégorie par sa key, avec fallback "mode" si inconnu.
 */
export function getCategory(key) {
  return CATEGORY_BY_KEY[key] || CATEGORY_BY_KEY.mode
}

/**
 * Retourne le label human-readable d'une catégorie (ou la key brute).
 */
export function categoryLabel(key) {
  return CATEGORY_BY_KEY[key]?.label || key
}

/**
 * Retourne la liste des marketplaces cibles pour une catégorie.
 */
export function marketplacesFor(categoryKey) {
  return CATEGORY_BY_KEY[categoryKey]?.marketplaces || []
}

/**
 * Retourne l'ancien champ emoji (deprecated).
 */
export function categoryEmoji(key) {
  return CATEGORY_BY_KEY[key]?.emoji || ''
}
