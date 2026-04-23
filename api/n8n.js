const BASE = 'https://noahsgds.app.n8n.cloud/webhook-test'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workflow } = req.query
  if (!workflow) {
    return res.status(400).json({ error: 'Missing workflow param' })
  }

  try {
    const upstream = await fetch(`${BASE}/${workflow}`, {
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
