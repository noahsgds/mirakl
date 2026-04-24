import { regenerateEmailWithOpenAI } from './_regenerateCore.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

function jsonResponse(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return jsonResponse(res, 405, { ok: false, error: 'Method not allowed' })
  }

  if (!OPENAI_API_KEY) {
    return jsonResponse(res, 500, {
      ok: false,
      error: 'Missing OPENAI_API_KEY on server',
    })
  }

  const { lead, tone = 'professional', variant = 'detailed' } = req.body || {}
  const result = await regenerateEmailWithOpenAI({
    apiKey: OPENAI_API_KEY,
    lead,
    tone,
    variant,
  })

  if (!result.ok) {
    return jsonResponse(res, result.status ?? 500, {
      ok: false,
      error: result.error || 'Regeneration failed',
      ...(result.debug ? { debug: result.debug } : {}),
    })
  }

  return jsonResponse(res, 200, {
    ok: true,
    subject: result.subject,
    body: result.body,
  })
}
