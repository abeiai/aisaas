import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Coins, HelpCircle, WalletCards } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rechargePackages } from "@/lib/billing-api";
import { pricingFaqs, useCaseGroups } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "价格与点数充值 - AI SaaS",
  description: "查看 AI SaaS 点数充值套餐、消耗规则、适用场景和常见问题。"
};

const creditRules = [
  "AI 任务提交后先冻结预估点数",
  "生成成功后按实际消耗结算",
  "生成失败会自动释放冻结点数",
  "充值与流水可在用户中心查看"
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="flex flex-col gap-5">
            <Badge>价格方案</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              按点数使用中文 AI 工具
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              第一阶段采用点数充值模式，只支持支付宝和微信支付。用户可先选择工具，
              再根据任务频率充值对应点数包。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login?next=%2Fdashboard%2Fbilling">
                  登录后充值
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tools">先看 AI 工具</Link>
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                <WalletCards />
              </div>
              <CardTitle>点数说明</CardTitle>
              <CardDescription>每个工具会在提交前展示预估消耗，实际扣点以任务结算为准。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {creditRules.map((rule) => (
                <div className="flex items-center gap-3" key={rule}>
                  <CheckCircle2 data-icon="inline-start" />
                  <span>{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {rechargePackages.map((item) => (
            <Card key={item.code}>
              <CardHeader>
                <CardDescription>{item.name}</CardDescription>
                <CardTitle className="font-display text-4xl font-light">
                  ¥{item.amountCny}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins data-icon="inline-start" />
                  {item.credits.toLocaleString("zh-CN")} 点
                </div>
                <p className="min-h-12 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <Button asChild variant="outline">
                  <Link href="/login?next=%2Fdashboard%2Fbilling">选择该套餐</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-semibold text-muted-foreground">适用场景</p>
            <h2 className="font-display text-4xl font-light leading-tight tracking-normal">
              从内容生产到工具站验证
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {useCaseGroups.map((item) => (
              <Card className="bg-background" key={item.title}>
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                    <item.icon />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <HelpCircle />
          常见问题
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {pricingFaqs.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
                <CardDescription>{item.answer}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
