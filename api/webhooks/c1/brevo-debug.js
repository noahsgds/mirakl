import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ltuarofidogdjhzosboe.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // POST: Brevo is calling us — store & acknowledge
  if (req.method === 'POST') {
    const payload = req.body ?? {}
    const now = new Date().toISOString()

    await supabase.from('webhook_debug_log').insert({
      received_at: now,
      method: 'POST',
      content_type: req.headers['content-type'] || null,
      user_agent: req.headers['user-agent'] || null,
      raw_payload: payload,
    })

    return res.status(200).json({ ok: true, receivedAt: now, payload })
  }

  // GET: show last 10 Brevo POSTs for inspection in the browser
  const { data, error } = await supabase
    .from('webhook_debug_log')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(10)

  if (error) {
    return res.status(200).json({
      ok: false,
      error: error.message,
      hint: 'Run scripts/migrations/001_create_brevo_messages.sql in your Supabase SQL editor first',
    })
  }

  return res.status(200).json({
    ok: true,
    hint: 'Configure this URL in Brevo, click Send test request, then refresh this page to see the payload.',
    count: data?.length ?? 0,
    entries: data ?? [],
  })
}
