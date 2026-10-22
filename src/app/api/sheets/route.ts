/**
 * /api/sheets
 *
 * Mirrors new leads directly to Google Sheets via a Google Apps Script
 * Web App — completely free, no Make.com, no Zapier.
 *
 * Setup (one time, 5 minutes):
 *  1. Open Google Sheets → Extensions → Apps Script
 *  2. Paste the script below into the editor and save
 *  3. Click Deploy → New Deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  4. Copy the Web App URL → add to .env.local as GOOGLE_SHEETS_WEBHOOK_URL
 *
 * Apps Script code to paste:
 * ─────────────────────────────────────────────────────────────
 * function doPost(e) {
 *   const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *   const data  = JSON.parse(e.postData.contents);
 *
 *   // Add headers if sheet is empty
 *   if (sheet.getLastRow() === 0) {
 *     sheet.appendRow(['Date','Name','Email','Phone','Score','Source',
 *                      'Budget','Location','Property Type','Message']);
 *   }
 *
 *   sheet.appendRow([
 *     new Date(data.created_at || new Date()),
 *     data.name        || '',
 *     data.email       || '',
 *     data.phone       || '',
 *     data.lead_score  || '',
 *     data.source      || '',
 *     data.budget_max  || '',
 *     data.preferred_location || '',
 *     data.property_type      || '',
 *     data.message     || '',
 *   ]);
 *
 *   return ContentService
 *     .createTextOutput(JSON.stringify({ success: true }))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 * ─────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_WEBHOOK_URL not set' }, { status: 400 })
  }

  try {
    const body = await req.json()

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Sheets] Webhook failed:', res.status, text)
      return NextResponse.json({ error: 'Webhook failed', detail: text }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
