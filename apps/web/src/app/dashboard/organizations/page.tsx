import Link from "next/link";
import { Building2, Coins, Users } from "lucide-react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addOrganizationMemberAction,
  allocateOrganizationQuotaAction,
  createOrganizationAction,
  getOrganization,
  getUserOrganizations
} from "@/lib/organizations-api";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatPoints(value: number) {
  return `${value.toLocaleString("zh-CN")} 点`;
}

function roleBadge(role: string) {
  if (role === "OWNER") {
    return "所有者";
  }

  if (role === "ADMIN") {
    return "管理员";
  }

  if (role === "FINANCE_ADMIN") {
    return "财务";
  }

  return "成员";
}

export default async function DashboardOrganizationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const organizationsResult = await getUserOrganizations();

  if (!organizationsResult.enabled) {
    return (
      <DashboardShell active="organizations">
        <section className="flex flex-col gap-6 px-5 py-8">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              企业账号体系暂未启用，当前仍使用个人账户和个人点数钱包。
            </CardContent>
          </Card>
        </section>
      </DashboardShell>
    );
  }

  const selectedOrgId = firstParam(params, "org") || organizationsResult.organizations[0]?.id || "";
  const selectedOrganization = selectedOrgId
    ? await getOrganization(selectedOrgId).catch(() => null)
    : null;
  const selectedMembership = organizationsResult.organizations.find((organization) => organization.id === selectedOrgId);
  const isManager = selectedMembership?.role === "OWNER" || selectedMembership?.role === "ADMIN";

  return (
    <DashboardShell active="organizations">
      <section className="flex flex-col gap-6 px-5 py-8">
        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building2 data-icon="inline-start" />
                  企业空间
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {organizationsResult.organizations.length > 0 ? (
                  organizationsResult.organizations.map((organization) => (
                    <Link
                      className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                      href={`/dashboard/organizations?org=${organization.id}`}
                      key={organization.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{organization.name}</p>
                        <Badge variant="outline">{roleBadge(organization.role)}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        可用 {formatPoints(organization.wallet?.balanceAvailable ?? 0)} · 我的额度 {formatPoints(organization.quota.remainingQuota)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">还没有加入任何企业。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">创建企业</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createOrganizationAction} className="flex flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor="org-name">企业名称</FieldLabel>
                    <Input id="org-name" name="name" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="org-legal-name">法定名称</FieldLabel>
                    <Input id="org-legal-name" name="legalName" />
                  </Field>
                  <FieldGroup className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="org-type">类型</FieldLabel>
                      <Input id="org-type" name="type" defaultValue="企业" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="employee-size">规模</FieldLabel>
                      <Input id="employee-size" name="employeeSize" placeholder="1-50 人" />
                    </Field>
                  </FieldGroup>
                  <Button type="submit">创建企业</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {selectedOrganization ? (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <Coins className="size-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">企业可用余额</p>
                      <p className="text-2xl font-semibold">
                        {formatPoints(selectedOrganization.wallet?.balanceAvailable ?? 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <Users className="size-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">成员数量</p>
                      <p className="text-2xl font-semibold">{selectedOrganization.members.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">企业状态</p>
                    <p className="text-2xl font-semibold">{selectedOrganization.status === "ACTIVE" ? "正常" : selectedOrganization.status}</p>
                  </CardContent>
                </Card>
              </div>

              {isManager ? (
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">添加成员</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={addOrganizationMemberAction} className="grid gap-3 md:grid-cols-[1fr_160px]">
                        <input name="orgId" type="hidden" value={selectedOrganization.id} />
                        <Field>
                          <FieldLabel htmlFor="member-email">员工邮箱</FieldLabel>
                          <Input id="member-email" name="email" type="email" required />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="member-role">角色</FieldLabel>
                          <Select id="member-role" name="role" defaultValue="MEMBER">
                            <option value="MEMBER">普通成员</option>
                            <option value="ADMIN">企业管理员</option>
                            <option value="FINANCE_ADMIN">财务管理员</option>
                          </Select>
                        </Field>
                        <Field className="md:col-span-2">
                          <FieldLabel htmlFor="member-title">职位</FieldLabel>
                          <Input id="member-title" name="title" />
                        </Field>
                        <Button className="md:col-span-2" type="submit">添加成员</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">分配额度</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form action={allocateOrganizationQuotaAction} className="grid gap-3 md:grid-cols-2">
                        <input name="orgId" type="hidden" value={selectedOrganization.id} />
                        <Field>
                          <FieldLabel htmlFor="quota-member">成员</FieldLabel>
                          <Select id="quota-member" name="memberId" required>
                            {selectedOrganization.members
                              .filter((member) => member.status === "ACTIVE")
                              .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.nickname} · {member.email}
                                </option>
                              ))}
                          </Select>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="quota-type">额度类型</FieldLabel>
                          <Select id="quota-type" name="quotaType" defaultValue="ONE_TIME">
                            <option value="ONE_TIME">一次性额度</option>
                            <option value="MONTHLY">月度额度</option>
                          </Select>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="quota-total">分配点数</FieldLabel>
                          <Input id="quota-total" name="totalQuota" type="number" min="1" required />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="quota-remark">备注</FieldLabel>
                          <Input id="quota-remark" name="remark" />
                        </Field>
                        <Button className="md:col-span-2" type="submit">分配额度</Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">成员与额度</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>成员</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>总额度</TableHead>
                        <TableHead>已用</TableHead>
                        <TableHead>剩余</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrganization.members.map((member) => {
                        const quota = member.quotas.reduce(
                          (summary, item) => {
                            summary.total += item.totalQuota;
                            summary.used += item.usedQuota;
                            summary.remaining += item.remainingQuota;
                            return summary;
                          },
                          { total: 0, used: 0, remaining: 0 }
                        );

                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <p className="font-medium">{member.nickname}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </TableCell>
                            <TableCell>{member.roleName}</TableCell>
                            <TableCell>{member.statusName}</TableCell>
                            <TableCell>{formatPoints(quota.total)}</TableCell>
                            <TableCell>{formatPoints(quota.used)}</TableCell>
                            <TableCell>{formatPoints(quota.remaining)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                创建或选择一个企业后，可以管理成员、额度和企业钱包。
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
