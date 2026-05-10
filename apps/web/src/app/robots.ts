import type { MetadataRoute } from "next";

import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

function normalizeSiteUrl(value: string | undefined) {
  return (value || process.env.APP_BASE_URL || "http://localhost:7341").replace(/\/+$/, "");
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSystemConfigs().catch(() => []);
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const siteUrl = normalizeSiteUrl(configByKey.get("siteUrl"));

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin"
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
