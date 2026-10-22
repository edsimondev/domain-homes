/**
 * lib/telegram.ts
 *
 * Sends instant Telegram messages to the agent when a lead comes in.
 *
 * Setup (one time):
 *  1. Open Telegram → search @BotFather → /newbot → copy the Bot Token
 *  2. Start a chat with your new bot (send it any message)
 *  3. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
 *     Find "chat":{"id": XXXXXXXXX} — that is your Chat ID
 *  4. Add to .env.local:
 *       TELEGRAM_BOT_TOKEN=7123456789:AAF...
 *       TELEGRAM_CHAT_ID=123456789
 */

const TELEGRAM_API = 'https://api.telegram.org'

// ─── Core send ────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    // Silently skip — Telegram is optional
    return
  }

  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    // Never crash the lead flow if Telegram is down
    console.warn('[Telegram] Failed to send message:', (err as Error).message)
  }
}

// ─── Lead alert formatter ─────────────────────────────────────────────────────

export function sendLeadTelegramAlert(lead: {
  name?: string | null
  email?: string | null
  phone?: string | null
  lead_score: string
  budget_max?: number | null
  preferred_location?: string | null
  property_type?: string | null
  source?: string | null
  message?: string | null
}): void {
  const scoreLabel: Record<string, string> = {
    hot:  'HOT LEAD',
    warm: 'WARM LEAD',
    cold: 'NEW LEAD',
  }

  const lines = [
    `<b>${scoreLabel[lead.lead_score] ?? 'NEW LEAD'}</b>`,
    ``,
    `<b>Name:</b> ${lead.name || 'Not provided'}`,
    `<b>Email:</b> ${lead.email || 'Not provided'}`,
    `<b>Phone:</b> ${lead.phone || 'Not provided'}`,
    ``,
    `<b>Budget:</b> ${lead.budget_max ? '$' + lead.budget_max.toLocaleString() : 'Not specified'}`,
    `<b>Location:</b> ${lead.preferred_location || 'Not specified'}`,
    `<b>Property:</b> ${lead.property_type ? lead.property_type.charAt(0).toUpperCase() + lead.property_type.slice(1) : 'Not specified'}`,
    `<b>Source:</b> ${lead.source === 'ai_chat' ? 'AI Chat' : lead.source === 'contact_form' ? 'Contact Form' : lead.source || 'Website'}`,
    lead.message ? `\n<b>Message:</b> "${lead.message.slice(0, 150)}${lead.message.length > 150 ? '...' : ''}"` : '',
  ].filter(line => line !== null)

  sendTelegramMessage(lines.join('\n')).catch(console.warn)
}
