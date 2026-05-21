import Link from "next/link";
import { ArrowRight, Coins, FileText, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiTasks } from "@/lib/ai-api";
import { getAudioTasks } from "@/lib/audio-api";
import { getCurrentUser, userLogoutAction } from "@/lib/auth-actions";
import { getWallet } from "@/lib/billing-api";
import { dashboardQuickLinks } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [wallet, tasks, audioTasks] = await Promise.all([
    getWallet(),
    getAiTasks().catch(() => []),
    getAudioTasks().catch(() => [])
  ]);
  const latestTasks = tasks.slice(0, 4);
  const stats = [
    {
      label: "账号状态",
      value: "正常",
      description: user.email,
      icon: FileText
    },
    {
      label: "可用点数",
      value: wallet.availableCredits.toLocaleString("zh-CN"),
      description: "来自真实钱包余额",
      icon: Coins
    },
    {
      label: "AI / 音频任务",
      value: (tasks.length + audioTasks.length).toLocaleString("zh-CN"),
      description: "最近任务记录",
      icon: Sparkles
    }
  ];

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge>用户中心</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
              欢迎回来，{user.nickname}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              从这里进入 AI 工具、任务历史、点数充值和个人资料。余额和任务数据来自真实接口。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/articles">
                浏览文章
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/billing">充值点数</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tools">使用工具</Link>
            </Button>
            <form action={userLogoutAction}>
              <Button type="submit" variant="outline">
                退出登录
              </Button>
            </form>
          </div>
        </div>
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
            <CardDescription>展示最近 4 条 AI 生成记录。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latestTasks.length > 0 ? (
              latestTasks.map((task) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-4 text-sm"
                  href={`/tools/${task.scenario.slug}?task=${task.id}`}
                  key={task.id}
                >
                  <span className="font-medium">{task.scenario.name}</span>
                  <span className="text-muted-foreground">{task.statusName}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                暂无 AI 任务。可以先进入工具列表创建第一条生成任务。
              </div>
            )}
            {latestTasks.length > 0 ? (
              <Button asChild className="w-fit" variant="outline">
                <Link href="/dashboard/tasks">查看全部任务</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>最近音频任务</CardTitle>
            <CardDescription>展示最近 4 条语音合成、声音设计和声音复刻记录。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {audioTasks.slice(0, 4).length > 0 ? (
              audioTasks.slice(0, 4).map((task) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-4 text-sm"
                  href={`/dashboard/audio-tasks/${task.id}`}
                  key={task.id}
                >
                  <span className="font-medium">{task.typeName}</span>
                  <span className="text-muted-foreground">{task.statusName}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                暂无音频任务。可以先进入语音工具创建第一条生成任务。
              </div>
            )}
            {audioTasks.length > 0 ? (
              <Button asChild className="w-fit" variant="outline">
                <Link href="/dashboard/audio-tasks">查看音频任务</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}
