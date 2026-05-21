import { BadgeCheck, KeyRound, Power, Tags, TestTube2, type LucideIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminAudioModels,
  updateAudioModelAction,
  type AdminAudioModel
} from "@/lib/audio-admin-api";
import {
  getAdminAiProviderPresets,
  testAiProviderPresetAction,
  updateAiProviderPresetAction,
  type AiProviderPreset
} from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

function statusVariant(enabled: boolean) {
  return enabled ? ("secondary" as const) : ("muted" as const);
}

function yesNo(value: boolean) {
  return value ? "支持" : "不支持";
}

export default async function AdminAudioModelsPage() {
  const [models, providerPresets] = await Promise.all([
    getAdminAudioModels(),
    getAdminAiProviderPresets()
  ]);
  const audioProvider =
    providerPresets.find((provider) => provider.adapterType === "DASHSCOPE_AUDIO" && provider.modality === "AUDIO") ?? null;
  const enabledCount = models.filter((model) => model.isEnabled).length;
  const ttsCount = models.filter((model) => model.supportsTts).length;
  const cloneCount = models.filter((model) => model.supportsVoiceClone).length;

  return (
    <AdminShell
      active="/admin/audio/models"
      title="语音模型"
      description="管理语音 Provider 下的模型启停、能力标签、计费倍率和用途别名。"
    >
      <div className="flex flex-col gap-6">
        <AudioProviderCard provider={audioProvider} />

        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={Power} label="已启用模型" value={`${enabledCount}/${models.length}`} />
          <Metric icon={BadgeCheck} label="支持语音合成" value={ttsCount.toLocaleString("zh-CN")} />
          <Metric icon={Tags} label="支持声音复刻" value={cloneCount.toLocaleString("zh-CN")} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>模型配置</CardTitle>
            <CardDescription>禁用模型后，绑定到该模型的语音别名不会再创建新任务。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模型</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>能力</TableHead>
                    <TableHead>计费</TableHead>
                    <TableHead>默认用途</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.length > 0 ? (
                    models.map((model) => <ModelRow key={model.id} model={model} />)
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        暂无语音模型。请确认语音 Provider 预置已同步，然后在本页统一启用模型。
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

function AudioProviderCard({ provider }: { provider: AiProviderPreset | null }) {
  if (!provider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>语音 Provider 配置</CardTitle>
          <CardDescription>尚未找到语音 Provider 预置，请先同步 AI 语音模型预置。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const instance = provider.instance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>语音 Provider 配置</CardTitle>
        <CardDescription>语音能力统一在这里配置 Provider、连接测试和模型启停；通用 AI Provider 页不再单独维护语音模型。</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateAiProviderPresetAction} className="grid gap-5 lg:grid-cols-2">
          <input name="id" type="hidden" value={provider.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="audio-provider-name">Provider 名称</FieldLabel>
              <Input id="audio-provider-name" name="name" defaultValue={instance?.name ?? provider.displayName} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-base-url">Base URL</FieldLabel>
              <Input id="audio-provider-base-url" name="baseUrl" defaultValue={instance?.baseUrl ?? provider.defaultBaseUrl} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-websocket-url">WebSocket URL</FieldLabel>
              <Input id="audio-provider-websocket-url" name="webSocketUrl" defaultValue={instance?.webSocketUrl ?? provider.defaultWebSocketUrl ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-region">地域</FieldLabel>
              <Input id="audio-provider-region" name="region" defaultValue={instance?.region ?? provider.region?.split(",")[0] ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-api-key">API Key</FieldLabel>
              <Input id="audio-provider-api-key" name="apiKey" placeholder={instance?.hasApiKey ? "留空表示不更新密钥" : "请输入 API Key"} type="password" />
            </Field>
          </FieldGroup>
          <FieldGroup>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Adapter" value={provider.adapterType} />
              <Info label="环境变量名" value={provider.apiKeyEnvName} />
              <Info label="连接状态" value={instance?.statusName ?? "未启用"} />
              <Info label="测试结果" value={instance?.lastTestResult?.message ?? "尚未测试"} />
              <Info label="API Key" value={instance?.apiKeyPreview ?? "尚未配置"} />
              <Info label="预置版本" value={provider.presetVersion} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={instance?.status === "ENABLED"} name="isEnabled" type="checkbox" />
              启用语音 Provider
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                <KeyRound data-icon="inline-start" />
                保存 Provider
              </Button>
              <Button formAction={testAiProviderPresetAction} type="submit" variant="outline">
                <TestTube2 data-icon="inline-start" />
                测试连接
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <Icon />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-medium">{value}</p>
    </div>
  );
}

function ModelRow({ model }: { model: AdminAudioModel }) {
  const formId = `audio-model-${model.id}`;

  return (
    <TableRow>
      <TableCell className="min-w-64">
        <div className="flex flex-col gap-2">
          <span className="font-medium">{model.displayName}</span>
          <span className="font-mono text-xs text-muted-foreground">{model.modelName}</span>
          <Badge variant={statusVariant(model.isEnabled)}>{model.statusName}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{model.providerDisplayName}</span>
          <span className="text-xs text-muted-foreground">{model.providerName}</span>
          <span className="text-xs text-muted-foreground">{model.region ?? "未设置地域"}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-64">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">合成：{yesNo(model.supportsTts)}</Badge>
            <Badge variant="outline">设计：{yesNo(model.supportsVoiceDesign)}</Badge>
            <Badge variant="outline">复刻：{yesNo(model.supportsVoiceClone)}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {model.capabilityTags.map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 text-sm">
          <span>倍率：{model.priceMultiplier ?? "未配置"}</span>
          {model.pricingRules.slice(0, 3).map((rule) => (
            <span className="text-xs text-muted-foreground" key={rule.id}>
              {rule.operationTypeName} · {rule.model} · {rule.statusName}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          {model.aliases.length > 0 ? (
            model.aliases.map((alias) => (
              <Badge key={alias.id} variant="outline">
                {alias.displayName}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">未绑定用途别名</span>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-80">
        <form action={updateAudioModelAction} className="flex flex-col gap-3" id={formId}>
          <input name="id" type="hidden" value={model.id} />
          <FieldGroup>
            <label className="flex items-center gap-2 text-sm">
              <input name="isEnabled" type="checkbox" defaultChecked={model.isEnabled} />
              启用模型
            </label>
            <Field>
              <FieldLabel htmlFor={`${model.id}-aliasKey`}>用途别名</FieldLabel>
              <Select id={`${model.id}-aliasKey`} name="aliasKey" defaultValue="">
                <option value="">不调整别名</option>
                <option value="tts-default">默认语音合成</option>
                <option value="tts-fast">快速语音合成</option>
                <option value="voice-design-default">默认声音设计</option>
                <option value="voice-clone-default">默认声音复刻</option>
                <option value="audio-preview">音频预览</option>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${model.id}-aliasDisplayName`}>别名显示名</FieldLabel>
              <Input id={`${model.id}-aliasDisplayName`} name="aliasDisplayName" placeholder="留空使用默认名称" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${model.id}-aliasDescription`}>别名说明</FieldLabel>
              <Input id={`${model.id}-aliasDescription`} name="aliasDescription" placeholder="可选说明" />
            </Field>
          </FieldGroup>
          <Button className="w-fit" type="submit">
            保存模型
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}
