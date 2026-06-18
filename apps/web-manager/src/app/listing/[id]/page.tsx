import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicListingDetailApplicationForm from "../../../components/public-listing-detail-application-form";
import PublicListingCopyButton from "../../../components/public-listing-copy-button";
import PublicListingPrintButton from "../../../components/public-listing-print-button";
import { createListingRepo, createRepositoryFromEnv } from "../../api/shared";

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listingRepo = createListingRepo();
  const item = await listingRepo.getPublicListingById(id);

  if (!item) {
    return {
      title: "Logement non disponible — Haraka Property"
    };
  }

  const title = `${item.title} à louer à ${item.locationLabel} — Haraka Property`;
  const description = item.listing.marketingDescription || `Découvrez ce logement disponible à ${item.locationLabel} pour ${item.priceLabel}. Contactez le gestionnaire en direct sur Haraka Property.`;
  const coverImageUrl = item.listing.coverImageUrl ?? item.property.photoUrls[0] ?? "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
      images: coverImageUrl ? [{ url: coverImageUrl, alt: item.title }] : []
    }
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const listingRepo = createListingRepo();
  const item = await listingRepo.getPublicListingById(id);

  if (!item) {
    notFound();
  }

  const repoResult = createRepositoryFromEnv();
  const organization = repoResult.success
    ? await repoResult.data.getOrganizationById(item.listing.organizationId)
    : null;

  const contactPhone = item.listing.contactPhone ?? organization?.contactWhatsapp ?? organization?.contactPhone ?? "";
  const cleanPhone = contactPhone.replace(/\D/g, "");
  const whatsappContactUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par votre annonce "${item.title}".`)}`
    : null;

  let displayTitle = item.title;
  const capitalizedPropertyName = item.property.name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (item.property.propertyType === "multi_unit") {
    let cleanUnitNumber = item.unit.unitNumber;
    // Clean up property name prefix case-insensitively
    cleanUnitNumber = cleanUnitNumber.replace(new RegExp(`^${item.property.name}\\s*[-·•\\s]\\s*`, "i"), "");
    // Clean up "unite/unit/unité" prefix case-insensitively
    cleanUnitNumber = cleanUnitNumber.replace(/^(unité|unite|unit)\s*[-·•\\s]*\s*/i, "");
    displayTitle = `${capitalizedPropertyName} — Unit ${cleanUnitNumber}`;
  } else {
    displayTitle = item.title
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  const gallery = item.listing.galleryImageUrls.length > 0
    ? item.listing.galleryImageUrls
    : item.property.photoUrls;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    "name": item.title,
    "description": item.listing.marketingDescription || undefined,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": item.locationLabel,
      "addressCountry": "CD"
    },
    "offers": {
      "@type": "Offer",
      "price": item.unit.depositAmount || undefined,
      "priceCurrency": item.unit.currencyCode || "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Top Header Breadcrumb */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-10">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au marketplace
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* Left Column (Flush/Flat layout grid style) */}
          <div className="space-y-6">
            {item.listing.visibility.showPostedBy && organization && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  {organization.logoUrl ? (
                    <img
                      src={organization.logoUrl}
                      alt={organization.name}
                      className="h-12 w-12 rounded-full border border-slate-200 object-cover bg-white"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-150 font-bold text-blue-600 border border-blue-200">
                      {organization.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Publié par
                    </p>
                    <h3 className="text-sm font-bold text-slate-800">
                      {organization.name}
                    </h3>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Vérifié
                  </span>
                </div>
              </div>
            )}

            {/* Split Multi-Image Hero / Single Image Frame */}
            {gallery.length >= 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                <div className="md:col-span-2 relative aspect-[16/10] overflow-hidden group">
                  <img
                    src={gallery[0]}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  <div className="absolute bottom-4 left-4">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
                      <svg className="h-3.5 w-3.5 text-[#0063fe]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {item.locationLabel}
                    </div>
                  </div>
                </div>
                <div className="hidden md:grid grid-rows-2 gap-2 h-full">
                  <div className="relative overflow-hidden aspect-[16/9] md:aspect-auto">
                    <img
                      src={gallery[1]}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="relative overflow-hidden aspect-[16/9] md:aspect-auto">
                    <img
                      src={gallery[2]}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    {gallery.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          + {gallery.length - 3} photos
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video rounded-2xl border border-slate-100 overflow-hidden bg-slate-100">
                <img
                  src={gallery[0] || item.listing.coverImageUrl || ""}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-4">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
                    <svg className="h-3.5 w-3.5 text-[#0063fe]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {item.locationLabel}
                  </div>
                </div>
              </div>
            )}

            {/* Title Block & Description */}
            <div className="py-2 space-y-4">
              {/* Operational Actions Utility Row (Neutral and brand-cohesive) */}
              <div className="flex flex-wrap items-center gap-2">
                <PublicListingCopyButton sharePath={item.sharePath} />
                
                <PublicListingPrintButton />

                {whatsappContactUrl && (
                  <a
                    href={whatsappContactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
                  >
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.488 1.459 5.421 1.46 5.48.003 9.938-4.42 9.943-9.877.002-2.643-1.026-5.127-2.897-7.001C17.243 1.862 14.755.83c-5.485 0-9.94 4.42-9.945 9.878-.002 2.025.528 4.003 1.534 5.769l-.999 3.65 3.73-.973zm11.367-7.38c-.345-.174-2.048-1.011-2.359-1.124-.312-.113-.54-.169-.766.173-.226.342-.877 1.124-1.076 1.349-.198.225-.397.253-.742.08-1.912-.962-3.153-1.97-4.417-4.14-.33-.568.33-.527.944-1.748.104-.207.052-.387-.026-.56-.078-.174-.766-1.848-1.049-2.531-.276-.665-.555-.575-.765-.585-.198-.01-.425-.012-.653-.012-.226 0-.595.085-.907.425-.311.342-1.19 1.157-1.19 2.82 0 1.664 1.218 3.27 1.388 3.498.17.228 2.398 3.662 5.807 5.13 2.847 1.228 3.398 1 4.619.885 1.22-.115 2.05-.838 2.333-1.606.284-.768.284-1.427.199-1.564-.085-.137-.311-.223-.656-.397z" />
                    </svg>
                    <span>Contacter sur WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="border-b border-slate-100 pb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{displayTitle}</h1>
                <p className="mt-2 text-sm text-slate-500 flex items-center gap-1 font-semibold">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.locationLabel}
                </p>
              </div>

              {item.listing.marketingDescription ? (
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Description</h3>
                  <p className="text-base leading-relaxed text-slate-700 font-normal whitespace-pre-wrap">{item.listing.marketingDescription}</p>
                </div>
              ) : null}
            </div>

            {/* Thumbnail Gallery Grid */}
            {gallery.length > 0 ? (
              <div className="border-t border-slate-100 pt-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Galerie photos</h2>
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

          {/* Right Sidebar (Consolidated and simplified card elements) */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              
              {/* Core summary / pricing / characteristics card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                {/* Price block */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    {item.unit.monthlyRentAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}
                  </span>
                  <span className="text-xs font-bold text-slate-400 lowercase">/ mois</span>
                </div>

                {/* Characteristics light inline grid */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-600">
                  {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null && (
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{item.unit.bedroomCount} ch</span>
                    </div>
                  )}
                  {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null && 
                   item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
                    <span className="text-slate-300">•</span>
                  )}
                  {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 112 11h16.138m-9.3 0v7m0 0H7m1.838 0h3M12 4v4m3-4v3M9 4v3" />
                      </svg>
                      <span>{item.unit.bathroomCount} sdb</span>
                    </div>
                  )}
                  {((item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null) || 
                    (item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null)) && 
                   item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
                    <span className="text-slate-300">•</span>
                  )}
                  {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span>{item.unit.sizeSqm} m²</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4" />

                {/* Deposit & Address */}
                <div className="space-y-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {item.listing.visibility.showDeposit && (
                    <div className="flex items-center justify-between">
                      <span>Caution</span>
                      <span className="font-extrabold text-slate-800 tracking-normal normal-case">
                        {item.unit.depositAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}
                      </span>
                    </div>
                  )}
                  {item.listing.visibility.showAddress && (
                    <div className="flex flex-col gap-1.5">
                      <span>Adresse</span>
                      <span className="font-medium text-slate-700 tracking-normal normal-case block">
                        {item.property.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Équipements / Détails Section (Flat white card bullet list) */}
              {((item.listing.visibility.showAmenities && item.unit.amenities.length > 0) || 
                (item.listing.visibility.showFeatures && item.unit.features.length > 0)) && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                  {item.listing.visibility.showAmenities && item.unit.amenities.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Équipements</h3>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600 font-medium">
                        {item.unit.amenities.map((amenity) => (
                          <li key={amenity} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{amenity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.listing.visibility.showFeatures && item.unit.features.length > 0 && (
                    <div className={item.listing.visibility.showAmenities && item.unit.amenities.length > 0 ? "border-t border-slate-100 pt-4" : ""}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Détails supplémentaires</h3>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600 font-medium">
                        {item.unit.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Card */}
              {(item.listing.contactEmail || item.listing.contactPhone || item.listing.youtubeUrl) ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact & Visite</h3>
                  <div className="space-y-2.5 text-sm font-semibold">
                    {item.listing.contactEmail ? (
                      <a href={`mailto:${item.listing.contactEmail}`} className="flex items-center gap-2 text-slate-600 hover:text-[#0063fe] transition">
                        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002 2.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{item.listing.contactEmail}</span>
                      </a>
                    ) : null}
                    {item.listing.contactPhone ? (
                      <a href={`tel:${item.listing.contactPhone}`} className="flex items-center gap-2 text-slate-600 hover:text-[#0063fe] transition">
                        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{item.listing.contactPhone}</span>
                      </a>
                    ) : null}
                    {item.listing.youtubeUrl ? (
                      <a href={item.listing.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-[#0063fe] transition">
                        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm3.5 10.5l-5 3a.5.5 0 01-.75-.433v-6a.5.5 0 01.75-.433l5 3a.5.5 0 010 .866z" />
                        </svg>
                        <span className="truncate">Voir la visite vidéo</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Application Form */}
              <PublicListingDetailApplicationForm listingId={item.listing.id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}