import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ltuarofidogdjhzosboe.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dWFyb2ZpZG9nZGpoem9zYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODUwOTUsImV4cCI6MjA5MjI2MTA5NX0.-b9q5XuR1IgUPcsgGcsXklkU5iPvG65DqRKwd2srhcs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = req.body || {}
  const receivedAt = new Date().toISOString()

  // Try to persist to Supabase for async inspection
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    await supabase.from('webhook_debug_log').insert({
      received_at: receivedAt,
      method: req.method,
      content_type: req.headers['content-type'] || null,
      user_agent: req.headers['user-agent'] || null,
      raw_payload: payload,
    })
    // Ignore insert error if table doesn't exist — we always return the payload below
  }

  return res.status(200).json({
    ok: true,
    receivedAt,
    method: req.method,
    contentType: req.headers['content-type'],
    payloadKeys: Object.keys(payload),
    payload,
  })
}
