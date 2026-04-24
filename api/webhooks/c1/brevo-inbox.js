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

// Brevo inbound parsing:  { items: [{ From: { Address, Name }, Subject, Text, Html }] }
// Brevo Conversations:    { message: { visitor: { email, name }, value } }
// Brevo tracking events:  { email, event, ... }

function pickSenderEmail(payload) {
  // Brevo Inbound Email Parsing
  const items = payload?.items || payload?.Items
  if (Array.isArray(items) && items.length > 0) {
    const from = items[0].From || items[0].from
    if (from?.Address) return from.Address
    if (from?.email) return from.email
    if (typeof from === 'string') {
      const m = from.match(/<([^>]+)>/)
      return m ? m[1] : from.trim()
    }
  }
  // Brevo Conversations
  if (payload?.message?.visitor?.email) return payload.message.visitor.email
  return (
    payload?.visitor?.email ||
    payload?.visitorEmail ||
    payload?.from?.email ||
    payload?.sender?.email ||
    payload?.senderEmail ||
    payload?.email ||
    payload?.data?.from?.email ||
    payload?.data?.sender?.email ||
    ''
  )
}

function pickFromName(payload) {
  const items = payload?.items || payload?.Items
  if (Array.isArray(items) && items.length > 0) {
    const from = items[0].From || items[0].from
    if (from?.Name) return from.Name
    if (typeof from === 'string') {
      const m = from.match(/^(.+?)\s*</)
      return m ? m[1].trim() : ''
    }
  }
  return (
    payload?.message?.visitor?.name ||
    payload?.visitor?.name ||
    payload?.from?.name ||
    payload?.senderName ||
    ''
  )
}

function pickSubject(payload) {
  const items = payload?.items || payload?.Items
  if (Array.isArray(items) && items.length > 0) {
    return items[0].Subject || items[0].subject || ''
  }
  return payload?.subject || payload?.Subject || payload?.conversation?.subject || ''
}

function pickTextContent(payload) {
  const items = payload?.items || payload?.Items
  if (Array.isArray(items) && items.length > 0) {
    return items[0].Text || items[0].text || ''
  }
  return (
    payload?.message?.value ||
    payload?.text ||
    payload?.content ||
    payload?.data?.text ||
    payload?.data?.content ||
    ''
  )
}

function pickHtmlContent(payload) {
  const items = payload?.items || payload?.Items
  if (Array.isArray(items) && items.length > 0) {
    return items[0].Html || items[0].html || ''
  }
  return payload?.html || payload?.data?.html || ''
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])

  if (req.method === 'OPTIONS') return res.status(200).end()

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
  const fromName = pickFromName(payload)
  const subject = pickSubject(payload)
  const textContent = pickTextContent(payload)
  const htmlContent = pickHtmlContent(payload)
  const nowIso = new Date().toISOString()

  if (!senderEmail) {
    return res.status(400).json({
      ok: false,
      error: 'No sender email found in payload',
      receivedKeys: Object.keys(payload),
      hint: 'Expected items[0].From.Address (inbound parsing) or message.visitor.email (Conversations)',
    })
  }

  const { data: leadRows, error: leadError } = await supabase
    .from('seller_qualification')
    .select('seller_id, decision_maker_email, notes')
    .ilike('decision_maker_email', senderEmail)
    .limit(1)

  if (leadError) {
    return res.status(500).json({ ok: false, error: leadError.message })
  }

  if (!leadRows || leadRows.length === 0) {
    return res.status(202).json({ ok: true, matched: false, senderEmail })
  }

  const sellerId = leadRows[0].seller_id
  const existingNotes = leadRows[0].notes || ''
  const snippet = textContent.slice(0, 1200)

  const noteEntry = [
    `[${nowIso}] Réponse Brevo${fromName ? ` de ${fromName}` : ''}${subject ? ` — Sujet : ${subject}` : ''}`,
    snippet || '(aucun contenu texte)',
  ].join('\n')
  const updatedNotes = existingNotes ? `${existingNotes}\n\n---\n\n${noteEntry}` : noteEntry

  const { error: qualError } = await supabase
    .from('seller_qualification')
    .update({ statut: 'REPLIED', notes: updatedNotes })
    .eq('seller_id', sellerId)

  if (qualError) {
    return res.status(500).json({ ok: false, error: qualError.message, sellerId })
  }

  // Store message in brevo_messages table (run migration first: scripts/migrations/001_create_brevo_messages.sql)
  const { error: msgError } = await supabase.from('brevo_messages').insert({
    seller_id: sellerId,
    received_at: nowIso,
    from_email: senderEmail,
    from_name: fromName || null,
    subject: subject || null,
    text_content: textContent || null,
    html_content: htmlContent || null,
    raw_payload: payload,
  })
  const msgInserted = !msgError

  const seqUpdate = await supabase
    .from('seller_sequence')
    .update({ replied: true, statut_sequence: 'sequence_en_cours' })
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

  return res.status(200).json({ ok: true, matched: true, sellerId, senderEmail, msgInserted })
}
