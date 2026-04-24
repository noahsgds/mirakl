function extractJsonObject(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (_) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch (_) {
        return null
      }
    }
    return null
  }
}

function readOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text
  }

  const chunks = []
  for (const item of data?.output ?? []) {
    if (!item?.content) continue
    for (const block of item.content) {
      if (typeof block?.text === 'string') chunks.push(block.text)
    }
  }
  return chunks.join('\n').trim()
}

function buildPrompt({ lead, tone, variant }) {
  const variantLabel = variant === 'detailed' ? 'Detailed Personalized Email' : 'Ultra Personalized Email'
  const styleHints =
    tone === 'direct'
      ? 'Keep concise, assertive, outcome-focused.'
      : tone === 'warm'
        ? 'Keep warm, human, collaborative.'
        : 'Keep professional, credible, consultative.'

  return `You are generating B2B outreach emails for Mirakl Connect sales.

Return ONLY valid JSON with this exact shape:
{"subject":"...","body":"..."}

Constraints:
- Variant: ${variantLabel}
- Tone: ${tone}
- ${styleHints}
- Use only data provided in the lead payload (no hallucination).
- Avoid placeholders like [Your Name].
- Keep language in English.
- Subject should be short and high-quality for open rate.
- Body should be plain text with natural line breaks.
- End signature with "Best regards," and "Mirakl".

Lead payload:
${JSON.stringify(lead, null, 2)}
`
}

export async function regenerateEmailWithOpenAI({ apiKey, lead, tone = 'professional', variant = 'detailed', fetchImpl = fetch }) {
  if (!apiKey) {
    return { ok: false, status: 500, error: 'Missing OPENAI_API_KEY on server' }
  }

  if (!lead || typeof lead !== 'object') {
    return { ok: false, status: 400, error: 'Missing lead payload' }
  }

  let response
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        input: [
          {
            role: 'system',
            content: 'You generate high-performing B2B outbound emails for Mirakl sales teams.',
          },
          {
            role: 'user',
            content: buildPrompt({ lead, tone, variant }),
          },
        ],
      }),
    })
  } catch (error) {
    return { ok: false, status: 502, error: error?.message || 'OpenAI network error' }
  }

  const raw = await response.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch (_) {
    data = null
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 500,
      error:
        data?.error?.message ||
        (raw && raw.trim() ? `OpenAI error (${response.status}): ${raw.slice(0, 220)}` : `OpenAI error (${response.status})`),
    }
  }

  const outputText = readOutputText(data)
  const parsed = extractJsonObject(outputText)
  if (!parsed?.subject || !parsed?.body) {
    return {
      ok: false,
      status: 422,
      error: 'Could not parse generated email JSON',
      debug: outputText ? outputText.slice(0, 220) : '',
    }
  }

  return {
    ok: true,
    status: 200,
    subject: String(parsed.subject).trim(),
    body: String(parsed.body).trim(),
  }
}
