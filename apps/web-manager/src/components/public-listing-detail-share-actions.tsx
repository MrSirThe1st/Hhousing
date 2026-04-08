"use client";

import PublicListingShareActions from "./public-listing-share-actions";

interface PublicListingDetailShareActionsProps {
  title: string;
  sharePath: string;
}

export default function PublicListingDetailShareActions({
  title,
  sharePath
}: PublicListingDetailShareActionsProps): React.ReactElement {
  return <PublicListingShareActions title={title} sharePath={sharePath} />;
}