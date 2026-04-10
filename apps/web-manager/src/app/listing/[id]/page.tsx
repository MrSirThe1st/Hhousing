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
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
          <div className="flex items-center justify-between">
            <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0063fe]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Retour au marketplace
            </Link>
            <PublicListingDetailShareActions title={item.title} sharePath={item.sharePath} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200" style={{ backgroundImage: `url(${item.listing.coverImageUrl ?? gallery[0] ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    {item.locationLabel}
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">{item.title}</h1>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[#0063fe]">{item.priceLabel}</span>
                  <span className="text-sm text-slate-500">/ mois</span>
                </div>
                {item.listing.marketingDescription ? (
                  <p className="mt-6 text-lg leading-relaxed text-slate-600">{item.listing.marketingDescription}</p>
                ) : null}
              </div>
            </div>

            {gallery.length > 0 ? (
              <div>
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Galerie photos</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition hover:border-blue-300" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900">Caractéristiques</h2>
                <div className="mt-6 space-y-4">
                  {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Chambres</div>
                        <div className="font-semibold text-slate-900">{item.unit.bedroomCount}</div>
                      </div>
                    </div>
                  ) : null}
                  {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Salles de bain</div>
                        <div className="font-semibold text-slate-900">{item.unit.bathroomCount}</div>
                      </div>
                    </div>
                  ) : null}
                  {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Surface</div>
                        <div className="font-semibold text-slate-900">{item.unit.sizeSqm} m²</div>
                      </div>
                    </div>
                  ) : null}
                  {item.listing.visibility.showDeposit ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Caution</div>
                        <div className="font-semibold text-slate-900">{item.unit.depositAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}</div>
                      </div>
                    </div>
                  ) : null}
                  {item.listing.visibility.showAddress ? (
                    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">Adresse</div>
                      <div className="mt-1 text-sm text-slate-900">{item.property.address}</div>
                    </div>
                  ) : null}
                </div>

                {item.listing.visibility.showAmenities && item.unit.amenities.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Équipements</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.unit.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{amenity}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.listing.visibility.showFeatures && item.unit.features.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Caractéristiques</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.unit.features.map((feature) => (
                        <span key={feature} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{feature}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(item.listing.contactEmail || item.listing.contactPhone || item.listing.youtubeUrl || item.listing.instagramUrl) ? (
                  <div className="mt-6 space-y-2 border-t border-slate-100 pt-6">
                    {item.listing.contactEmail ? (
                      <a href={`mailto:${item.listing.contactEmail}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0063fe]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {item.listing.contactEmail}
                      </a>
                    ) : null}
                    {item.listing.contactPhone ? (
                      <a href={`tel:${item.listing.contactPhone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0063fe]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {item.listing.contactPhone}
                      </a>
                    ) : null}
                    {item.listing.youtubeUrl ? (
                      <a href={item.listing.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0063fe]">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm3.5 10.5l-5 3a.5.5 0 01-.75-.433v-6a.5.5 0 01.75-.433l5 3a.5.5 0 010 .866z" /></svg>
                        Voir la visite vidéo
                      </a>
                    ) : null}
                    {item.listing.instagramUrl ? (
                      <a href={item.listing.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0063fe]">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 0C7.284 0 6.944.012 5.877.06 4.813.109 4.086.278 3.45.525a4.896 4.896 0 00-1.772 1.153A4.908 4.908 0 00.525 3.45C.278 4.086.109 4.813.06 5.877.012 6.944 0 7.284 0 10s.012 3.056.06 4.123c.049 1.064.218 1.791.465 2.427a4.896 4.896 0 001.153 1.772 4.908 4.908 0 001.772 1.153c.636.247 1.363.416 2.427.465C6.944 19.988 7.284 20 10 20s3.056-.012 4.123-.06c1.064-.049 1.791-.218 2.427-.465a4.896 4.896 0 001.772-1.153 4.908 4.908 0 001.153-1.772c.247-.636.416-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.012-3.056-.06-4.123c-.049-1.064-.218-1.791-.465-2.427a4.896 4.896 0 00-1.153-1.772A4.908 4.908 0 0016.55.525C15.914.278 15.187.109 14.123.06 13.056.012 12.716 0 10 0zm0 1.802c2.67 0 2.987.01 4.041.059.975.044 1.504.207 1.857.344.467.181.8.398 1.15.748.35.35.567.683.748 1.15.137.353.3.882.344 1.857.048 1.054.059 1.37.059 4.041s-.01 2.987-.059 4.041c-.044.975-.207 1.504-.344 1.857a3.097 3.097 0 01-.748 1.15c-.35.35-.683.567-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.059-4.041.059s-2.987-.01-4.041-.059c-.975-.044-1.504-.207-1.857-.344a3.097 3.097 0 01-1.15-.748 3.098 3.098 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.054-.059-1.37-.059-4.041s.01-2.987.059-4.041c.044-.975.207-1.504.344-1.857.181-.467.398-.8.748-1.15.35-.35.683-.567 1.15-.748.353-.137.882-.3 1.857-.344 1.054-.048 1.37-.059 4.041-.059z" clipRule="evenodd" /><path fillRule="evenodd" d="M10 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0-8.898a5.398 5.398 0 110 10.796 5.398 5.398 0 010-10.796zM15.5 4.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" clipRule="evenodd" /></svg>
                        Voir sur Instagram
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <PublicListingDetailApplicationForm listingId={item.listing.id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}