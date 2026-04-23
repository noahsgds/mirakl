/**
 * C2 data layer — BDR Outreach Cockpit
 * All queries read from C2-only tables:
 *   sellers, marketplaces, seller_marketplace_matches,
 *   seller_emails_campagne_1, seller_sequence_campagne_1,
 *   email_templates_campagne_1, workflow_config_campagne_1
 */

import { supabase } from './supabase'

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
    missing_contact:   'Pas de contact',
    missing_reasoning: 'Sans rationale',
    in_campaign:       'En cours',
    completed:         'Terminé',
    ready:             'Prêt',
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

/* ── Supabase fetchers ──────────────────────────────── */

export async function fetchMatches({ limit = 500, orderBy = 'compatibility_score', asc = false } = {}) {
  const { data, error } = await supabase
    .from('seller_marketplace_matches')
    .select('*')
    .order(orderBy, { ascending: asc })
    .limit(limit)
  return { data: data ?? [], error }
}

export async function fetchSellers({ limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .order('seller_name', { ascending: true })
    .limit(limit)
  return { data: data ?? [], error }
}

export async function fetchMarketplaces() {
  const { data, error } = await supabase
    .from('marketplaces')
    .select('*')
    .order('marketplace_name', { ascending: true })
  return { data: data ?? [], error }
}

export async function fetchEmails() {
  const { data, error } = await supabase
    .from('seller_emails_campagne_1')
    .select('*')
  return { data: data ?? [], error }
}

export async function fetchSequences() {
  const { data, error } = await supabase
    .from('seller_sequence_campagne_1')
    .select('*')
  return { data: data ?? [], error }
}

export async function fetchWorkflowConfig() {
  const { data, error } = await supabase
    .from('workflow_config_campagne_1')
    .select('*')
  return { data: data ?? [], error }
}
