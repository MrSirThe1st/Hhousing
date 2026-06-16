import type { MetadataRoute } from "next";
import { createListingRepo } from "./api/shared";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://harakaproperty.com";

  let listingUrls: MetadataRoute.Sitemap = [];
  try {
    const listingRepo = createListingRepo();
    const items = await listingRepo.listPublicListings({ featuredOnly: false });

    listingUrls = items.map((item) => ({
      url: `${baseUrl}/listing/${item.listing.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));
  } catch (error) {
    // Fail-safe fallback if DB query fails during compile/build time
    // eslint-disable-next-line no-console
    console.error("Failed to build dynamic sitemap urls:", error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9
    },
    ...listingUrls
  ];
}
