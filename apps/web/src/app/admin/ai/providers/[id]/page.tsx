import Link from "next/link";
import { ArrowLeft, KeyRound, TestTube2 } from "lucide-react";

import { ProviderModelManager } from "@/components/ai/provider-model-manager";
import { AudioModelConfigSection } from "@/components/audio/audio-model-config-section";
import { AdminShell } from "@/components/shell/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  getAdminAiProviderPreset,
  testAiProviderPresetAction,
  updateAiProviderPresetAction
} from "@/lib/ai-admin-api";
import { getAdminAudioModels } from "@/lib/audio-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiProviderPresetDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getAdminAiProviderPreset(id);
  const instance = provider.instance;
  const isAudioProvider = provider.adapterType === "DASHSCOPE_AUDIO" || provider.modality === "AUDIO";

  if (isAudioProvider) {
    const models = await getAdminAudioModels();

    return (
      <AdminShell
        active="/admin/ai/providers"
        title={provider.displayName}
        description="管理语音 Provider、语音模型启停、能力标签、定价和用途绑定。"
      >
        <div className="flex flex-col gap-6">
          <Button asChild className="w-fit" variant="outline">
            <Link href="/admin/ai/providers">
              <ArrowLeft data-icon="inline-start" />
              返回 Provider 列表
            </Link>
          </Button>

          <AudioModelConfigSection models={models} provider={provider} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="/admin/ai/providers"
      title={provider.displayName}
      description="填写 API Key、修改 Base URL、测试连接并启用需要的模型。"
    >
      <div className="flex flex-col gap-6">
        <Button asChild className="w-fit" variant="outline">
          <Link href="/admin/ai/providers">
            <ArrowLeft data-icon="inline-start" />
            返回 Provider 列表
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Provider 配置</CardTitle>
            <CardDescription>这里保存供应商级默认 API Key 和默认端点；具体模型可以在下方列表中覆盖 Base URL、地域和独立 API Key。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAiProviderPresetAction} className="grid gap-5 lg:grid-cols-2">
              <input name="id" type="hidden" value={provider.id} />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Provider 名称</FieldLabel>
                  <Input id="name" name="name" defaultValue={instance?.name ?? provider.displayName} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="baseUrl">默认 Base URL</FieldLabel>
                  <Input id="baseUrl" name="baseUrl" defaultValue={instance?.baseUrl ?? provider.defaultBaseUrl} required />
                  <FieldDescription>模型未单独配置 Base URL 时使用此默认值。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="webSocketUrl">默认 WebSocket URL</FieldLabel>
                  <Input id="webSocketUrl" name="webSocketUrl" defaultValue={instance?.webSocketUrl ?? provider.defaultWebSocketUrl ?? ""} />
                  <FieldDescription>仅语音流式合成需要配置，其他 Provider 可留空。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="region">默认地域</FieldLabel>
                  <Input id="region" name="region" defaultValue={instance?.region ?? provider.region?.split(",")[0] ?? ""} />
                  <FieldDescription>阿里云语音支持 cn-beijing 或 intl-singapore。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="apiKey">API Key</FieldLabel>
                  <Input id="apiKey" name="apiKey" placeholder={instance?.hasApiKey ? "留空表示不更新密钥" : "请输入 API Key"} type="password" />
                  <FieldDescription>{instance?.apiKeyPreview ?? "尚未配置 API Key"}</FieldDescription>
                </Field>
              </FieldGroup>
              <FieldGroup>
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Adapter" value={provider.adapterType} />
                  <Info label="模态" value={provider.modality} />
                  <Info label="环境变量名" value={provider.apiKeyEnvName} />
                  <Info label="连接状态" value={instance?.statusName ?? "未启用"} />
                  <Info label="测试结果" value={instance?.lastTestResult?.message ?? "尚未测试"} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input defaultChecked={instance?.status === "ENABLED"} name="isEnabled" type="checkbox" />
                  启用 Provider
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    <KeyRound data-icon="inline-start" />
                    保存配置
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

        <ProviderModelManager provider={provider} />
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
