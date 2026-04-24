import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ltuarofidogdjhzosboe.supabase.co'

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs'

// ---------------------------------------------------------------------------
// Brevo Conversations outbound webhook — deux formats observés :
//
// A) event_name: "conversation_ended"
//    → event.messages (array) avec html, subject
//
// B) event_name: "message_received"
//    → event.message (objet singulier) sans html ni subject (notification seule)
//
// Dans les deux cas : event.identifiers.email_id = email du sender
// On ne traite que les messages de type "visitor" (réponses des sellers).
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getVisitorMessage(event) {
  // Normalise: "messages" array (conversation_ended) or "message" singular (message_received)
  const msgs = Array.isArray(event?.messages)
    ? event.messages
    : event?.message
    ? [event.message]
    : []
  return msgs.find((m) => m.type === 'visitor') || msgs.find((m) => !m.type) || null
}

function extractFields(event) {
  const msg = getVisitorMessage(event)

  const email = String(
    msg?.from?.email ||
    event?.identifiers?.email_id ||
    event?.email ||
    event?.from?.email ||
    ''
  ).trim().toLowerCase()

  const name = String(
    msg?.from?.name ||
    event?.visitor?.displayedName ||
    event?.from?.name ||
    ''
  ).trim()

  const subject = String(
    msg?.subject ||
    event?.subject ||
    ''
  ).trim()

  const htmlRaw = String(
    msg?.html ||
    event?.html ||
    ''
  ).trim()

  const text = String(
    msg?.text ||
    event?.text ||
    (htmlRaw ? stripHtml(htmlRaw) : '')
  ).trim()

  return { email, name, subject, text, html: htmlRaw, msgType: msg?.type || null }
}

function normalise(body) {
  if (Array.isArray(body)) return body
  return [body]
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── GET : affiche les 10 derniers messages reçus (debug rapide) ─────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brevo_messages')
      .select('id, received_at, seller_id, from_email, from_name, subject, text_content')
      .order('received_at', { ascending: false })
      .limit(10)
    return res.status(200).json({ ok: true, last_messages: data || [], dbError: error?.message || null })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const events = normalise(req.body ?? {})
  const results = []

  for (const event of events) {
    const { email, name, subject, text, html, msgType } = extractFields(event)

    // Ignore messages from agents (our own outgoing messages)
    if (msgType === 'agent') {
      results.push({ skipped: true, reason: 'agent_message' })
      continue
    }

    if (!email) {
      results.push({
        skipped: true,
        reason: 'no_email_found',
        payloadKeys: Object.keys(event),
      })
      continue
    }

    const nowIso = new Date().toISOString()

    // ── 1. Toujours stocker dans brevo_messages (seller_id nullable) ─────
    // seller_id sera mis à jour si on trouve le seller — le message n'est
    // jamais perdu même si l'email n'est pas reconnu.
    const { error: msgErr } = await supabase.from('brevo_messages').insert({
      seller_id:    null,   // mis à jour ci-dessous si seller trouvé
      received_at:  nowIso,
      from_email:   email,
      from_name:    name || null,
      subject:      subject || null,
      text_content: text || null,
      html_content: html || null,
      raw_payload:  event,
    })

    if (msgErr) {
      results.push({ email, msgInserted: false, msgError: msgErr.message })
      continue
    }

    // ── 2. Chercher le seller par email ──────────────────────────────────
    const { data: leadRows, error: lookupErr } = await supabase
      .from('seller_qualification')
      .select('seller_id, notes')
      .ilike('decision_maker_email', email)
      .limit(1)

    if (lookupErr || !leadRows?.length) {
      results.push({
        email,
        msgInserted: true,
        matched: false,
        reason: lookupErr ? 'db_lookup_error' : 'unknown_sender',
        error: lookupErr?.message || null,
      })
      continue
    }

    const sellerId = leadRows[0].seller_id

    // ── 3. Mettre à jour seller_id dans le message qu'on vient d'insérer ─
    await supabase
      .from('brevo_messages')
      .update({ seller_id: sellerId })
      .eq('from_email', email)
      .eq('received_at', nowIso)

    // ── 4. Mettre à jour seller_qualification ───────────────────────────
    const snippet = text.slice(0, 1200)
    const noteEntry = [`[${nowIso}] Réponse Brevo${name ? ` de ${name}` : ''}${subject ? ` — ${subject}` : ''}`, snippet || '(pas de texte)'].join('\n')
    const updatedNotes = leadRows[0].notes ? `${leadRows[0].notes}\n\n---\n\n${noteEntry}` : noteEntry

    const { error: qualErr } = await supabase
      .from('seller_qualification')
      .update({ statut: 'REPLIED', notes: updatedNotes })
      .eq('seller_id', sellerId)

    // ── 5. Mettre à jour seller_sequence ────────────────────────────────
    const { data: seqRows, error: seqErr } = await supabase
      .from('seller_sequence')
      .update({ replied: true, statut_sequence: 'sequence_en_cours' })
      .eq('seller_id', sellerId)
      .select('seller_id')

    if (!seqErr && (!seqRows || seqRows.length === 0)) {
      await supabase.from('seller_sequence').insert({
        seller_id: sellerId,
        replied: true,
        statut_sequence: 'sequence_en_cours',
      })
    }

    results.push({
      matched:     true,
      sellerId,
      email,
      msgInserted: true,
      qualUpdated: !qualErr,
      qualError:   qualErr?.message || null,
    })
  }

  return res.status(200).json({ ok: true, processed: results.length, results })
}
