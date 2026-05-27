import { BadgeCheck, KeyRound, Power, Tags, TestTube2, type LucideIcon } from "lucide-react";

import { AudioModelManager } from "@/components/audio/audio-model-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AiProviderPreset } from "@/lib/ai-admin-api";
import { testAiProviderPresetAction, updateAiProviderPresetAction } from "@/lib/ai-admin-api";
import type { AdminAudioModel } from "@/lib/audio-admin-api";

export function AudioModelConfigSection({
  models,
  provider
}: {
  models: AdminAudioModel[];
  provider: AiProviderPreset | null;
}) {
  const enabledCount = models.filter((model) => model.isEnabled).length;
  const ttsCount = models.filter((model) => model.supportsTts).length;
  const cloneCount = models.filter((model) => model.supportsVoiceClone).length;

  return (
    <div className="flex flex-col gap-6">
      <AudioProviderCard provider={provider} />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={Power} label="已启用模型" value={`${enabledCount}/${models.length}`} />
        <Metric icon={BadgeCheck} label="支持语音合成" value={ttsCount.toLocaleString("zh-CN")} />
        <Metric icon={Tags} label="支持声音复刻" value={cloneCount.toLocaleString("zh-CN")} />
      </div>

      <AudioModelManager models={models} />
    </div>
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
        <CardTitle>Provider 配置</CardTitle>
        <CardDescription>这里保存语音供应商默认 API Key 和默认端点；具体语音模型可在下方列表覆盖 Base URL、地域和独立 API Key。</CardDescription>
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
              <FieldLabel htmlFor="audio-provider-base-url">默认 Base URL</FieldLabel>
              <Input id="audio-provider-base-url" name="baseUrl" defaultValue={instance?.baseUrl ?? provider.defaultBaseUrl} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-websocket-url">默认 WebSocket URL</FieldLabel>
              <Input id="audio-provider-websocket-url" name="webSocketUrl" defaultValue={instance?.webSocketUrl ?? provider.defaultWebSocketUrl ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="audio-provider-region">默认地域</FieldLabel>
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
              启用 Provider
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
