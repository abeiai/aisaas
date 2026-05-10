import Link from "next/link";
import { Eye, UserRoundCheck, UserRoundX } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUsers, updateUserStatusAction, type AdminUserListItem } from "@/lib/admin-users-api";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "从未登录";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function statusVariant(status: AdminUserListItem["status"]) {
  return status === "ACTIVE" ? "secondary" as const : "muted" as const;
}

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <AdminShell
      active="/admin/users"
      title="用户运营"
      description="查看用户账号、点数余额、注册时间和最近登录时间。"
    >
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>禁用用户后，登录和后续前台请求都会被拒绝。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户 ID</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>点数余额</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最近登录</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="max-w-48 truncate font-mono text-xs">{user.id}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.nickname}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(user.status)}>{user.statusName}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.availableCredits.toLocaleString("zh-CN")} 点
                        {user.frozenCredits > 0 ? ` / 冻结 ${user.frozenCredits.toLocaleString("zh-CN")}` : ""}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye data-icon="inline-start" />
                              详情
                            </Link>
                          </Button>
                          <form action={updateUserStatusAction}>
                            <input name="id" type="hidden" value={user.id} />
                            <input
                              name="status"
                              type="hidden"
                              value={user.status === "ACTIVE" ? "DISABLED" : "ACTIVE"}
                            />
                            <Button size="sm" variant="outline" type="submit">
                              {user.status === "ACTIVE" ? (
                                <UserRoundX data-icon="inline-start" />
                              ) : (
                                <UserRoundCheck data-icon="inline-start" />
                              )}
                              {user.status === "ACTIVE" ? "禁用" : "启用"}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={8}>
                      暂无用户。
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
