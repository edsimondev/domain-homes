import { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ListingsClient from '@/components/listing/ListingsClient'

export const metadata: Metadata = {
  title: 'Properties — Browse Homes for Sale & Rent',
  description: 'Search our curated collection of premium properties.',
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F5F0E8] pt-16">
        <div className="bg-[#F5F0E8] border-b border-[#372308]/8 py-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="section-label mb-3">Properties</p>
            <h1 className="editorial-md text-[#372308]">
              {params.listing_type === 'rent' ? 'Homes for Rent' :
               params.listing_type === 'sale' ? 'Homes for Sale' : 'All Properties'}
            </h1>
          </div>
        </div>
        <ListingsClient initialSearchParams={params} />
      </main>
      <Footer />
    </>
  )
}
