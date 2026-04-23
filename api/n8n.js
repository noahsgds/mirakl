const PROD = 'https://noahsgds.app.n8n.cloud/webhook'
const TEST = 'https://noahsgds.app.n8n.cloud/webhook-test'

const WORKFLOW_URLS = {
  'lancer-enrichissement': `${PROD}/lancer-enrichissement`,
  'lancer-generation':     `${PROD}/lancer-generation`,
  'lancer-sequence':       `${TEST}/lancer-sequence`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workflow } = req.query
  const url = WORKFLOW_URLS[workflow]
  if (!url) {
    return res.status(400).json({ error: `Unknown workflow: ${workflow}` })
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
