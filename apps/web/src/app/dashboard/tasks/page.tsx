import Link from "next/link";
import { ArrowLeft, Coins, ExternalLink, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAiTasks, type AiTask } from "@/lib/ai-api";
import { getCurrentUser } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "未完成";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function statusVariant(status: AiTask["status"]) {
  if (status === "SUCCEEDED") {
    return "secondary" as const;
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "muted" as const;
  }

  return "outline" as const;
}

function previewText(task: AiTask) {
  const value = typeof task.input?.text === "string" ? task.input.text : "";

  return value.length > 42 ? `${value.slice(0, 42)}...` : value || "无输入内容";
}

function consumedCredits(task: AiTask) {
  return (task.actualCredits ?? task.estimatedCredits).toLocaleString("zh-CN");
}

export default async function TasksPage() {
  await getCurrentUser();
  const tasks = await getAiTasks();
  const succeededCount = tasks.filter((task) => task.status === "SUCCEEDED").length;
  const failedCount = tasks.filter((task) => task.status === "FAILED").length;
  const totalCredits = tasks.reduce((sum, task) => sum + (task.actualCredits ?? 0), 0);

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge>任务历史</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
              AI 生成记录
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              查看最近 50 条 AI 任务、任务状态、点数消耗和生成结果。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/tools">
                <Sparkles data-icon="inline-start" />
                创建新任务
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft data-icon="inline-start" />
                返回用户中心
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>成功任务</CardDescription>
              <CardTitle className="text-3xl">{succeededCount.toLocaleString("zh-CN")}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>失败任务</CardDescription>
              <CardTitle className="text-3xl">{failedCount.toLocaleString("zh-CN")}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>累计消耗</CardDescription>
              <CardTitle className="text-3xl">{totalCredits.toLocaleString("zh-CN")} 点</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>任务列表</CardTitle>
            <CardDescription>点击查看可回到对应工具详情页继续编辑输入。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工具</TableHead>
                    <TableHead>输入摘要</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>点数</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.scenario.name}</TableCell>
                        <TableCell className="max-w-[260px]">{previewText(task)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(task.status)}>{task.statusName}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <Coins data-icon="inline-start" />
                            {consumedCredits(task)} 点
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(task.createdAt)}</TableCell>
                        <TableCell>
                          <Link
                            className="inline-flex items-center gap-2 text-sm font-medium"
                            href={`/dashboard/tasks/${task.id}`}
                          >
                            查看
                            <ExternalLink />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        暂无 AI 任务。可以先进入工具列表创建第一条生成任务。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}
