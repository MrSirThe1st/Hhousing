"use client";

import Link from "next/link";
import type { PublicListingView } from "@hhousing/api-contracts";
import PublicListingShareActions from "./public-listing-share-actions";

interface PublicListingCardProps {
  item: PublicListingView;
  compact?: boolean;
  showShareActions?: boolean;
  className?: string;
}

export default function PublicListingCard({
  item,
  compact = false,
  showShareActions = true,
  className = ""
}: PublicListingCardProps): React.ReactElement {
  const coverImageUrl = item.listing.coverImageUrl ?? item.property.photoUrls[0] ?? "";
  const showRent = item.listing.visibility.showRent;
  const highlightAmenities = item.listing.visibility.showAmenities
    ? item.unit.amenities.filter((amenity) => amenity === "Parking" || amenity === "Gardien").slice(0, 2)
    : [];

  let displayTitle = item.title;
  const capitalizedPropertyName = item.property.name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (item.property.propertyType === "multi_unit") {
    let cleanUnitNumber = item.unit.unitNumber;
    cleanUnitNumber = cleanUnitNumber.replace(new RegExp(`^${item.property.name}\\s*[-·•\\s]\\s*`, "i"), "");
    cleanUnitNumber = cleanUnitNumber.replace(/^(unité|unite|unit)\s*[-·•\\s]*\s*/i, "");
    displayTitle = `${capitalizedPropertyName} — Unit ${cleanUnitNumber}`;
  } else {
    displayTitle = item.title
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return (
    <article className={`group relative overflow-hidden border border-slate-200 bg-white hover:border-slate-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl ${className}`}>
      <Link href={item.sharePath} className="absolute inset-0 z-10" />

      <div className={`${compact ? "aspect-[4/3]" : "aspect-video"} bg-slate-100 overflow-hidden relative`}>
        <div
          className="w-full h-full transition-transform duration-500 group-hover:scale-103"
          style={{
            backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        />
        <div className="absolute left-3 top-3 z-20">
          <span className="inline-flex items-center rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm">
            Disponible maintenant
          </span>
        </div>
      </div>

      <div className={compact ? "space-y-2.5 p-4" : "space-y-3.5 p-5"}>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1">
            {showRent ? (
              <>
                <span className={`font-black text-slate-900 tracking-tight ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
                  {item.unit.monthlyRentAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ mois</span>
              </>
            ) : (
              <span className={`font-bold text-slate-500 ${compact ? "text-sm" : "text-base"}`}>
                Prix sur demande
              </span>
            )}
          </div>
        </div>

        <h3 className={`font-bold text-slate-800 leading-snug tracking-tight truncate ${compact ? "text-sm" : "text-base md:text-lg"}`}>
          {displayTitle}
        </h3>

        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{item.locationLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 pt-1">
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null && (
            <div className="flex items-center gap-1.5">
              <span>{item.unit.bedroomCount} ch</span>
            </div>
          )}
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null &&
           item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
            <span className="text-slate-350">·</span>
          )}
          {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
            <div className="flex items-center gap-1.5">
              <span>{item.unit.bathroomCount} sdb</span>
            </div>
          )}
          {((item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null) ||
            (item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null)) &&
           item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
            <span className="text-slate-350">·</span>
          )}
          {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
            <div className="flex items-center gap-1.5">
              <span>{item.unit.sizeSqm} m²</span>
            </div>
          )}
          {highlightAmenities.map((amenity) => (
            <span key={amenity} className="text-slate-500">
              <span className="text-slate-350">·</span> {amenity}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
          <span className="text-xs font-bold text-slate-700 group-hover:text-[#0063fe] flex items-center gap-1 transition-colors">
            Voir le bien <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
          {showShareActions && (
            <div className="relative z-25" onClick={(e) => e.stopPropagation()}>
              <PublicListingShareActions title={item.title} sharePath={item.sharePath} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
