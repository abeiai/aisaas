import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, Coins, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiToolCategories, getAiTools } from "@/lib/ai-api";

export const metadata: Metadata = {
  title: "AI 工具列表 - AI SaaS",
  description: "浏览 AI SaaS 已开放和规划中的中文 AI 工具，查看点数消耗并进入工具详情。"
};

export default async function ToolsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const query = await searchParams;
  const activeCategory = query.category?.trim() || "";
  const [categories, tools] = await Promise.all([
    getAiToolCategories().catch(() => []),
    getAiTools(activeCategory || undefined).catch(() => [])
  ]);
  const groupedTools = categories
    .map((category) => ({
      ...category,
      tools: tools.filter((tool) => tool.toolCategory?.slug === category.slug)
    }))
    .filter((category) => category.tools.length > 0);
  const fallbackGroup =
    tools.filter((tool) => !tool.toolCategory).length > 0
      ? [
          {
            id: "uncategorized",
            name: "未分类",
            slug: "uncategorized",
            description: "尚未绑定分类的工具。",
            tools: tools.filter((tool) => !tool.toolCategory)
          }
        ]
      : [];
  const groups = [...groupedTools, ...fallbackGroup];

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-5">
            <Badge>AI 工具</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              选择一个中文 AI 工作流
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              每个工具都会展示用途、预估点数和输入要求。未登录用户可先查看详情，提交时会引导登录。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/tasks">查看任务历史</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant={activeCategory ? "outline" : "default"}>
            <Link href="/tools">全部工具</Link>
          </Button>
          {categories.map((category) => (
            <Button
              asChild
              key={category.slug}
              size="sm"
              variant={activeCategory === category.slug ? "default" : "outline"}
            >
              <Link href={`/tools?category=${category.slug}`}>{category.name}</Link>
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-10">
          {groups.map((category) => (
            <section className="flex flex-col gap-4" key={category.name}>
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles />
                {category.name}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {category.tools.map((tool) => (
                  <Card key={tool.slug}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                          <Bot />
                        </div>
                        <Badge variant="secondary">可使用</Badge>
                      </div>
                      <CardTitle>{tool.name}</CardTitle>
                      <CardDescription>{tool.description ?? "进入工具详情填写动态表单并生成内容。"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Coins data-icon="inline-start" />
                        预估 {tool.costCredits.toLocaleString("zh-CN")} 点 / 次
                      </div>
                      <Button asChild>
                        <Link href={`/tools/${tool.slug}`}>
                          立即使用
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                暂无可用 AI 工具，请稍后再试或联系管理员启用工具模板。
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}
