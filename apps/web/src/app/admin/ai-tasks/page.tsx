import Link from "next/link";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminAiTasks, type AdminAiTask } from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "未完成";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function statusVariant(status: AdminAiTask["status"]) {
  if (status === "SUCCEEDED") {
    return "secondary" as const;
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "muted" as const;
  }

  return "outline" as const;
}

export default async function AdminAiTasksPage() {
  const tasks = await getAdminAiTasks();

  return (
    <AdminShell
      active="/admin/ai-tasks"
      title="AI 任务"
      description="查看用户提交的 AI 任务、模型、usage 和点数结算结果。"
    >
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>仅展示最近 100 条 AI 任务。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务 ID</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>场景</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>消耗点数</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>完成时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs">
                        <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/ai-tasks/${task.id}`}>
                          {task.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{task.user?.nickname ?? "用户"}</span>
                          <span className="text-xs text-muted-foreground">{task.user?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{task.scenario.name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(task.status)}>{task.statusName}</Badge>
                      </TableCell>
                      <TableCell>{task.modelName ?? "本地 mock"}</TableCell>
                      <TableCell>
                        {(task.actualCredits ?? 0).toLocaleString("zh-CN")} /{" "}
                        {task.estimatedCredits.toLocaleString("zh-CN")} 点
                      </TableCell>
                      <TableCell>{formatDate(task.createdAt)}</TableCell>
                      <TableCell>{formatDate(task.finishedAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={8}>
                      暂无 AI 任务。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
