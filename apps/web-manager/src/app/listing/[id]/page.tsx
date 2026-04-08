import Link from "next/link";
import { notFound } from "next/navigation";
import PublicListingDetailApplicationForm from "../../../components/public-listing-detail-application-form";
import PublicListingDetailShareActions from "../../../components/public-listing-detail-share-actions";
import { createListingRepo } from "../../api/shared";

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const listingRepo = createListingRepo();
  const item = await listingRepo.getPublicListingById(id);

  if (!item) {
    notFound();
  }

  const gallery = item.listing.galleryImageUrls.length > 0
    ? item.listing.galleryImageUrls
    : item.property.photoUrls;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-[#0063fe] hover:underline">
            ← Back to marketplace
          </Link>
          <PublicListingDetailShareActions title={item.title} sharePath={item.sharePath} />
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-video bg-slate-200" style={{ backgroundImage: `url(${item.listing.coverImageUrl ?? gallery[0] ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <div className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{item.locationLabel}</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{item.title}</h1>
                <p className="mt-3 text-lg font-semibold text-slate-800">{item.priceLabel}</p>
                {item.listing.marketingDescription ? (
                  <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{item.listing.marketingDescription}</p>
                ) : null}
              </div>
            </div>

            {gallery.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {gallery.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="aspect-4/3 rounded-3xl border border-slate-200 bg-slate-200 shadow-sm" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Listing details</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                {item.listing.visibility.showAddress ? <p><span className="font-semibold text-slate-900">Address:</span> {item.property.address}</p> : null}
                {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null ? <p><span className="font-semibold text-slate-900">Bedrooms:</span> {item.unit.bedroomCount}</p> : null}
                {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null ? <p><span className="font-semibold text-slate-900">Bathrooms:</span> {item.unit.bathroomCount}</p> : null}
                {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null ? <p><span className="font-semibold text-slate-900">Size:</span> {item.unit.sizeSqm} sqm</p> : null}
                {item.listing.visibility.showDeposit ? <p><span className="font-semibold text-slate-900">Deposit:</span> {item.unit.depositAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}</p> : null}
                {item.listing.visibility.showAmenities && item.unit.amenities.length > 0 ? <p><span className="font-semibold text-slate-900">Amenities:</span> {item.unit.amenities.join(", ")}</p> : null}
                {item.listing.visibility.showFeatures && item.unit.features.length > 0 ? <p><span className="font-semibold text-slate-900">Features:</span> {item.unit.features.join(", ")}</p> : null}
                {item.listing.contactEmail ? <p><span className="font-semibold text-slate-900">Contact email:</span> {item.listing.contactEmail}</p> : null}
                {item.listing.contactPhone ? <p><span className="font-semibold text-slate-900">Contact phone:</span> {item.listing.contactPhone}</p> : null}
                {item.listing.youtubeUrl ? <p><a href={item.listing.youtubeUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0063fe] hover:underline">Watch video tour</a></p> : null}
                {item.listing.instagramUrl ? <p><a href={item.listing.instagramUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0063fe] hover:underline">Open Instagram post</a></p> : null}
              </div>
            </div>

            <PublicListingDetailApplicationForm listingId={item.listing.id} />
          </div>
        </section>
      </div>
    </main>
  );
}