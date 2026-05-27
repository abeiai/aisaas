import Link from "next/link";
import { ArrowRight, Coins, FileText, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiTasks } from "@/lib/ai-api";
import { getAudioTasks } from "@/lib/audio-api";
import { getCurrentUser } from "@/lib/auth-actions";
import { getWallet } from "@/lib/billing-api";
import { dashboardQuickLinks } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const accountLabel =
    user.phone && user.email.endsWith("@users.aisaas.local")
      ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`
      : user.email;
  const [wallet, tasks, audioTasks] = await Promise.all([
    getWallet(),
    getAiTasks().catch(() => []),
    getAudioTasks().catch(() => [])
  ]);
  const latestTasks = [
    ...tasks.map((task) => ({
      id: `ai:${task.id}`,
      title: task.scenario.name,
      statusName: task.statusName,
      href: `/dashboard/tasks/${task.id}`,
      createdAt: task.createdAt
    })),
    ...audioTasks.map((task) => ({
      id: `audio:${task.id}`,
      title: task.typeName,
      statusName: task.statusName,
      href: `/dashboard/audio-tasks/${task.id}`,
      createdAt: task.createdAt
    }))
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4);
  const stats = [
    {
      label: "账号状态",
      value: "正常",
      description: accountLabel,
      icon: FileText
    },
    {
      label: "可用点数",
      value: wallet.availableCredits.toLocaleString("zh-CN"),
      description: "来自真实钱包余额",
      icon: Coins
    },
    {
      label: "全部任务",
      value: (tasks.length + audioTasks.length).toLocaleString("zh-CN"),
      description: "最近任务记录",
      icon: Sparkles
    }
  ];

  return (
    <DashboardShell active="overview">
      <section className="flex w-full flex-col gap-8 px-5 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                  <stat.icon />
                </div>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {dashboardQuickLinks.map((item) => (
            <Card key={item.href}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                  <item.icon />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={item.href}>
                    进入
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>最近任务</CardTitle>
            <CardDescription>展示最近 4 条 AI 和音频生成记录。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latestTasks.length > 0 ? (
              latestTasks.map((task) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-4 text-sm"
                  href={task.href}
                  key={task.id}
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-muted-foreground">{task.statusName}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                暂无任务。可以先进入工具或体验区创建第一条生成任务。
              </div>
            )}
            {latestTasks.length > 0 ? (
              <Button asChild className="w-fit" variant="outline">
                <Link href="/dashboard/tasks">查看全部任务</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
