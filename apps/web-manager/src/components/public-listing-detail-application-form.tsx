"use client";

import PublicListingApplicationForm from "./public-listing-application-form";

interface PublicListingDetailApplicationFormProps {
  listingId: string;
}

export default function PublicListingDetailApplicationForm({
  listingId
}: PublicListingDetailApplicationFormProps): React.ReactElement {
  return <PublicListingApplicationForm listingId={listingId} />;
}