-- Migration: create brevo_messages table
-- Run this once in your Supabase SQL editor.
-- Stores individual messages received via the Brevo inbound webhook.

CREATE TABLE IF NOT EXISTS public.brevo_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID        NOT NULL REFERENCES public.seller_qualification(seller_id) ON DELETE CASCADE,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_email   TEXT,
  from_name    TEXT,
  subject      TEXT,
  text_content TEXT,
  html_content TEXT,
  raw_payload  JSONB
);

ALTER TABLE public.brevo_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role (used by the webhook) to insert, and anon role to read
CREATE POLICY "service_role_all" ON public.brevo_messages
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS brevo_messages_seller_id_idx  ON public.brevo_messages (seller_id);
CREATE INDEX IF NOT EXISTS brevo_messages_received_at_idx ON public.brevo_messages (received_at DESC);

-- Webhook debug log: stores raw Brevo POST payloads for inspection
CREATE TABLE IF NOT EXISTS public.webhook_debug_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method       TEXT,
  content_type TEXT,
  user_agent   TEXT,
  raw_payload  JSONB
);

ALTER TABLE public.webhook_debug_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON public.webhook_debug_log FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS webhook_debug_log_received_at_idx ON public.webhook_debug_log (received_at DESC);
