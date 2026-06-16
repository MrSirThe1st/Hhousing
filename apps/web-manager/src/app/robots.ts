import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://harakaproperty.com";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/marketplace", "/listing/"],
      disallow: [
        "/dashboard/",
        "/owner-portal/dashboard/",
        "/api/",
        "/account-type",
        "/onboarding"
      ]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
