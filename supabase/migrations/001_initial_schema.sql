-- ============================================================
-- DOMAINE PRO — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for full-text search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE property_type AS ENUM ('house', 'apartment', 'condo', 'villa', 'townhouse', 'land', 'commercial');
CREATE TYPE listing_status AS ENUM ('available', 'pending', 'sold', 'rented');
CREATE TYPE listing_type AS ENUM ('sale', 'rent');
CREATE TYPE lead_score AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE user_role AS ENUM ('admin', 'agent', 'super_admin');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGENTS
-- ============================================================

CREATE TABLE agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  bio TEXT,
  photo_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LISTINGS
-- ============================================================

CREATE TABLE listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  listing_type listing_type NOT NULL DEFAULT 'sale',
  property_type property_type NOT NULL DEFAULT 'house',
  status listing_status NOT NULL DEFAULT 'available',
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms NUMERIC(3,1) NOT NULL DEFAULT 0,
  square_footage INTEGER,
  lot_size NUMERIC(10,2),
  year_built INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  amenities TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTY IMAGES
-- ============================================================

CREATE TABLE property_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  alt TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  budget_min NUMERIC(15,2),
  budget_max NUMERIC(15,2),
  preferred_location TEXT,
  property_type property_type,
  timeline TEXT,
  message TEXT,
  lead_score lead_score NOT NULL DEFAULT 'cold',
  source TEXT NOT NULL DEFAULT 'website',
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  conversation_id UUID,
  is_contacted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS (AI Chat)
-- ============================================================

CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  lead_data JSONB DEFAULT '{}',
  lead_score lead_score DEFAULT 'cold',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOG POSTS
-- ============================================================

CREATE TABLE blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  read_time INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TESTIMONIALS
-- ============================================================

CREATE TABLE testimonials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  location TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE SETTINGS
-- ============================================================

CREATE TABLE site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_name TEXT DEFAULT 'Domaine',
  tagline TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  social_links JSONB DEFAULT '{}',
  google_sheets_webhook TEXT,
  make_webhook TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (site_name, tagline) 
VALUES ('Domaine', 'Find Your Perfect Home');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_listing_type ON listings(listing_type);
CREATE INDEX idx_listings_property_type ON listings(property_type);
CREATE INDEX idx_listings_is_featured ON listings(is_featured);
CREATE INDEX idx_listings_agent_id ON listings(agent_id);
CREATE INDEX idx_listings_search_vector ON listings USING GIN(search_vector);

CREATE INDEX idx_leads_lead_score ON leads(lead_score);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_is_contacted ON leads(is_contacted);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_blog_posts_search_vector ON blog_posts USING GIN(search_vector);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_property_images_listing_id ON property_images(listing_id);

-- ============================================================
-- FULL TEXT SEARCH TRIGGERS
-- ============================================================

-- Listings search vector
CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_search_vector_trigger
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- Blog search vector
CREATE OR REPLACE FUNCTION blog_posts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_search_vector_trigger
BEFORE INSERT OR UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION blog_posts_search_vector_update();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Helper: is authenticated admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());

-- AGENTS (public read, admin write)
CREATE POLICY "Anyone can view active agents" ON agents FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage agents" ON agents FOR ALL USING (is_admin());

-- LISTINGS (public read available, admin full)
CREATE POLICY "Anyone can view available listings" ON listings FOR SELECT USING (status != 'sold' OR is_admin());
CREATE POLICY "Admins can manage listings" ON listings FOR ALL USING (is_admin());

-- PROPERTY IMAGES
CREATE POLICY "Anyone can view property images" ON property_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage property images" ON property_images FOR ALL USING (is_admin());

-- LEADS (admin only)
CREATE POLICY "Admins can manage leads" ON leads FOR ALL USING (is_admin());
CREATE POLICY "Public can insert leads" ON leads FOR INSERT WITH CHECK (true);

-- CONVERSATIONS
CREATE POLICY "Admins can view all conversations" ON conversations FOR ALL USING (is_admin());
CREATE POLICY "Public can insert/update own conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update own conversations" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Public can view own conversations" ON conversations FOR SELECT USING (true);

-- BLOG POSTS
CREATE POLICY "Anyone can view published posts" ON blog_posts FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Admins can manage blog posts" ON blog_posts FOR ALL USING (is_admin());

-- TESTIMONIALS
CREATE POLICY "Anyone can view published testimonials" ON testimonials FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Admins can manage testimonials" ON testimonials FOR ALL USING (is_admin());

-- SITE SETTINGS
CREATE POLICY "Anyone can view site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON site_settings FOR ALL USING (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Dashboard > Storage or via API:
-- 
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog', 'blog', true);
--
-- Storage policies:
-- CREATE POLICY "Public read listings" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
-- CREATE POLICY "Admin write listings" ON storage.objects FOR INSERT USING (is_admin() AND bucket_id = 'listings');
-- CREATE POLICY "Public read blog" ON storage.objects FOR SELECT USING (bucket_id = 'blog');
-- CREATE POLICY "Admin write blog" ON storage.objects FOR INSERT USING (is_admin() AND bucket_id = 'blog');

-- ============================================================
-- SAMPLE DATA (optional, for testing)
-- ============================================================

INSERT INTO agents (name, email, phone, bio, specialties) VALUES
('Sarah Mitchell', 'sarah@domaine.com', '+1 (555) 234-5678', 'With over 12 years in luxury real estate, Sarah specializes in waterfront properties and high-end residential estates across the Pacific Northwest.', ARRAY['Luxury Homes', 'Waterfront', 'Investment']),
('James Chen', 'james@domaine.com', '+1 (555) 345-6789', 'James brings deep market expertise in urban condos and commercial properties with a track record of $50M+ in sales annually.', ARRAY['Condos', 'Commercial', 'Urban Properties']),
('Maria Rodriguez', 'maria@domaine.com', '+1 (555) 456-7890', 'First-time buyer specialist with a passion for helping families find their dream home. Fluent in Spanish and English.', ARRAY['First-time Buyers', 'Family Homes', 'Relocation']);

INSERT INTO testimonials (name, role, content, rating, location) VALUES
('Michael & Jennifer Thompson', 'Homeowners', 'Working with Domaine was the best decision we made during our home search. The AI chat helped us narrow down exactly what we needed, and our agent Sarah found us the perfect waterfront home within our budget. Absolutely seamless experience!', 5, 'Seattle, WA'),
('David Park', 'Real Estate Investor', 'As an investor managing multiple properties, I needed a team that understood the numbers as well as the market. Domaine''s platform gave me full visibility into my portfolio and their agents helped me find three off-market deals this year alone.', 5, 'Austin, TX'),
('Amanda Reyes', 'First-time Buyer', 'I was so nervous about buying my first home, but Domaine made it feel easy. The search tools are incredible, and I never felt pressured. Maria guided me through every step and I closed below asking price!', 5, 'Miami, FL');
