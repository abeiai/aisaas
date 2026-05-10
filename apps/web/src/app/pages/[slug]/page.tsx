import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicPage } from "@/lib/cms-api";
import { markdownToHtml } from "@/lib/markdown";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

function keywords(value: string | null) {
  return value
    ? value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;
}

async function baseUrl() {
  const settings = await getPublicSystemConfigs().catch(() => []);
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  return (configByKey.get("siteUrl") || process.env.APP_BASE_URL || "http://localhost:7341").replace(/\/+$/, "");
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug).catch(() => null);

  if (!page) {
    return {
      title: "页面不存在"
    };
  }

  const rootUrl = await baseUrl();
  const canonical = page.canonicalUrl || `${rootUrl}/pages/${page.slug}`;
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.title;

  return {
    title,
    description,
    keywords: keywords(page.seoKeywords),
    alternates: {
      canonical
    },
    robots: {
      index: !page.noIndex,
      follow: !page.noIndex
    },
    openGraph: {
      title: page.ogTitle || title,
      description: page.ogDescription || description,
      url: canonical,
      type: "article",
      images: page.ogImage ? [page.ogImage] : undefined
    }
  };
}

export default async function PageDetail({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicPage(slug).catch(() => null);

  if (!page) {
    notFound();
  }

  return (
    <PublicShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            返回首页
          </Link>
        </Button>
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>单页</Badge>
            <Badge variant="secondary">已发布</Badge>
            <span className="text-sm text-muted-foreground">
              更新于 {new Date(page.updatedAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
          <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
            {page.title}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            {page.seoDescription ?? "这是一个已发布的站点单页。"}
          </p>
        </header>
        <div
          className="flex flex-col gap-5 border-t border-border pt-8 text-base leading-8 text-foreground"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(page.content) }}
        />
      </article>
    </PublicShell>
  );
}
