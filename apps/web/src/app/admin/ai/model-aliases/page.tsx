import { Link2 } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { getAdminAiModelAliases, updateAiModelAliasAction } from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiModelAliasesPage() {
  const payload = await getAdminAiModelAliases();

  return (
    <AdminShell
      active="/admin/ai/model-aliases"
      title="AI 模型别名"
      description="把业务别名绑定到已启用模型，AI 场景只读取别名而不直接读取模型名。"
    >
      <div className="grid gap-5">
        {payload.aliases.map((alias) => (
          <Card key={alias.aliasKey}>
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle>{alias.displayName}</CardTitle>
                <CardDescription>{alias.description}</CardDescription>
              </div>
              <Badge variant={alias.modelInstance ? "secondary" : "muted"}>{alias.statusName}</Badge>
            </CardHeader>
            <CardContent>
              <form action={updateAiModelAliasAction} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <input name="aliasKey" type="hidden" value={alias.aliasKey} />
                <Field>
                  <FieldLabel htmlFor={`${alias.aliasKey}-model`}>{alias.aliasKey}</FieldLabel>
                  <select
                    className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                    id={`${alias.aliasKey}-model`}
                    name="modelInstanceId"
                    defaultValue={alias.modelInstanceId ?? ""}
                  >
                    <option value="">未配置</option>
                    {payload.modelInstances.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.providerPresetName} / {model.displayName} / {model.providerModelName}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>
                    {alias.modelInstance
                      ? `${alias.modelInstance.providerPresetName} · ${alias.modelInstance.providerModelName}`
                      : "当前未配置默认聊天模型时，相关 AI 场景会返回中文提示。"}
                  </FieldDescription>
                </Field>
                <Button type="submit">
                  <Link2 data-icon="inline-start" />
                  保存绑定
                </Button>
              </form>
              {alias.modelInstance ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {alias.modelInstance.capabilityTags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
