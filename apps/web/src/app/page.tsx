import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Newspaper } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { PublicModuleRenderer } from "@/components/content-modules/public-module-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicArticles } from "@/lib/cms-api";
import { conversionSteps, featureGroups } from "@/lib/product-data";
import { getPublicHomeComposition } from "@/lib/page-composition-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

const highlights = ["可访问路由", "中文界面", "真实 CMS", "后台管理", "登录闭环"];

function configMap(settings: Awaited<ReturnType<typeof getPublicSystemConfigs>>) {
  return new Map(settings.map((setting) => [setting.key, setting.value]));
}

function parseHighlights(value: string | undefined) {
  return (value || highlights.join("\n"))
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseArticleCount(value: string | undefined) {
  const count = Number(value ?? 3);

  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 12) : 3;
}

function siteUrl(configByKey: Map<string, string>) {
  return (configByKey.get("siteUrl") || process.env.APP_BASE_URL || "http://localhost:7341").replace(/\/+$/, "");
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSystemConfigs().catch(() => []);
  const configByKey = configMap(settings);
  const title = configByKey.get("seoTitle") || "AI SaaS - 简体中文内容型工具站底座";
  const description =
    configByKey.get("seoDescription") || "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。";
  const url = siteUrl(configByKey);

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      type: "website"
    }
  };
}

export default async function HomePage() {
  const composition = await getPublicHomeComposition().catch(() => null);

  if (composition) {
    return (
      <PublicShell showHeader={composition.showHeader} showFooter={composition.showFooter}>
        <PublicModuleRenderer modules={composition.items.map((item) => item.module)} />
      </PublicShell>
    );
  }

  const [articles, settings] = await Promise.all([
    getPublicArticles().catch(() => []),
    getPublicSystemConfigs().catch(() => [])
  ]);
  const configByKey = configMap(settings);
  const siteName = configByKey.get("siteName") || "AI SaaS";
  const homeTitle = configByKey.get("homeTitle") || "面向内容型 AI SaaS 的第一批可运营页面";
  const homeDescription =
    configByKey.get("homeDescription") ||
    "首页、文章、单页、用户中心和管理后台已经连成可访问的中文界面。内容来自 CMS，登录、钱包和 AI 文案生成均已具备第一版闭环。";
  const homeCtaText = configByKey.get("homeCtaText") || "免费注册";
  const homeCtaHref = configByKey.get("homeCtaHref") || "/register";
  const homeHighlights = parseHighlights(configByKey.get("homeFeatureHighlights"));
  const latestArticles = articles.slice(0, parseArticleCount(configByKey.get("homeLatestArticleCount")));

  return (
    <PublicShell>
      <section className="grid w-full gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <div className="flex flex-col justify-center gap-8">
          <Badge>{siteName} · 运营首页</Badge>
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              {homeTitle}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {homeDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={homeCtaHref}>
                {homeCtaText}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/experience/chat">进入体验区</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">价格方案</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {homeHighlights.map((item) => (
              <Badge variant="outline" key={item}>
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>运营工作台预览</CardTitle>
            <CardDescription>第一版先呈现内容工具站的核心入口。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              ["选择能力", "从体验区开始试用"],
              ["充值点数", "支付宝或微信创建充值订单"],
              ["回看任务", "在用户中心查看结果和流水"]
            ].map(([title, description]) => (
              <div className="flex items-start gap-4 rounded-md border border-border bg-background p-4" key={title}>
                <div className="flex size-9 items-center justify-center rounded-md bg-secondary">
                  <CheckCircle2 />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border bg-card">
        <div className="grid w-full gap-8 px-5 py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-muted-foreground">产品介绍</p>
            <h2 className="font-display text-4xl font-light leading-tight tracking-normal">
              从可见页面开始搭建 SaaS 底座
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureGroups.slice(0, 3).map((feature) => (
              <Card className="bg-background" key={feature.title}>
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                    <feature.icon />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="grid w-full gap-8 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-muted-foreground">新用户路径</p>
          <h2 className="font-display text-4xl font-light leading-tight tracking-normal">
            从注册到生成结果
          </h2>
          <p className="leading-7 text-muted-foreground">
            首页直接引导用户进入体验区、充值和任务历史，避免只停留在产品介绍。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {conversionSteps.map((step) => (
            <Link
              className="flex items-start gap-4 rounded-md border border-border bg-card p-5"
              href={step.href}
              key={step.title}
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                <step.icon />
              </div>
              <span className="flex flex-col gap-1">
                <span className="font-medium">{step.title}</span>
                <span className="text-sm leading-6 text-muted-foreground">{step.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex w-full flex-col gap-8 px-5 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-col gap-3">
            <p className="text-sm font-semibold text-muted-foreground">最新文章</p>
            <h2 className="font-display text-4xl font-light leading-tight tracking-normal">
              内容入口已经就绪
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/articles">
              查看全部文章
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {latestArticles.map((article) => (
            <Card key={article.slug}>
              <div className="aspect-[16/9] overflow-hidden border-b border-border bg-secondary">
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
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  {(article.categories && article.categories.length > 0 ? article.categories : article.category ? [article.category] : []).map(
                    (category) => (
                      <Badge variant="outline" key={category.id}>
                        {category.name}
                      </Badge>
                    )
                  )}
                  {!article.categories?.length && !article.category ? <Badge variant="outline">未分类</Badge> : null}
                </div>
                <CardTitle>{article.title}</CardTitle>
                <CardDescription>{article.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
                  href={`/articles/${article.slug}`}
                >
                  阅读文章
                  <ArrowRight />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="flex w-full flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Newspaper />
              登录 / 注册入口
            </div>
            <h2 className="font-display text-3xl font-light leading-tight tracking-normal">
              注册后直接进入工具和充值流程
            </h2>
            <p className="leading-7 text-muted-foreground">
              注册、登录、点数充值、任务历史和后台管理均已接入真实接口，可继续进入用户中心或管理员后台。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">免费注册</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">已有账号登录</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">管理员入口</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
