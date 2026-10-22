# 🏠 Domaine — Real Estate SaaS Platform
> Production-ready real estate platform built with Next.js 14, Supabase, and Gemini AI.
> Built to be sold to realtors for $3,000–$5,000.

---

## 📦 Tech Stack

| Layer | Tool | Plan |
|-------|------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Free |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) | Free tier |
| AI Chat | Google Gemini 1.5 Flash | Free tier |
| Automation | Make.com webhooks | Free tier |
| CRM | Google Sheets (via Make.com) | Free |
| Hosting | Vercel | Free tier |

---

## 🚀 Setup Guide

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Note your **Service Role Key** (keep secret)
4. Go to **SQL Editor** → paste contents of `supabase/migrations/001_initial_schema.sql` → Run

### Step 2 — Create Supabase Storage Buckets

In Supabase → Storage → New Bucket:
- `listings` (Public: ✅)
- `avatars` (Public: ✅)
- `blog` (Public: ✅)

Add storage policies (run in SQL Editor):
```sql
-- Allow public read
CREATE POLICY "Public read listings" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read blog" ON storage.objects FOR SELECT USING (bucket_id = 'blog');

-- Allow authenticated writes
CREATE POLICY "Auth write listings" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'listings');
CREATE POLICY "Auth write avatars" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'avatars');
CREATE POLICY "Auth write blog" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'blog');

-- Allow authenticated deletes
CREATE POLICY "Auth delete listings" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'listings');
CREATE POLICY "Auth delete avatars" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'avatars');
CREATE POLICY "Auth delete blog" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'blog');
```

### Step 3 — Create Admin Account

1. Supabase → Authentication → Users → Invite User (use your email)
2. Or use the Supabase Dashboard to sign up:
```sql
-- After signing up via Supabase Auth, make yourself super_admin:
UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
```

### Step 4 — Get Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create API Key (free tier — 15 RPM, 1M tokens/day)

### Step 5 — Set Up Make.com (Optional but recommended)

1. Create account at [make.com](https://make.com)
2. Create Scenario: **Webhook → Google Sheets**
   - Add Webhook module → copy webhook URL
   - Add Google Sheets module → map fields:
     - Name, Email, Phone, Budget, Location, Property Type, Lead Score, Source, Timestamp
3. Activate scenario

### Step 6 — Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in all values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
MAKE_LEAD_WEBHOOK_URL=https://hook.make.com/xxxxx
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=Your Agency Name
```

### Step 7 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard → Project → Settings → Environment Variables
```

Or connect GitHub repo to Vercel for auto-deploy on push.

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── listings/page.tsx           # Property search
│   ├── property/[slug]/page.tsx    # Property detail
│   ├── agents/page.tsx             # Agents listing
│   ├── blog/                       # Blog pages
│   ├── contact/page.tsx            # Contact + lead form
│   ├── admin/                      # Protected admin panel
│   │   ├── page.tsx                # Dashboard
│   │   ├── listings/               # CRUD listings
│   │   ├── agents/                 # CRUD agents
│   │   ├── leads/                  # View + manage leads
│   │   ├── blog/                   # CRUD blog posts
│   │   ├── testimonials/           # CRUD testimonials
│   │   └── login/page.tsx          # Admin login
│   └── api/
│       ├── listings/route.ts       # Listings API
│       ├── leads/route.ts          # Lead capture API
│       └── chat/route.ts           # Gemini AI chat API
├── components/
│   ├── layout/                     # Navbar, Footer
│   ├── home/                       # Hero, Featured, Testimonials, etc.
│   ├── listing/                    # PropertyCard, ListingsClient, etc.
│   ├── chat/                       # AI ChatWidget
│   └── admin/                      # AdminSidebar
├── lib/
│   ├── supabase/                   # Client + Server Supabase
│   ├── listings.ts                 # Listing queries + helpers
│   ├── gemini.ts                   # AI chat + extraction
│   └── automation.ts               # Make.com + Sheets sync
└── types/index.ts                  # All TypeScript types
```

---

## 💼 Selling This to Realtors

### What to pitch:
- **AI Lead Qualification** — chatbot qualifies every visitor 24/7
- **CRM Integration** — leads auto-sync to Google Sheets
- **Full Admin Panel** — manage listings, agents, blog without code
- **SEO Optimized** — schema markup, sitemap, meta tags built in
- **Mobile-First** — works flawlessly on all devices
- **White-label** — rebrand with their agency name, logo, colors

### Pricing suggestion:
| Package | Price | Includes |
|---------|-------|---------|
| Starter | $2,500 | 5-page site, no AI |
| Professional | $4,500 | Full platform + AI chat |
| Enterprise | $8,000+ | Custom design + CRM + automation |
| Monthly retainer | $500–$1,500/mo | Hosting, updates, leads management |

### Target clients:
- Independent real estate agents (US/CA/UK)
- Small brokerages (2–10 agents)
- Luxury property developers
- Real estate investment firms

---

## 🔑 Admin Panel Features

- ✅ Secure login (Supabase Auth)
- ✅ Dashboard with analytics
- ✅ Create / Edit / Delete listings
- ✅ Upload property images (Supabase Storage)
- ✅ AI description generator
- ✅ Manage agents
- ✅ View and manage leads with scoring
- ✅ Mark leads as contacted
- ✅ Write and publish blog posts
- ✅ Manage testimonials (publish/unpublish)
- ✅ Role-based access control (RLS)

---

## 🤖 AI Chat Features

- Powered by Google Gemini 1.5 Flash (free)
- Qualifies leads automatically (hot/warm/cold)
- Extracts: name, email, phone, budget, location, timeline
- Persists conversation history per session
- Saves lead data to Supabase
- Syncs to Google Sheets via Make.com
- Floating widget on all public pages

---

## 📊 Database Schema

Tables: `profiles`, `agents`, `listings`, `property_images`, `leads`, `conversations`, `blog_posts`, `testimonials`, `site_settings`

All with:
- Row Level Security (RLS) enabled
- Full-text search indexes
- Foreign key relationships
- Auto-updated timestamps
- Trigger-based search vectors

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

*Built with ❤️ by Vault Creative — Production-ready real estate SaaS*


<!-- Julia Mitchell
JuMitchell@domaine.com
0987654321
Julian is a dedicated professional with a deep understanding of the local housing market. Known for a straightforward approach and clear communication, Julia helps clients find modern homes that fit their lifestyle perfectly. -->


<!-- Modern Villa with Swimming Pool

Fort Worth, Texas -->
