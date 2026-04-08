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

  return (
    <article className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${compact ? "rounded-3xl" : "rounded-4xl"} ${className}`}>
      <div
        className={compact ? "aspect-square bg-slate-200" : "aspect-[4/3] bg-slate-200"}
        style={{
          backgroundImage: `url(${coverImageUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />
      <div className={compact ? "space-y-2.5 p-3.5" : "space-y-3 p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.locationLabel}</p>
            <h3 className={`mt-1.5 font-semibold text-slate-950 ${compact ? "text-base leading-5" : "text-lg leading-6"}`}>{item.title}</h3>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Disponible</span>
        </div>
        <p className={`font-semibold text-slate-800 ${compact ? "text-sm" : "text-sm"}`}>{item.priceLabel}</p>
        {item.listing.marketingDescription ? (
          <p className={`text-sm leading-6 text-slate-600 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{item.listing.marketingDescription}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
          {item.listing.visibility.showBedrooms && item.unit.bedroomCount !== null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.unit.bedroomCount} ch</span>
          ) : null}
          {item.listing.visibility.showBathrooms && item.unit.bathroomCount !== null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.unit.bathroomCount} sdb</span>
          ) : null}
          {item.listing.visibility.showSizeSqm && item.unit.sizeSqm !== null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.unit.sizeSqm} m2</span>
          ) : null}
        </div>
        {showShareActions ? <PublicListingShareActions title={item.title} sharePath={item.sharePath} /> : null}
        <Link href={item.sharePath} className="inline-flex rounded-full bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white">
          Voir le bien
        </Link>
      </div>
    </article>
  );
}