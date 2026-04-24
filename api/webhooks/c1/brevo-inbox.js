import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://ltuarofidogdjhzosboe.supabase.co'

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function pickSenderEmail(payload) {
  return (
    payload?.from?.email ||
    payload?.sender?.email ||
    payload?.senderEmail ||
    payload?.email ||
    payload?.data?.from?.email ||
    payload?.data?.sender?.email ||
    ''
  )
}

function pickConversationSnippet(payload) {
  return (
    payload?.text ||
    payload?.content ||
    payload?.message ||
    payload?.html ||
    payload?.data?.text ||
    payload?.data?.content ||
    ''
  )
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
    res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
    res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Missing Supabase server environment variables',
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const payload = req.body || {}
  const senderEmail = String(pickSenderEmail(payload)).trim().toLowerCase()

  if (!senderEmail) {
    return res.status(400).json({ ok: false, error: 'No sender email found in payload' })
  }

  const { data: leadRows, error: leadError } = await supabase
    .from('seller_qualification')
    .select('seller_id, decision_maker_email')
    .ilike('decision_maker_email', senderEmail)
    .limit(1)

  if (leadError) {
    return res.status(500).json({ ok: false, error: leadError.message })
  }

  if (!leadRows || leadRows.length === 0) {
    return res.status(202).json({ ok: true, matched: false, senderEmail })
  }

  const sellerId = leadRows[0].seller_id
  const snippet = String(pickConversationSnippet(payload)).slice(0, 1200)
  const nowIso = new Date().toISOString()

  const { error: qualError } = await supabase
    .from('seller_qualification')
    .update({
      statut: 'REPLIED',
      notes: snippet ? `Brevo reply received (${nowIso})\n\n${snippet}` : `Brevo reply received (${nowIso})`,
    })
    .eq('seller_id', sellerId)

  if (qualError) {
    return res.status(500).json({ ok: false, error: qualError.message, sellerId })
  }

  const seqUpdate = await supabase
    .from('seller_sequence')
    .update({
      replied: true,
      statut_sequence: 'sequence_en_cours',
    })
    .eq('seller_id', sellerId)
    .select('seller_id')

  if (seqUpdate.error) {
    return res.status(500).json({ ok: false, error: seqUpdate.error.message, sellerId })
  }

  if (!seqUpdate.data || seqUpdate.data.length === 0) {
    const seqInsert = await supabase.from('seller_sequence').insert({
      seller_id: sellerId,
      replied: true,
      statut_sequence: 'sequence_en_cours',
    })
    if (seqInsert.error) {
      return res.status(500).json({ ok: false, error: seqInsert.error.message, sellerId })
    }
  }

  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
  return res.status(200).json({
    ok: true,
    matched: true,
    sellerId,
    senderEmail,
  })
}

