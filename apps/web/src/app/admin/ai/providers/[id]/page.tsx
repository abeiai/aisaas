import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, TestTube2 } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  enableAiModelPresetAction,
  getAdminAiProviderPreset,
  testAiProviderPresetAction,
  updateAiModelInstanceAction,
  updateAiProviderPresetAction
} from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiProviderPresetDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getAdminAiProviderPreset(id);
  const instance = provider.instance;

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
            <CardDescription>API Key 会加密存储，后台不会显示完整密钥。</CardDescription>
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
                  <FieldLabel htmlFor="baseUrl">Base URL</FieldLabel>
                  <Input id="baseUrl" name="baseUrl" defaultValue={instance?.baseUrl ?? provider.defaultBaseUrl} required />
                  <FieldDescription>自定义 OpenAI-compatible 可以改成你的服务地址。</FieldDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>可用模型</CardTitle>
            <CardDescription>启用模型后可在模型别名页绑定到 default-chat、reasoning 等业务别名。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {provider.modelPresets.map((modelPreset) => {
              const modelInstance = instance?.modelInstances.find((item) => item.modelPresetId === modelPreset.id);

              return (
                <div className="rounded-md border border-border bg-background p-4" key={modelPreset.id}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{modelPreset.displayName}</p>
                        {modelPreset.recommendedAlias ? <Badge variant="outline">{modelPreset.recommendedAlias}</Badge> : null}
                        {modelPreset.isDeprecated ? <Badge variant="muted">可能已过期</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{modelPreset.providerModelName}</p>
                    </div>
                    <Badge variant={modelInstance?.isEnabled ? "secondary" : "muted"}>
                      {modelInstance?.isEnabled ? "已启用" : "未启用"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {modelPreset.capabilityTags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  {modelPreset.deprecatedMessage ? (
                    <p className="mt-3 text-sm text-muted-foreground">该模型可能已过期，建议切换到推荐模型：{modelPreset.deprecatedMessage}</p>
                  ) : null}
                  <form action={modelInstance ? updateAiModelInstanceAction : enableAiModelPresetAction} className="mt-4 grid gap-4 lg:grid-cols-3">
                    <input name="providerId" type="hidden" value={provider.id} />
                    <input name="modelPresetId" type="hidden" value={modelPreset.id} />
                    <input name="id" type="hidden" value={modelInstance?.id ?? ""} />
                    <Field>
                      <FieldLabel htmlFor={`${modelPreset.id}-display`}>展示名</FieldLabel>
                      <Input id={`${modelPreset.id}-display`} name="displayName" defaultValue={modelInstance?.displayName ?? modelPreset.displayName} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${modelPreset.id}-provider-model-name`}>Provider 模型名</FieldLabel>
                      <Input id={`${modelPreset.id}-provider-model-name`} name="providerModelName" defaultValue={modelInstance?.providerModelName ?? modelPreset.providerModelName} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${modelPreset.id}-tags`}>能力标签</FieldLabel>
                      <Input id={`${modelPreset.id}-tags`} name="capabilityTags" defaultValue={(modelInstance?.capabilityTags ?? modelPreset.capabilityTags).join(",")} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${modelPreset.id}-input-price`}>输入价格</FieldLabel>
                      <Input id={`${modelPreset.id}-input-price`} min="0" name="inputPrice" step="0.0001" type="number" defaultValue={modelInstance?.inputPrice ?? "1"} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${modelPreset.id}-output-price`}>输出价格</FieldLabel>
                      <Input id={`${modelPreset.id}-output-price`} min="0" name="outputPrice" step="0.0001" type="number" defaultValue={modelInstance?.outputPrice ?? "4"} />
                    </Field>
                    <div className="flex flex-wrap items-end gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input defaultChecked={modelInstance?.isEnabled ?? false} name="isEnabled" type="checkbox" />
                        启用模型
                      </label>
                      <Button type="submit">
                        <CheckCircle2 data-icon="inline-start" />
                        {modelInstance ? "更新模型" : "启用模型"}
                      </Button>
                    </div>
                  </form>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
