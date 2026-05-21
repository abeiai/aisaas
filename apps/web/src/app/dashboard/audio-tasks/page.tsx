import Link from "next/link";
import { ArrowLeft, Coins, Download, ExternalLink, Headphones, Play, Radio } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { audioUrl, getAudioTasks, type AudioTask } from "@/lib/audio-api";
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

function statusVariant(status: AudioTask["status"]) {
  if (status === "SUCCEEDED") {
    return "secondary" as const;
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "muted" as const;
  }

  return "outline" as const;
}

function previewText(task: AudioTask) {
  const value = task.inputText ?? task.voiceAsset?.name ?? "";

  return value.length > 38 ? `${value.slice(0, 38)}...` : value || "无输入内容";
}

function consumedCredits(task: AudioTask) {
  return (task.actualCredits ?? task.estimatedCredits).toLocaleString("zh-CN");
}

export default async function AudioTasksPage() {
  await getCurrentUser();
  const tasks = await getAudioTasks();
  const succeededCount = tasks.filter((task) => task.status === "SUCCEEDED").length;
  const failedCount = tasks.filter((task) => task.status === "FAILED").length;
  const totalCredits = tasks.reduce((sum, task) => sum + (task.actualCredits ?? 0), 0);

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge>音频任务</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
              语音生成记录
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              查看语音合成、声音设计、声音复刻的任务状态、音色、模型、点数消耗和输出音频。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/tools/text-to-speech">
                <Headphones data-icon="inline-start" />
                创建语音任务
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
            <CardDescription>成功任务可在线播放或下载音频，失败任务会显示中文原因。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务类型</TableHead>
                    <TableHead>输入摘要</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>音色</TableHead>
                    <TableHead>点数</TableHead>
                    <TableHead>音频</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length > 0 ? (
                    tasks.map((task) => {
                      const url = audioUrl(task);

                      return (
                        <TableRow key={task.id}>
                          <TableCell>{task.typeName}</TableCell>
                          <TableCell className="max-w-[220px]">{previewText(task)}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(task.status)}>{task.statusName}</Badge>
                          </TableCell>
                          <TableCell>{task.voiceAsset?.name ?? "系统音色"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <Coins data-icon="inline-start" />
                              {consumedCredits(task)} 点
                            </span>
                          </TableCell>
                          <TableCell>
                            {url ? (
                              <div className="flex flex-wrap gap-2">
                                <a className="inline-flex items-center gap-1 text-sm font-medium" href={url}>
                                  <Play />
                                  试听
                                </a>
                                <a className="inline-flex items-center gap-1 text-sm font-medium" download href={url}>
                                  <Download />
                                  下载
                                </a>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">文件已删除</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(task.createdAt)}</TableCell>
                          <TableCell>
                            <Link className="inline-flex items-center gap-2 text-sm font-medium" href={`/dashboard/audio-tasks/${task.id}`}>
                              查看
                              <ExternalLink />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={8}>
                        暂无音频任务。可以先进入文字转语音、声音设计或声音复刻工具。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span className="inline-flex items-center gap-3">
              <Radio data-icon="inline-start" />
              音频任务不会绕过钱包扣费；失败时冻结点数会自动释放。
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/voices">查看音色库</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}
