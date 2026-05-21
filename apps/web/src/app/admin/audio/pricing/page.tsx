import { Coins, RefreshCcw, Wand2 } from "lucide-react";

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
  updateAudioPricingRuleAction,
  type AudioPricingRule
} from "@/lib/audio-admin-api";

export const dynamic = "force-dynamic";

function ruleVariant(rule: AudioPricingRule) {
  return rule.isEnabled ? ("secondary" as const) : ("muted" as const);
}

export default async function AdminAudioPricingPage() {
  const rules = await getAdminAudioPricingRules();
  const enabledCount = rules.filter((rule) => rule.isEnabled).length;
  const latestUpdatedAt = rules.reduce<string | null>((latest, rule) => {
    if (!latest || new Date(rule.updatedAt).getTime() > new Date(latest).getTime()) {
      return rule.updatedAt;
    }

    return latest;
  }, null);

  return (
    <AdminShell
      active="/admin/audio/pricing"
      title="语音计费"
      description="配置语音合成、声音设计和声音复刻的点数规则，前台任务提交时读取最新启用规则。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="计费规则" value={rules.length.toLocaleString("zh-CN")} />
          <Metric label="启用规则" value={enabledCount.toLocaleString("zh-CN")} />
          <Metric label="最近更新" value={latestUpdatedAt ? new Date(latestUpdatedAt).toLocaleString("zh-CN") : "暂无"} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>计费策略</CardTitle>
            <CardDescription>失败任务默认释放冻结点数；试听预览不单独扣费，正式任务按下方规则结算。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Policy label="失败是否退点" value="开启" />
            <Policy label="试听是否免费" value="开启" />
            <Policy label="最低扣费" value="按规则配置" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新增或覆盖规则</CardTitle>
            <CardDescription>同一任务类型和模型只保留一条规则，模型填 * 表示默认规则。</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>规则列表</CardTitle>
            <CardDescription>禁用规则后，匹配该类型和模型的新任务会被拒绝执行。</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length > 0 ? (
                    rules.map((rule) => <RuleRow key={rule.id} rule={rule} />)
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={9}>
                        暂无计费规则。
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <Coins />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function RuleRow({ rule }: { rule: AudioPricingRule }) {
  const formId = `audio-rule-${rule.id}`;

  return (
    <TableRow>
      <TableCell>{rule.operationTypeName}</TableCell>
      <TableCell className="font-mono text-xs">{rule.model}</TableCell>
      <TableCell>
        <form action={updateAudioPricingRuleAction} className="contents" id={formId}>
          <input name="id" type="hidden" value={rule.id} />
          <Select name="billingMode" defaultValue={rule.billingMode}>
            <option value="PER_CHARACTER">按字符</option>
            <option value="PER_TASK">按任务</option>
            <option value="PER_SECOND">按秒</option>
          </Select>
        </form>
      </TableCell>
      <TableCell>
        <Input form={formId} name="creditsPerUnit" type="number" min="0" step="0.0001" defaultValue={rule.creditsPerUnit} />
      </TableCell>
      <TableCell>
        <Input form={formId} name="minimumCredits" type="number" min="0" step="1" defaultValue={rule.minimumCredits} />
      </TableCell>
      <TableCell>
        <Input form={formId} name="modelMultiplier" type="number" min="0" step="0.0001" defaultValue={rule.modelMultiplier} />
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm">
          <input form={formId} name="isEnabled" type="checkbox" defaultChecked={rule.isEnabled} />
          <Badge variant={ruleVariant(rule)}>{rule.statusName}</Badge>
        </label>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(rule.updatedAt).toLocaleString("zh-CN")}
      </TableCell>
      <TableCell>
        <Button form={formId} size="sm" type="submit" variant="outline">
          <RefreshCcw data-icon="inline-start" />
          保存
        </Button>
      </TableCell>
    </TableRow>
  );
}
