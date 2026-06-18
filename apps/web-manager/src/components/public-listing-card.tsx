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
    <article className={`group relative overflow-hidden border border-slate-200 hover:border-slate-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${compact ? "rounded-3xl" : "rounded-4xl"} ${className}`}>
      {/* Absolute clickable overlay */}
      <Link href={item.sharePath} className="absolute inset-0 z-10" />

      {/* Image with zoom effect */}
      <div className={`${compact ? "aspect-[4/3]" : "aspect-video"} bg-slate-200 overflow-hidden`}>
        <div
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(${coverImageUrl})`,
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        />
      </div>

      <div className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
        {/* Line 1: Location & Status */}
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <span>{item.locationLabel}</span>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Disponible</span>
        </div>

        {/* Line 2: Title & Price */}
        <div className="flex items-start justify-between gap-3 mt-1.5">
          <h3 className={`font-bold text-slate-900 leading-tight ${compact ? "text-base" : "text-lg md:text-xl"}`}>
            {displayTitle}
          </h3>
          <div className="text-right shrink-0">
            <span className={`font-extrabold text-[#0063fe] leading-none ${compact ? "text-base" : "text-lg md:text-xl"}`}>
              {item.unit.monthlyRentAmount.toLocaleString("fr-FR")} {item.unit.currencyCode}
            </span>
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">/ mois</span>
          </div>
        </div>

        {/* Description */}
        {item.listing.marketingDescription ? (
          <p className={`text-slate-500 leading-relaxed ${compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"}`}>
            {item.listing.marketingDescription}
          </p>
        ) : null}

        {/* Icon Badges */}
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null ? (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 font-medium">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {item.unit.bedroomCount} ch
            </span>
          ) : null}
          {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null ? (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 font-medium">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 112 11h16.138m-9.3 0v7m0 0H7m1.838 0h3M12 4v4m3-4v3M9 4v3" />
              </svg>
              {item.unit.bathroomCount} sdb
            </span>
          ) : null}
          {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null ? (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 font-medium">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {item.unit.sizeSqm} m²
            </span>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-4">
          <div className="text-sm font-semibold text-[#0063fe] group-hover:text-blue-700 flex items-center gap-1 transition-colors">
            Voir le bien <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </div>
          {showShareActions ? (
            <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
              <PublicListingShareActions title={item.title} sharePath={item.sharePath} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}