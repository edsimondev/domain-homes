// ============================================================
// DOMAINE PRO — Core Types
// ============================================================

export type PropertyType = 'house' | 'apartment' | 'condo' | 'villa' | 'townhouse' | 'land' | 'commercial'
export type ListingStatus = 'available' | 'pending' | 'sold' | 'rented'
export type ListingType = 'sale' | 'rent'
export type LeadScore = 'hot' | 'warm' | 'cold'
export type UserRole = 'admin' | 'agent' | 'super_admin'

export interface Agent {
  id: string
  name: string
  email: string
  phone?: string
  bio?: string
  photo_url?: string
  specialties?: string[]
  listings_count?: number
  created_at: string
  user_id?: string
}

export interface PropertyImage {
  id: string
  listing_id: string
  url: string
  alt?: string
  order: number
}

export interface Listing {
  id: string
  title: string
  slug: string
  description: string
  price: number
  listing_type: ListingType
  property_type: PropertyType
  status: ListingStatus
  bedrooms: number
  bathrooms: number
  square_footage?: number
  lot_size?: number
  year_built?: number
  address: string
  city: string
  state: string
  zip_code?: string
  latitude?: number
  longitude?: number
  amenities?: string[]
  features?: string[]
  is_featured: boolean
  views_count: number
  agent_id?: string
  agent?: Agent
  images?: PropertyImage[]
  cover_image?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  budget_min?: number
  budget_max?: number
  preferred_location?: string
  property_type?: PropertyType
  timeline?: string
  message?: string
  lead_score: LeadScore
  source: string
  listing_id?: string
  conversation_id?: string
  listing_type?: ListingType
  is_unsubscribed?: boolean
  unsubscribed_at?: string
  is_contacted: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  session_id: string
  messages: ConversationMessage[]
  lead_data?: Partial<Lead>
  lead_score?: LeadScore
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image?: string
  author_id?: string
  author?: Agent
  category?: string
  tags?: string[]
  is_published: boolean
  published_at?: string
  views_count: number
  read_time?: number
  meta_title?: string
  meta_description?: string
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: string
  name: string
  role?: string
  avatar_url?: string
  content: string
  rating: number
  location?: string
  is_published: boolean
  created_at: string
}

export interface SiteSettings {
  id: string
  site_name: string
  tagline?: string
  logo_url?: string
  phone?: string
  email?: string
  address?: string
  social_links?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
    youtube?: string
  }
  google_sheets_webhook?: string
  make_webhook?: string
}

// ============================================================
// API Response Types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  message: string
  code?: string
}

// ============================================================
// Filter / Search Types
// ============================================================

export interface ListingFilters {
  search?: string
  listing_type?: ListingType | ''
  property_type?: PropertyType | ''
  min_price?: number
  max_price?: number
  bedrooms?: number
  bathrooms?: number
  city?: string
  status?: ListingStatus | ''
  is_featured?: boolean
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'featured'
  page?: number
  per_page?: number
}

// ============================================================
// Form Types
// ============================================================

export interface ListingFormData {
  title: string
  description: string
  price: number
  listing_type: ListingType
  property_type: PropertyType
  status: ListingStatus
  bedrooms: number
  bathrooms: number
  square_footage?: number
  lot_size?: number
  year_built?: number
  address: string
  city: string
  state: string
  zip_code?: string
  amenities?: string[]
  features?: string[]
  is_featured: boolean
  agent_id?: string
}

export interface BlogFormData {
  title: string
  excerpt: string
  content: string
  category?: string
  tags?: string[]
  is_published: boolean
  meta_title?: string
  meta_description?: string
}

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  listing_id?: string
}
