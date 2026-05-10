import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicArticles } from "@/lib/cms-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSystemConfigs().catch(() => []);
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const baseUrl = (configByKey.get("siteUrl") || process.env.APP_BASE_URL || "http://localhost:7341").replace(/\/+$/, "");
  const title = `文章列表 - ${configByKey.get("siteName") || "AI SaaS"}`;
  const description = "浏览 CMS 中已发布的内容运营、产品建设和 AI SaaS 实践文章。";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/articles`
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/articles`,
      type: "website"
    }
  };
}

export default async function ArticlesPage() {
  const articles = await getPublicArticles().catch(() => []);

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
        <div className="flex max-w-3xl flex-col gap-4">
          <Badge>文章列表</Badge>
          <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
            内容运营与产品建设记录
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            这里展示 CMS 中已发布的文章，草稿和已下架内容不会出现在前台。
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Search />
          当前列表展示已发布内容，可通过分类和标题快速浏览。
        </div>
        <div className="grid gap-4">
          {articles.map((article) => (
            <Card className="overflow-hidden" key={article.slug}>
              <div className="grid md:grid-cols-[240px_1fr]">
                <div className="aspect-[16/9] bg-secondary md:aspect-auto">
                  {article.coverMedia?.url || article.coverImage ? (
                    <img
                      className="size-full object-cover"
                      src={article.coverMedia?.url ?? article.coverImage ?? ""}
                      alt={article.title}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                      暂无封面
                    </div>
                  )}
                </div>
                <div>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{article.category?.name ?? "未分类"}</Badge>
                      <Badge variant="secondary">已发布</Badge>
                      <span className="text-sm text-muted-foreground">
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString("zh-CN")
                          : "未设置发布时间"}
                      </span>
                    </div>
                    <CardTitle>{article.title}</CardTitle>
                    <CardDescription>{article.summary}</CardDescription>
                    {article.tags && article.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map((tag) => (
                          <Badge variant="muted" key={tag.id}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline">
                      <Link href={`/articles/${article.slug}`}>
                        阅读详情
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
