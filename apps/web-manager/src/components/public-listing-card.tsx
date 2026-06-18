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

  return (
    <article className={`group relative overflow-hidden border border-slate-200 bg-white hover:border-slate-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl ${className}`}>
      {/* Absolute clickable overlay */}
      <Link href={item.sharePath} className="absolute inset-0 z-10" />

      {/* Image with zoom effect */}
      <div className={`${compact ? "aspect-[4/3]" : "aspect-video"} bg-slate-100 overflow-hidden`}>
        <div
          className="w-full h-full transition-transform duration-500 group-hover:scale-103"
          style={{
            backgroundImage: `url(${coverImageUrl})`,
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        />
      </div>

      <div className={compact ? "space-y-2.5 p-4" : "space-y-3.5 p-5"}>
        {/* Price */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className={`font-black text-slate-900 tracking-tight ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
              {item.unit.monthlyRentAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ mois</span>
          </div>
        </div>

        {/* Title */}
        <h3 className={`font-bold text-slate-800 leading-snug tracking-tight truncate ${compact ? "text-sm" : "text-base md:text-lg"}`}>
          {displayTitle}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{item.locationLabel}</span>
        </div>

        {/* Characteristics Inline List */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 pt-1">
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{item.unit.bedroomCount} ch</span>
            </div>
          )}
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null && 
           item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
            <span className="text-slate-350">•</span>
          )}
          {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 112 11h16.138m-9.3 0v7m0 0H7m1.838 0h3M12 4v4m3-4v3M9 4v3" />
              </svg>
              <span>{item.unit.bathroomCount} sdb</span>
            </div>
          )}
          {((item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null) || 
            (item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null)) && 
           item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
            <span className="text-slate-350">•</span>
          )}
          {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>{item.unit.sizeSqm} m²</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
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