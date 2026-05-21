import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicArticle } from "@/lib/cms-api";
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

function articleCover(article: Awaited<ReturnType<typeof getPublicArticle>>) {
  return article.ogImage || article.coverMedia?.url || article.coverImage || undefined;
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
  const article = await getPublicArticle(slug).catch(() => null);

  if (!article) {
    return {
      title: "文章不存在"
    };
  }

  const rootUrl = await baseUrl();
  const canonical = article.canonicalUrl || `${rootUrl}/articles/${article.slug}`;
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.summary || article.title;
  const image = articleCover(article);

  return {
    title,
    description,
    keywords: keywords(article.seoKeywords),
    alternates: {
      canonical
    },
    robots: {
      index: !article.noIndex,
      follow: !article.noIndex
    },
    openGraph: {
      title: article.ogTitle || title,
      description: article.ogDescription || description,
      url: canonical,
      type: "article",
      images: image ? [image] : undefined
    }
  };
}

export default async function ArticleDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublicArticle(slug).catch(() => null);

  if (!article) {
    notFound();
  }

  const coverUrl = article.coverMedia?.url || article.coverImage;
  const categories = article.categories && article.categories.length > 0
    ? article.categories
    : article.category
      ? [article.category]
      : [];

  return (
    <PublicShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/articles">
            <ArrowLeft data-icon="inline-start" />
            返回文章列表
          </Link>
        </Button>
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 0 ? (
              categories.map((category) => (
                <Badge variant="outline" key={category.id}>
                  {category.name}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">未分类</Badge>
            )}
            <Badge variant="secondary">已发布</Badge>
            <span className="text-sm text-muted-foreground">
              {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "未设置发布时间"}
            </span>
          </div>
          <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
            {article.title}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">{article.summary}</p>
          {article.tags && article.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge variant="muted" key={tag.id}>
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">来源：AI SaaS 内容团队</p>
        </header>
        <div className="aspect-[16/9] overflow-hidden rounded-lg border border-border bg-secondary">
          {coverUrl ? (
            <img className="size-full object-cover" src={coverUrl} alt={article.title} />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              暂无封面
            </div>
          )}
        </div>
        <MarkdownContent
          className="border-t border-border pt-8 text-base leading-8 text-foreground"
          content={article.content}
        />
      </article>
    </PublicShell>
  );
}
