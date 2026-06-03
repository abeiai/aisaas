import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { featureGroups } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "产品功能 - AI SaaS",
  description: "了解 AI SaaS 的中文内容站、AI 能力体验、CMS、支付点数和后台管理能力。"
};

export default function FeaturesPage() {
  return (
    <PublicShell>
      <section className="flex w-full flex-col gap-10 px-5 py-16">
        <div className="flex w-full flex-col gap-5">
          <Badge>产品功能</Badge>
          <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
            面向中文内容工具站的基础能力
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            当前版本优先把可访问页面、登录闭环、后台管理、CMS 发布、支付点数和 AI 任务串起来，
            让产品能被用户真实访问和试用。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">
                免费注册
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/use-cases">查看使用场景</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {featureGroups.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                  <group.icon />
                </div>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {group.items.map((item) => (
                  <div className="flex items-center gap-3 text-sm" key={item}>
                    <CheckCircle2 data-icon="inline-start" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
