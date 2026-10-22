# 🤖 Domaine — Automation Setup Guide

This guide walks you through setting up all 4 automations. Each one is live and working out of the box — you just need to connect the free-tier services below.

---

## What's Built — The 4 Automations

```
VISITOR ARRIVES ON SITE
        ↓
1. AI Chat Widget qualifies them (budget, location, timeline, property type)
   └── Offers to book a Cal.com viewing inside the chat
        ↓
2. Instant Agent Alert fires (email to agent in under 30 seconds)
   └── Includes: full lead profile, AI-suggested first reply, matching listings
        ↓
3. Lead auto-enrolls in Nurture Sequence (AI-personalized emails over 60 days)
   └── Step 1: Day 1  → Personalized follow-up with property suggestions
   └── Step 2: Day 7  → Market insight relevant to their city + budget
   └── Step 3: Day 14 → Low-pressure check-in, ask if needs changed
   └── Step 4: Day 30 → New listings that match their criteria
   └── Step 5: Day 60 → Final touchpoint, keep door open
        ↓
4. NEW LISTING ADDED → Match Engine scans all leads → admin notifies matches
   └── Each lead gets: personalized "we found your match" email with AI reason
        ↓
   BONUS: Weekly Market Report → every Monday → all leads in each city
```

---

## Step 1 — Resend (Email Engine)

Resend handles all emails. Free tier: **3,000 emails/month**.

1. Go to [resend.com](https://resend.com) → Sign up free
2. Dashboard → API Keys → Create API Key
3. Add your sending domain (or use their sandbox for testing)
4. Copy the API key → add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   AGENT_NOTIFICATION_EMAIL=you@youragency.com
   ```

> **Testing without a domain:** Resend allows sending from `onboarding@resend.dev` in sandbox mode. Perfect for testing before going live.

---

## Step 2 — Cal.com (Booking Inside Chat)

Cal.com is free and lets leads book viewings directly inside the AI chat widget.

1. Go to [cal.com](https://cal.com) → Sign up free
2. Create an Event Type: "Property Viewing" — 30 or 60 minutes
3. Connect your Google Calendar or Outlook
4. Copy your booking link (looks like: `https://cal.com/your-name/property-viewing`)
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_CAL_BOOKING_URL=https://cal.com/your-name/property-viewing
   ```

When a visitor clicks "Book a Viewing" in the chat, they get sent directly to this link. Their booking goes straight into the agent's calendar. Zero back-and-forth.

---

## Step 3 — Run the Database Migration

In Supabase SQL Editor, run:
```sql
-- File: supabase/migrations/002_automation_tables.sql
```

This creates:
- `nurture_sequences` — email campaign templates
- `nurture_queue` — scheduled email jobs
- `nurture_enrollments` — which leads are in which sequence
- `listing_lead_matches` — property match engine results
- `automation_logs` — audit trail of all automations
- `generated_content` — cached AI-generated listing content

---

## Step 4 — Vercel Cron Jobs

The `vercel.json` file is already configured. When you deploy to Vercel, two cron jobs run automatically:

| Job | Schedule | What it does |
|-----|----------|--------------|
| `nurture` | Every day at 9am | Processes pending emails in the nurture queue |
| `market_report` | Every Monday at 8am | Sends weekly market reports to all city-specific leads |

**To secure cron jobs**, add to `.env.local`:
```
CRON_SECRET=any-random-secret-string-here
```

Vercel passes this in the Authorization header. The cron endpoint rejects any calls without it.

---

## Step 5 — Activate Nurture Sequences

After deploying, go to **Admin → Nurture**:

1. You'll see 4 pre-built sequences:
   - **New Lead Follow-Up** — triggers automatically on every new lead
   - **Hot Lead Fast Track** — 3-step rapid follow-up for hot leads
   - **Cold Lead Re-Engagement** — revive dead leads with market insights
   - **Past Client Anniversary** — annual check-in with past buyers

2. The "New Lead Follow-Up" sequence has `trigger_type = 'on_lead'` — this means every new lead is **automatically enrolled** when they submit a form or finish an AI chat. No manual work needed.

3. For the other sequences — go to **Admin → Nurture → Enroll Leads** tab, pick a sequence, select leads, click Enroll.

---

## Step 6 — Content Suite

Go to **Admin → Automation → Content Suite**:

1. Select any listing from the dropdown
2. Click "Generate All Content"
3. AI produces in one shot:
   - **Website description** (3 paragraphs, SEO-friendly)
   - **Instagram caption** (with emojis + hashtags)
   - **Facebook post** (conversational, engagement-focused)
   - **Email newsletter blurb** (with subject line)
   - **Meta description** (under 155 chars)
4. Click Copy on each piece, or Copy All

Content is cached — click Regenerate if you want a fresh version.

---

## Step 7 — Property Match Engine

Go to **Admin → Automation → Match Engine**:

1. Select a listing you just published
2. Click "Find Matching Leads"
3. AI scans all your leads and scores them (0–9) based on:
   - Budget match
   - Location preference match
   - Property type match
4. Each match shows an AI-written reason why it's a good fit
5. Check the leads you want to notify → click "Notify X Leads"
6. Each selected lead gets a personalized email: *"Hi Sarah, we just listed something that matches exactly what you told us..."*

**Best practice:** Run the match engine every time you publish a new listing.

---

## How the Instant Alert Email Looks

When a new lead comes in, the agent gets an email that includes:
- Lead name, email, phone (clickable links)
- Budget, location, property type, timeline
- Lead score badge (🔥 Hot / ☀️ Warm / ❄️ Cold)
- A red urgency bar: *"Responding within 5 minutes increases conversion by 400%"*
- **AI-suggested first reply** — copy-paste ready, personalized to what the lead said
- **Matching listings** from your portfolio — the top 3 that fit their criteria
- Action buttons: Reply to Lead, Share Booking Link, View in Dashboard

---

## Automation Log

Every automation run is logged in **Admin → Automation** under Activity Log.

You can see:
- What ran (alert, nurture, match, content suite)
- Success or failure
- Metadata (emails sent, leads matched, etc.)
- Timestamp

---

## Full Environment Variables Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini AI (free tier)
GEMINI_API_KEY=AIza...

# Resend (email — free tier: 3,000/mo)
RESEND_API_KEY=re_...
AGENT_NOTIFICATION_EMAIL=agent@youragency.com

# Cal.com (booking — free)
NEXT_PUBLIC_CAL_BOOKING_URL=https://cal.com/your-name/property-viewing

# Cron security
CRON_SECRET=your-random-secret-here

# App
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=Your Agency Name
```

---

## Troubleshooting

**Emails not sending:**
- Check `RESEND_API_KEY` is set correctly
- Check `AGENT_NOTIFICATION_EMAIL` is a real email
- In Resend dashboard → Logs → check for errors

**Nurture queue not processing:**
- Vercel cron only runs on Vercel (not local)
- To test locally: hit `GET /api/automation/cron?job=nurture` with the Authorization header
- Check **Admin → Automation → Activity Log** for errors

**Match engine finding 0 leads:**
- Leads need an email address to be matched
- Leads need at least a location OR property type OR budget to score ≥ 3
- Add more leads via the contact form or AI chat

**Cal.com link not working in chat:**
- Set `NEXT_PUBLIC_CAL_BOOKING_URL` in your environment variables
- Make sure you've published your Cal.com event type (not draft)
