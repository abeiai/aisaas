import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseGroups } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "使用场景 - AI SaaS",
  description: "查看 AI SaaS 在内容运营、工具站 MVP、知识付费配套等场景中的使用方式。"
};

export default function UseCasesPage() {
  return (
    <PublicShell>
      <section className="flex w-full flex-col gap-10 px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="flex flex-col gap-5">
            <Badge>使用场景</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              先服务高频中文内容工作流
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              第一阶段聚焦中文内容站和 AI 能力体验，把用户注册、点数充值、生成结果和后台内容发布连接起来。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/experience/chat">
                  进入体验区
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pricing">查看价格</Link>
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>推荐启动路径</CardTitle>
              <CardDescription>从一个体验能力开始验证需求，再补充更多场景应用。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {["注册账号", "选择体验能力", "余额不足时充值", "在任务历史回看结果"].map((step) => (
                <div className="flex items-center gap-3" key={step}>
                  <CheckCircle2 data-icon="inline-start" />
                  <span>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {useCaseGroups.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                  <group.icon />
                </div>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {group.examples.map((example) => (
                  <Badge variant="outline" key={example}>
                    {example}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

    </PublicShell>
  );
}
