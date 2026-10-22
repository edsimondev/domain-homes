import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ListingForm from '../../ListingForm'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  const [{ data: listing }, { data: agents }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, images:property_images(id, url, order)')
      .eq('id', id)
      .single(),
    supabase.from('agents').select('id, name').eq('is_active', true),
  ])

  if (!listing) notFound()

  // Sort images by order
  if (listing.images) {
    listing.images.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">
          Edit Listing
        </h1>
        <p className="text-[#8a7968] text-sm mt-1 truncate max-w-lg">
          {listing.title}
        </p>
      </div>

      <ListingForm agents={agents || []} listing={listing} />
    </div>
  )
}

// import { createClient } from '@/lib/supabase/server'
// import { notFound } from 'next/navigation'
// import ListingForm from '../../ListingForm'

// export default async function EditListingPage({ params }: { params: { id: string } }) {
//   const supabase = await createClient()

//   const [{ data: listing }, { data: agents }] = await Promise.all([
//     supabase
//       .from('listings')
//       .select('*, images:property_images(id, url, order)')
//       .eq('id', params.id)
//       .single(),
//     supabase.from('agents').select('id, name').eq('is_active', true),
//   ])

//   if (!listing) notFound()

//   // Sort images by order
//   if (listing.images) {
//     listing.images.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
//   }

//   return (
//     <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
//       <div className="mb-6">
//         <h1 className="font-display text-2xl font-bold text-[#372308]">Edit Listing</h1>
//         <p className="text-[#8a7968] text-sm mt-1 truncate max-w-lg">{listing.title}</p>
//       </div>
//       <ListingForm agents={agents || []} listing={listing} />
//     </div>
//   )
// }
