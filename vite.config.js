import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { regenerateEmailWithOpenAI } from './api/c2/_regenerateCore.js'

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += String(chunk)
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function c2DevApiPlugin() {
  return {
    name: 'c2-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/c2/regenerate-email', async (req, res, next) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Method not allowed' })
          return
        }

        try {
          const body = await readRequestJson(req)
          const result = await regenerateEmailWithOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            lead: body?.lead,
            tone: body?.tone,
            variant: body?.variant,
          })
          if (!result.ok) {
            sendJson(res, result.status ?? 500, {
              ok: false,
              error: result.error || 'Regeneration failed',
              ...(result.debug ? { debug: result.debug } : {}),
            })
            return
          }
          sendJson(res, 200, { ok: true, subject: result.subject, body: result.body })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Unexpected server error' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), c2DevApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
