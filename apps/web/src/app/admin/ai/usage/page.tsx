import { Activity, CheckCircle2, Coins, Gauge, RefreshCcw, Timer, TrendingUp, type LucideIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  aggregateAiUsageAction,
  getAdminAiUsageDashboard,
  getSystemAlerts,
  resolveSystemAlertAction,
  type SystemAlert,
  type UsageSummary
} from "@/lib/ai-usage-api";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function searchValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function cost(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function levelVariant(level: SystemAlert["level"]) {
  return level === "ERROR" ? "muted" as const : level === "WARNING" ? "outline" as const : "secondary" as const;
}

export default async function AdminAiUsagePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    from: searchValue(params, "from"),
    to: searchValue(params, "to"),
    providerId: searchValue(params, "providerId"),
    modelId: searchValue(params, "modelId")
  };
  const [dashboard, alerts] = await Promise.all([
    getAdminAiUsageDashboard(filters),
    getSystemAlerts("OPEN")
  ]);
  const hasUsage = dashboard.total.requestCount > 0;
  const maxTrendCalls = Math.max(1, ...dashboard.trend.map((item) => item.requestCount));

  return (
    <AdminShell
      active="/admin/ai/usage"
      title="AI 用量成本"
      description="查看模型调用量、点数消耗、估算成本、失败率和系统告警。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle>筛选条件</CardTitle>
              <CardDescription>成本字段均为按 token 价格计算的估算值，实际账单以 Provider 为准。</CardDescription>
            </div>
            <form action={aggregateAiUsageAction}>
              <input name="from" type="hidden" value={dashboard.filters.from} />
              <input name="to" type="hidden" value={dashboard.filters.to} />
              <Button type="submit" variant="outline">
                <RefreshCcw data-icon="inline-start" />
                刷新统计
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4">
              <FieldGroup className="contents">
                <Field>
                  <FieldLabel htmlFor="from">开始日期</FieldLabel>
                  <Input id="from" name="from" type="date" defaultValue={dashboard.filters.from} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="to">结束日期</FieldLabel>
                  <Input id="to" name="to" type="date" defaultValue={dashboard.filters.to} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="providerId">Provider</FieldLabel>
                  <Select id="providerId" name="providerId" defaultValue={dashboard.filters.providerId}>
                    <option value="">全部 Provider</option>
                    {dashboard.providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="modelId">模型</FieldLabel>
                  <Select id="modelId" name="modelId" defaultValue={dashboard.filters.modelId}>
                    <option value="">全部模型</option>
                    {dashboard.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldGroup>
              <div className="md:col-span-4">
                <Button type="submit">
                  <Activity data-icon="inline-start" />
                  应用筛选
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {!hasUsage ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无用量统计</CardTitle>
              <CardDescription>当前筛选区间内没有 AI 调用日志。创建任务后可刷新统计。</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Activity} label="今日调用" value={dashboard.today.requestCount.toLocaleString("zh-CN")} />
              <MetricCard icon={Coins} label="今日消耗" value={`${dashboard.today.consumedCredits.toLocaleString("zh-CN")} 点`} />
              <MetricCard icon={TrendingUp} label="今日估算成本" value={cost(dashboard.today.estimatedCost)} badge="估算" />
              <MetricCard icon={Gauge} label="失败率" value={percent(dashboard.total.failureRate)} />
              <MetricCard icon={Timer} label="平均耗时" value={`${dashboard.total.avgLatencyMs.toLocaleString("zh-CN")} ms`} />
              <MetricCard
                icon={CheckCircle2}
                label="最常用模型"
                value={dashboard.top.mostUsedModel?.name ?? "暂无"}
                description={
                  dashboard.top.mostUsedModel
                    ? `${dashboard.top.mostUsedModel.value.toLocaleString("zh-CN")} 次`
                    : undefined
                }
              />
              <MetricCard
                icon={TrendingUp}
                label="最高成本模型"
                value={dashboard.top.mostCostlyModel?.name ?? "暂无"}
                description={
                  dashboard.top.mostCostlyModel
                    ? `估算 ${cost(dashboard.top.mostCostlyModel.value)}`
                    : undefined
                }
                badge="估算"
              />
              <MetricCard
                icon={Activity}
                label="最常用工具"
                value={dashboard.top.mostUsedTool?.name ?? "暂无"}
                description={
                  dashboard.top.mostUsedTool
                    ? `${dashboard.top.mostUsedTool.value.toLocaleString("zh-CN")} 次`
                    : undefined
                }
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>区间汇总</CardTitle>
                <CardDescription>
                  {dashboard.filters.from} 至 {dashboard.filters.to}，估算成本仅用于运营监控。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SummaryGrid summary={dashboard.total} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>近 7 日趋势</CardTitle>
                <CardDescription>按日期展示调用量、失败率、点数消耗和估算成本。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>调用量</TableHead>
                        <TableHead>失败率</TableHead>
                        <TableHead>消耗点数</TableHead>
                        <TableHead>估算成本</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.trend.map((item) => (
                        <TableRow key={item.date}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>
                            <div className="flex min-w-44 items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-secondary">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{
                                    width: `${Math.max(4, (item.requestCount / maxTrendCalls) * 100)}%`
                                  }}
                                />
                              </div>
                              <span>{item.requestCount.toLocaleString("zh-CN")}</span>
                            </div>
                          </TableCell>
                          <TableCell>{percent(item.failureRate)}</TableCell>
                          <TableCell>{item.consumedCredits.toLocaleString("zh-CN")} 点</TableCell>
                          <TableCell>{cost(item.estimatedCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>未处理告警</CardTitle>
            <CardDescription>只在后台展示，不发送外部通知；处理后会记录管理员操作日志。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>级别</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge variant={levelVariant(alert.level)}>{alert.levelName}</Badge>
                        </TableCell>
                        <TableCell>{alert.typeName}</TableCell>
                        <TableCell>
                          <div className="flex max-w-2xl flex-col gap-1">
                            <span className="font-medium">{alert.title}</span>
                            <span className="text-sm text-muted-foreground">{alert.message}</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(alert.createdAt).toLocaleString("zh-CN", { hour12: false })}</TableCell>
                        <TableCell>
                          <form action={resolveSystemAlertAction}>
                            <input name="id" type="hidden" value={alert.id} />
                            <Button size="sm" variant="outline" type="submit">
                              <CheckCircle2 data-icon="inline-start" />
                              标记处理
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        暂无未处理告警。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  badge
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
            <Icon />
          </div>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="break-words text-2xl">{value}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}

function SummaryGrid({ summary }: { summary: UsageSummary }) {
  const items = [
    ["总调用", summary.requestCount.toLocaleString("zh-CN")],
    ["成功", summary.successCount.toLocaleString("zh-CN")],
    ["失败", summary.failureCount.toLocaleString("zh-CN")],
    ["失败率", percent(summary.failureRate)],
    ["输入 Tokens", summary.inputTokens.toLocaleString("zh-CN")],
    ["输出 Tokens", summary.outputTokens.toLocaleString("zh-CN")],
    ["总 Tokens", summary.totalTokens.toLocaleString("zh-CN")],
    ["消耗点数", `${summary.consumedCredits.toLocaleString("zh-CN")} 点`],
    ["估算成本", cost(summary.estimatedCost)]
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(([label, value]) => (
        <div className="rounded-md border border-border p-4" key={label}>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 break-all text-lg font-medium">{value}</p>
        </div>
      ))}
    </div>
  );
}
