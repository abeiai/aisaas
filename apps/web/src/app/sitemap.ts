import type { MetadataRoute } from "next";

import { getPublicArticles, getPublicPages } from "@/lib/cms-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

function normalizeSiteUrl(value: string | undefined) {
  return (value || process.env.APP_BASE_URL || "http://localhost:7341").replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, pages, settings] = await Promise.all([
    getPublicArticles().catch(() => []),
    getPublicPages().catch(() => []),
    getPublicSystemConfigs().catch(() => [])
  ]);
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const siteUrl = normalizeSiteUrl(configByKey.get("siteUrl"));
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1
    },
    {
      url: `${siteUrl}/articles`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8
    },
    ...articles.filter((article) => !article.noIndex).map((article) => ({
      url: `${siteUrl}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...pages.filter((page) => !page.noIndex).map((page) => ({
      url: `${siteUrl}/pages/${page.slug}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6
    }))
  ];
}
