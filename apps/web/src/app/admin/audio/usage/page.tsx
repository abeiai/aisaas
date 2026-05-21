import Link from "next/link";
import { Activity, Coins, Gauge, Mic2, RefreshCcw, Wand2, type LucideIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createAudioPricingRuleAction,
  getAdminAudioPricingRules,
  getAdminAudioUsageDashboard,
  updateAudioPricingRuleAction,
  type AudioPricingRule,
  type AudioUsageSummary
} from "@/lib/audio-admin-api";

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

function duration(value: number | null) {
  if (!value) {
    return "0 秒";
  }

  return `${Math.round(value / 1000).toLocaleString("zh-CN")} 秒`;
}

function statusVariant(success: boolean) {
  return success ? ("secondary" as const) : ("muted" as const);
}

function ruleVariant(rule: AudioPricingRule) {
  return rule.isEnabled ? ("secondary" as const) : ("outline" as const);
}

export default async function AdminAudioUsagePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    from: searchValue(params, "from"),
    to: searchValue(params, "to"),
    operationType: searchValue(params, "operationType"),
    model: searchValue(params, "model")
  };
  const [rules, dashboard] = await Promise.all([
    getAdminAudioPricingRules(),
    getAdminAudioUsageDashboard(filters)
  ]);
  const maxTrendCalls = Math.max(1, ...dashboard.trend.map((item) => item.requestCount));

  return (
    <AdminShell
      active="/admin/audio/usage"
      title="语音计费"
      description="配置语音任务计费规则，查看语音合成、声音设计和声音复刻的用量统计。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Activity} label="今日语音任务" value={dashboard.today.requestCount.toLocaleString("zh-CN")} />
          <MetricCard icon={Mic2} label="今日合成字符" value={dashboard.today.characterCount.toLocaleString("zh-CN")} />
          <MetricCard icon={Coins} label="今日消耗" value={`${dashboard.today.consumedCredits.toLocaleString("zh-CN")} 点`} />
          <MetricCard icon={Gauge} label="区间失败率" value={percent(dashboard.total.failureRate)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>筛选用量</CardTitle>
            <CardDescription>按日期、操作类型和模型查看语音用量。统计数据来自 AudioUsageLog。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-5">
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
                  <FieldLabel htmlFor="operationType">操作类型</FieldLabel>
                  <Select id="operationType" name="operationType" defaultValue={dashboard.filters.operationType}>
                    <option value="">全部类型</option>
                    {dashboard.operationTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="model">模型</FieldLabel>
                  <Select id="model" name="model" defaultValue={dashboard.filters.model}>
                    <option value="">全部模型</option>
                    {dashboard.models.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button type="submit">
                    <RefreshCcw data-icon="inline-start" />
                    应用筛选
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>区间汇总</CardTitle>
            <CardDescription>
              {dashboard.filters.from} 至 {dashboard.filters.to}，点数以后台计费规则结算为准。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SummaryGrid summary={dashboard.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>计费规则</CardTitle>
            <CardDescription>没有启用规则时，对应语音任务不得执行。模型填 * 表示默认规则。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form action={createAudioPricingRuleAction} className="grid gap-4 rounded-md border border-border p-4 md:grid-cols-6">
              <FieldGroup className="contents">
                <Field>
                  <FieldLabel htmlFor="new-operationType">操作类型</FieldLabel>
                  <Select id="new-operationType" name="operationType" defaultValue="TTS">
                    <option value="TTS">语音合成</option>
                    <option value="VOICE_DESIGN">声音设计</option>
                    <option value="VOICE_CLONE">声音复刻</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-model">模型</FieldLabel>
                  <Input id="new-model" name="model" defaultValue="*" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-billingMode">计费方式</FieldLabel>
                  <Select id="new-billingMode" name="billingMode" defaultValue="PER_CHARACTER">
                    <option value="PER_CHARACTER">按字符计费</option>
                    <option value="PER_TASK">按任务计费</option>
                    <option value="PER_SECOND">按秒计费</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-creditsPerUnit">单位点数</FieldLabel>
                  <Input id="new-creditsPerUnit" name="creditsPerUnit" type="number" min="0" step="0.0001" defaultValue="5" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-minimumCredits">最低扣费</FieldLabel>
                  <Input id="new-minimumCredits" name="minimumCredits" type="number" min="0" step="1" defaultValue="5" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-modelMultiplier">模型倍率</FieldLabel>
                  <Input id="new-modelMultiplier" name="modelMultiplier" type="number" min="0" step="0.0001" defaultValue="1" />
                </Field>
              </FieldGroup>
              <label className="flex items-center gap-2 text-sm md:col-span-5">
                <input name="isEnabled" type="checkbox" defaultChecked />
                启用规则
              </label>
              <Button className="w-fit" type="submit">
                <Wand2 data-icon="inline-start" />
                保存规则
              </Button>
            </form>

            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>计费方式</TableHead>
                    <TableHead>单位点数</TableHead>
                    <TableHead>最低扣费</TableHead>
                    <TableHead>倍率</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.operationTypeName}</TableCell>
                      <TableCell className="font-mono text-xs">{rule.model}</TableCell>
                      <TableCell>
                        <form action={updateAudioPricingRuleAction} className="contents" id={`rule-${rule.id}`}>
                          <input name="id" type="hidden" value={rule.id} />
                          <Select name="billingMode" defaultValue={rule.billingMode}>
                            <option value="PER_CHARACTER">按字符</option>
                            <option value="PER_TASK">按任务</option>
                            <option value="PER_SECOND">按秒</option>
                          </Select>
                        </form>
                      </TableCell>
                      <TableCell>
                        <Input form={`rule-${rule.id}`} name="creditsPerUnit" type="number" min="0" step="0.0001" defaultValue={rule.creditsPerUnit} />
                      </TableCell>
                      <TableCell>
                        <Input form={`rule-${rule.id}`} name="minimumCredits" type="number" min="0" step="1" defaultValue={rule.minimumCredits} />
                      </TableCell>
                      <TableCell>
                        <Input form={`rule-${rule.id}`} name="modelMultiplier" type="number" min="0" step="0.0001" defaultValue={rule.modelMultiplier} />
                      </TableCell>
                      <TableCell>
                        <label className="flex items-center gap-2 text-sm">
                          <input form={`rule-${rule.id}`} name="isEnabled" type="checkbox" defaultChecked={rule.isEnabled} />
                          <Badge variant={ruleVariant(rule)}>{rule.statusName}</Badge>
                        </label>
                      </TableCell>
                      <TableCell>
                        <Button form={`rule-${rule.id}`} size="sm" type="submit" variant="outline">
                          保存
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <UsageGroup title="按操作类型" items={dashboard.byOperation} />
          <UsageGroup title="按模型" items={dashboard.byModel} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <UsageGroup title="按用户" items={dashboard.byUser} />
          <UsageGroup title="按音色" items={dashboard.byVoice} />
          <UsageGroup title="按任务状态" items={dashboard.byStatus} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>每日趋势</CardTitle>
            <CardDescription>展示语音任务量、失败率、合成字符和消耗点数。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>任务量</TableHead>
                    <TableHead>失败率</TableHead>
                    <TableHead>合成字符</TableHead>
                    <TableHead>音频时长</TableHead>
                    <TableHead>消耗点数</TableHead>
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
                      <TableCell>{item.characterCount.toLocaleString("zh-CN")}</TableCell>
                      <TableCell>{duration(item.audioDurationMs)}</TableCell>
                      <TableCell>{item.consumedCredits.toLocaleString("zh-CN")} 点</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近用量日志</CardTitle>
            <CardDescription>每个语音任务最多写入一条用量日志，重复结算不会重复扣点。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>用量</TableHead>
                    <TableHead>点数</TableHead>
                    <TableHead>任务</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.recentLogs.length > 0 ? (
                    dashboard.recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.createdAt).toLocaleString("zh-CN", { hour12: false })}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{log.user?.nickname ?? "用户"}</span>
                            <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.operationTypeName}</TableCell>
                        <TableCell>{log.model}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(log.success)}>{log.success ? "成功" : "失败"}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.characterCount.toLocaleString("zh-CN")} 字 · {duration(log.audioDurationMs)}
                        </TableCell>
                        <TableCell>{log.consumedCredits.toLocaleString("zh-CN")} 点</TableCell>
                        <TableCell>
                          <Link className="font-mono text-xs underline-offset-4 hover:underline" href={`/dashboard/audio-tasks/${log.taskId}`}>
                            {log.taskId}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={8}>
                        暂无语音用量日志。
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
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <Icon />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="break-words text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SummaryGrid({ summary }: { summary: AudioUsageSummary }) {
  const items = [
    ["语音合成次数", summary.ttsCount.toLocaleString("zh-CN")],
    ["声音设计次数", summary.voiceDesignCount.toLocaleString("zh-CN")],
    ["声音复刻次数", summary.voiceCloneCount.toLocaleString("zh-CN")],
    ["合成字符数", summary.characterCount.toLocaleString("zh-CN")],
    ["生成音频总时长", duration(summary.audioDurationMs)],
    ["消耗点数", `${summary.consumedCredits.toLocaleString("zh-CN")} 点`],
    ["估算成本", cost(summary.estimatedCost)],
    ["失败率", percent(summary.failureRate)],
    ["平均耗时", `${summary.avgLatencyMs.toLocaleString("zh-CN")} ms`]
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

function UsageGroup({
  title,
  items
}: {
  title: string;
  items: Array<{ id: string; name: string } & AudioUsageSummary>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>按当前筛选条件聚合。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>任务量</TableHead>
                <TableHead>消耗</TableHead>
                <TableHead>失败率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.requestCount.toLocaleString("zh-CN")}</TableCell>
                    <TableCell>{item.consumedCredits.toLocaleString("zh-CN")} 点</TableCell>
                    <TableCell>{percent(item.failureRate)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={4}>
                    暂无数据。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
