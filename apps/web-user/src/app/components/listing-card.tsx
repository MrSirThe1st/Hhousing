import type { ReactElement } from "react";

export interface ListingPreview {
  id: string;
  title: string;
  purpose: "rent" | "sale";
  location: string;
  priceUsd: number;
}

export function ListingCard({ listing }: { listing: ListingPreview }): ReactElement {
  const purposeLabel = listing.purpose === "rent" ? "For Rent" : "For Sale";

  return (
    <a className="card" href={`/listings/${listing.id}`}>
      <span className="badge">{purposeLabel}</span>
      <h3>{listing.title}</h3>
      <p className="meta">{listing.location}</p>
      <p className="price">${listing.priceUsd.toLocaleString()}</p>
    </a>
  );
}
