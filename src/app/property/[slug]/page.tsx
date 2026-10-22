import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RiHotelBedLine,RiRulerLine, RiMapPin2Line, RiArrowLeftLine, RiCheckLine, RiCalendarLine, RiPhoneLine, RiMailLine } from 'react-icons/ri'
import { BiBath } from 'react-icons/bi' 
import { LuShowerHead } from 'react-icons/lu'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PropertyCard from '@/components/listing/PropertyCard'
import ContactFormInner from '@/components/listing/ContactFormInner'
import ViewTracker from '@/components/ui/ViewTracker'
import { getListingBySlug, getRelatedListings } from '@/lib/listings'
import { formatPrice } from '@/lib/utils'

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) return { title: 'Property Not Found' }
  return {
    title: `${listing.title} — ${formatPrice(listing.price, listing.listing_type)}`,
    description: listing.description?.slice(0, 160),
  }
}

export default async function PropertyPage({ params }: PageProps) {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) notFound()

  const related = await getRelatedListings(listing)

  return (
    <>
      <Navbar />
      <ViewTracker type="listing" id={listing.id} />
      <main className="pt-16 min-h-screen bg-[#F5F0E8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <Link href="/listings" className="inline-flex items-center gap-2 text-sm text-[#372308]/50 hover:text-[#372308] mb-8 transition-colors">
            <RiArrowLeftLine size={15} /> Back to listings
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image gallery */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden" style={{ height: '400px' }}>
                <div className="relative col-span-1 row-span-2">
                  {listing.cover_image ? (
                    <Image src={listing.cover_image} alt={listing.title} fill className="object-cover" priority />
                  ) : (
                    <div className="w-full h-full bg-[#E8E0D0]" />
                  )}
                </div>
                {listing.images?.slice(1, 3).map((img, i) => (
                  <div key={img.id} className="relative hidden sm:block overflow-hidden">
                    <Image src={img.url} alt={listing.title} fill className="object-cover" />
                    {i === 1 && listing.images!.length > 3 && (
                      <div className="absolute inset-0 bg-[#372308]/50 flex items-center justify-center">
                        <span className="text-[#F5F0E8] font-bold">+{listing.images!.length - 3}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Property info */}
              <div className="bg-[#F5F0E8] border border-[#372308]/8 rounded-2xl p-7">
                {/* Tags + price */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`tag-pill ${listing.listing_type === 'rent' ? 'tag-rent' : 'tag-sale'}`}>For {listing.listing_type}</span>
                  <span className="tag-pill border border-[#372308]/15 text-[#372308]/60 capitalize">{listing.property_type}</span>
                  {listing.is_featured && <span className="tag-pill bg-[#F0D5A0] text-[#372308]">Featured</span>}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <h1 className="font-black text-[#372308] tracking-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {listing.title}
                  </h1>
                  <div className="text-right">
                    <p className="font-black text-[#372308] text-3xl tracking-tight">{formatPrice(listing.price, listing.listing_type)}</p>
                    {listing.square_footage && (
                      <p className="text-xs text-[#8a7968] mt-0.5">${(listing.price / listing.square_footage).toFixed(0)}/sqft</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[#8a7968] text-sm mb-6">
                  <RiMapPin2Line size={14} />
                  {listing.address}, {listing.city}, {listing.state}{listing.zip_code ? ` ${listing.zip_code}` : ''}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-[#F0D5A0]/20 rounded-xl p-4 mb-6">
                  {[
                    ...(listing.bedrooms > 0 ? [{ icon: RiHotelBedLine, val: listing.bedrooms, lbl: 'Bedrooms' }] : []),
                    ...(listing.bathrooms > 0 ? [{ icon: LuShowerHead, val: listing.bathrooms, lbl: 'Bathrooms' }] : []),
                    ...(listing.square_footage ? [{ icon: RiRulerLine, val: `${listing.square_footage.toLocaleString()}`, lbl: 'Sq Ft' }] : []),
                    ...(listing.year_built ? [{ icon: RiCalendarLine, val: listing.year_built, lbl: 'Year Built' }] : []),
                  ].map(({ icon: Icon, val, lbl }) => (
                    <div key={lbl} className="text-center">
                      <Icon className="text-[#372308]/40 mx-auto mb-1" size={16} />
                      <p className="font-black text-[#372308] text-lg tracking-tight">{val}</p>
                      <p className="text-[#8a7968] text-xs">{lbl}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <h2 className="font-bold text-[#372308] mb-3 text-base">About this property</h2>
                <div className="prose-content text-[#372308]/60 text-sm leading-relaxed whitespace-pre-line mb-6">
                  {listing.description}
                </div>

                {/* Amenities */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <>
                    <h2 className="font-bold text-[#372308] mb-3 text-base">Amenities</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {listing.amenities.map(a => (
                        <div key={a} className="flex items-center gap-2 text-sm text-[#372308]/60">
                          <div className="w-5 h-5 rounded-full bg-[#F0D5A0] flex items-center justify-center shrink-0">
                            <RiCheckLine className="text-[#372308]" size={10} />
                          </div>
                          {a}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Agent */}
              {listing.agent && (
                <div className="bg-[#F5F0E8] border border-[#372308]/8 rounded-2xl p-6">
                  <p className="section-label mb-4">Listed by</p>
                  <div className="flex items-center gap-3 mb-4">
                    {listing.agent.photo_url ? (
                      <Image src={listing.agent.photo_url} alt={listing.agent.name} width={52} height={52} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-13 h-13 rounded-full bg-[#F0D5A0] flex items-center justify-center text-[#372308] font-black text-lg">{listing.agent.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className="font-semibold text-[#372308]">{listing.agent.name}</p>
                      <p className="text-xs text-[#8a7968]">Licensed Agent</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {listing.agent.phone && (
                      <a href={`tel:${listing.agent.phone}`} className="flex items-center gap-2.5 text-sm text-[#372308]/60 hover:text-[#372308] transition-colors">
                        <RiPhoneLine size={14} /> {listing.agent.phone}
                      </a>
                    )}
                    <a href={`mailto:${listing.agent.email}`} className="flex items-center gap-2.5 text-sm text-[#372308]/60 hover:text-[#372308] transition-colors">
                      <RiMailLine size={14} /> {listing.agent.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Contact form */}
              <div className="bg-[#372308] rounded-2xl p-6">
                <h3 className="font-bold text-[#F5F0E8] mb-1 text-base">Schedule a Viewing</h3>
                <p className="text-[#F5F0E8]/40 text-xs mb-5">Get in touch about this property</p>
                <ContactFormInner listingId={listing.id} dark />
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <p className="section-label mb-3">Similar Properties</p>
              <h2 className="editorial-md text-[#372308] mb-8">You might<br /><span className="italic font-light text-[#8a7968]">also like</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map(r => <PropertyCard key={r.id} listing={r} />)}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
