import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ltuarofidogdjhzosboe.supabase.co'

// Falls back to anon key (already public in frontend bundle) so the function
// never returns 500 just because the env var isn't set in Vercel.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ---------------------------------------------------------------------------
// Brevo outbound webhook payload formats
// ---------------------------------------------------------------------------
// A) Transactional email events (opened, clicked, replied, inbound_email…)
//    { event, email, subject, text, from, messageId, date, … }
//    Note: `email` = the CONTACT's email (recipient of your outbound email)
//
// B) Brevo Conversations — new message from a visitor
//    { type, data: { author: { email, name }, text, conversation: { subject } } }
//    OR { event, data: { message: { sender: { email, name }, content } } }
//    OR { visitors: [{ email }], message: { text }, conversationId }
//
// C) Inbound email parsing (items array — separate Brevo Inbound Parsing product)
//    { items: [{ From: { Address, Name }, Subject, Text, Html }] }
//
// D) Batch mode: Brevo may wrap events in an array
//    [ { event, email, … }, … ]
// ---------------------------------------------------------------------------

function extractFields(obj) {
  if (!obj || typeof obj !== 'object') return { email: '', name: '', subject: '', text: '', html: '' }

  // --- EMAIL ---
  const email = (
    // Transactional: contact email
    obj?.email ||
    // Conversations: author/visitor/sender
    obj?.data?.author?.email ||
    obj?.data?.visitor?.email ||
    obj?.data?.message?.sender?.email ||
    obj?.payload?.message?.sender?.email ||
    obj?.data?.senderEmail ||
    obj?.senderEmail ||
    obj?.visitorEmail ||
    // visitors array (some Conversations webhooks)
    (Array.isArray(obj?.visitors) && obj.visitors[0]?.email ? obj.visitors[0].email : null) ||
    (Array.isArray(obj?.visitors) && typeof obj.visitors[0] === 'string' ? obj.visitors[0] : null) ||
    // Inbound parsing
    obj?.items?.[0]?.From?.Address ||
    obj?.items?.[0]?.from?.email ||
    // Generic fallbacks
    obj?.from?.email ||
    obj?.sender?.email ||
    obj?.data?.from?.email ||
    obj?.contact?.email ||
    ''
  )

  // --- NAME ---
  const name = (
    obj?.data?.author?.name ||
    obj?.data?.visitor?.name ||
    obj?.data?.message?.sender?.name ||
    obj?.payload?.message?.sender?.name ||
    obj?.visitorName ||
    obj?.senderName ||
    (Array.isArray(obj?.visitors) && obj.visitors[0]?.name ? obj.visitors[0].name : null) ||
    obj?.items?.[0]?.From?.Name ||
    obj?.from?.name ||
    obj?.sender?.name ||
    ''
  )

  // --- SUBJECT ---
  const subject = (
    obj?.subject ||
    obj?.Subject ||
    obj?.data?.conversation?.subject ||
    obj?.conversation?.subject ||
    obj?.items?.[0]?.Subject ||
    obj?.items?.[0]?.subject ||
    ''
  )

  // --- TEXT ---
  const text = (
    // Transactional inbound
    obj?.text ||
    // Conversations
    obj?.data?.text ||
    obj?.data?.message?.content ||
    obj?.data?.message?.text ||
    obj?.payload?.message?.content ||
    obj?.message?.text ||
    obj?.message?.content ||
    obj?.message?.body ||
    // Inbound parsing
    obj?.items?.[0]?.Text ||
    obj?.items?.[0]?.text ||
    obj?.content ||
    ''
  )

  // --- HTML ---
  const html = (
    obj?.html ||
    obj?.data?.message?.html ||
    obj?.items?.[0]?.Html ||
    obj?.items?.[0]?.html ||
    ''
  )

  return {
    email: String(email || '').trim().toLowerCase(),
    name: String(name || '').trim(),
    subject: String(subject || '').trim(),
    text: String(text || '').trim(),
    html: String(html || '').trim(),
  }
}

// Brevo can send a batch as a JSON array — normalise to array of objects
function normalisePayload(body) {
  if (Array.isArray(body)) return body
  return [body]
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', cors['Access-Control-Allow-Origin'])
  res.setHeader('Access-Control-Allow-Methods', cors['Access-Control-Allow-Methods'])
  res.setHeader('Access-Control-Allow-Headers', cors['Access-Control-Allow-Headers'])

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const rawBody = req.body ?? {}
  const events = normalisePayload(rawBody)

  const results = []

  for (const event of events) {
    const { email, name, subject, text, html } = extractFields(event)

    if (!email) {
      results.push({
        matched: false,
        reason: 'no_email',
        payloadKeys: Object.keys(event),
        hint: 'Check /api/webhooks/c1/brevo-debug to inspect the raw Brevo payload',
      })
      continue
    }

    const { data: leadRows, error: leadError } = await supabase
      .from('seller_qualification')
      .select('seller_id, notes')
      .ilike('decision_maker_email', email)
      .limit(1)

    if (leadError) {
      results.push({ matched: false, reason: 'db_error', error: leadError.message, email })
      continue
    }

    if (!leadRows || leadRows.length === 0) {
      results.push({ matched: false, reason: 'unknown_sender', email })
      continue
    }

    const sellerId = leadRows[0].seller_id
    const nowIso = new Date().toISOString()
    const snippet = text.slice(0, 1200)

    const noteEntry = [
      `[${nowIso}] Réponse Brevo${name ? ` de ${name}` : ''}${subject ? ` — ${subject}` : ''}`,
      snippet || '(aucun contenu texte)',
    ].join('\n')
    const updatedNotes = leadRows[0].notes
      ? `${leadRows[0].notes}\n\n---\n\n${noteEntry}`
      : noteEntry

    const { error: qualError } = await supabase
      .from('seller_qualification')
      .update({ statut: 'REPLIED', notes: updatedNotes })
      .eq('seller_id', sellerId)

    if (qualError) {
      results.push({ matched: true, sellerId, error: qualError.message })
      continue
    }

    // Store in brevo_messages if the table exists (run migration first)
    await supabase.from('brevo_messages').insert({
      seller_id: sellerId,
      received_at: nowIso,
      from_email: email,
      from_name: name || null,
      subject: subject || null,
      text_content: text || null,
      html_content: html || null,
      raw_payload: event,
    })

    const seqUpdate = await supabase
      .from('seller_sequence')
      .update({ replied: true, statut_sequence: 'sequence_en_cours' })
      .eq('seller_id', sellerId)
      .select('seller_id')

    if (!seqUpdate.error && (!seqUpdate.data || seqUpdate.data.length === 0)) {
      await supabase.from('seller_sequence').insert({
        seller_id: sellerId,
        replied: true,
        statut_sequence: 'sequence_en_cours',
      })
    }

    results.push({ matched: true, sellerId, email })
  }

  const anyMatched = results.some((r) => r.matched)
  return res.status(200).json({ ok: true, processed: results.length, results })
}
