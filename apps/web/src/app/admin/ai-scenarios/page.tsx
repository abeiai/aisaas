import { Save } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminAiModelAliases,
  getAdminAiProviders,
  getAdminAiScenarios,
  getAdminAiToolCategories,
  updateAiScenarioAction,
  type AdminAiScenario
} from "@/lib/ai-admin-api";
import type { AiToolCategory } from "@/lib/ai-api";

export const dynamic = "force-dynamic";

export default async function AdminAiScenariosPage() {
  const [scenarios, providers, aliasPayload, categories] = await Promise.all([
    getAdminAiScenarios(),
    getAdminAiProviders(),
    getAdminAiModelAliases(),
    getAdminAiToolCategories()
  ]);
  const models = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      ...model,
      providerName: provider.name
    }))
  );

  return (
    <AdminShell
      active="/admin/ai-scenarios"
      title="AI 场景配置"
      description="配置 Prompt 模板变量、默认模型和 fallback 模型。"
    >
      <div className="grid gap-6">
        {scenarios.map((scenario) => (
          <Card key={scenario.id}>
            <CardHeader>
              <CardTitle>{scenario.name}</CardTitle>
              <CardDescription>{scenario.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScenarioForm
                aliases={aliasPayload.aliases}
                categories={categories}
                scenario={scenario}
                models={models}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

function ScenarioForm({
  scenario,
  models,
  aliases,
  categories
}: {
  scenario: AdminAiScenario;
  models: Array<{ id: string; displayName: string; modelName: string; providerName: string }>;
  aliases: Array<{ aliasKey: string; displayName: string; statusName: string }>;
  categories: AiToolCategory[];
}) {
  return (
    <form action={updateAiScenarioAction} className="grid gap-5 lg:grid-cols-2">
      <input name="id" type="hidden" value={scenario.id} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-name`}>场景名称</FieldLabel>
          <Input id={`${scenario.id}-name`} name="name" defaultValue={scenario.name} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-description`}>场景描述</FieldLabel>
          <Textarea
            id={`${scenario.id}-description`}
            name="description"
            defaultValue={scenario.description ?? ""}
            rows={3}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-cost`}>预估点数</FieldLabel>
          <Input
            id={`${scenario.id}-cost`}
            min="1"
            name="costCredits"
            type="number"
            defaultValue={scenario.costCredits}
            required
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-category`}>场景分类</FieldLabel>
            <Select id={`${scenario.id}-category`} name="toolCategoryId" defaultValue={scenario.toolCategoryId ?? ""}>
              <option value="">不绑定分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-sort`}>排序</FieldLabel>
            <Input
              id={`${scenario.id}-sort`}
              min="0"
              name="sortOrder"
              type="number"
              defaultValue={scenario.sortOrder}
            />
          </Field>
        </div>
      </FieldGroup>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-prompt`}>Prompt 模板</FieldLabel>
          <Textarea
            id={`${scenario.id}-prompt`}
            name="promptTemplate"
            defaultValue={scenario.promptTemplate}
            rows={8}
            required
          />
          <FieldDescription>支持 {"{{topic}}"} 或 {"{input}"} 变量。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-schema`}>输入表单 Schema</FieldLabel>
          <Textarea
            id={`${scenario.id}-schema`}
            name="inputSchema"
            defaultValue={JSON.stringify(scenario.inputSchema ?? { fields: [] }, null, 2)}
            rows={10}
          />
          <FieldDescription>支持 text、textarea、select、number、switch、voice-select、audio-upload、slider、audio-preview、format-select。保存后场景应用可按 schema 渲染表单。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-vars`}>模板变量</FieldLabel>
          <Textarea
            id={`${scenario.id}-vars`}
            name="promptVariables"
            defaultValue={scenario.promptVariables
              .map((item) => `${item.name}|${item.label}|${item.required}|${item.placeholder}`)
              .join("\n")}
            rows={4}
            placeholder="topic|主题|true|请输入主题"
          />
          <FieldDescription>每行格式：变量名|标签|是否必填|占位提示。</FieldDescription>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-default-alias`}>默认模型</FieldLabel>
            <Select id={`${scenario.id}-default-alias`} name="defaultModelAlias" defaultValue={scenario.defaultModelAlias ?? "default-chat"}>
              <option value="">不绑定别名</option>
              {aliases.map((alias) => (
                <option key={alias.aliasKey} value={alias.aliasKey}>
                  {alias.displayName} · {alias.statusName}
                </option>
              ))}
            </Select>
            <FieldDescription>新任务运行时会通过别名解析实际模型。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-fallback-alias`}>Fallback 模型</FieldLabel>
            <Select id={`${scenario.id}-fallback-alias`} name="fallbackModelAlias" defaultValue={scenario.fallbackModelAlias ?? ""}>
              <option value="">不启用 fallback</option>
              {aliases.map((alias) => (
                <option key={alias.aliasKey} value={alias.aliasKey}>
                  {alias.displayName} · {alias.statusName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-capabilities`}>能力要求</FieldLabel>
          <Input
            id={`${scenario.id}-capabilities`}
            name="requiredCapabilities"
            defaultValue={scenario.requiredCapabilities.join(",")}
            placeholder="TEXT,STREAMING"
          />
          <FieldDescription>多个能力用英文逗号分隔，例如 TEXT,VISION。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${scenario.id}-version`}>模板版本</FieldLabel>
          <Input
            id={`${scenario.id}-version`}
            name="templateVersion"
            defaultValue={scenario.templateVersion ?? ""}
            placeholder="例如：2026.05"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-default-model`}>旧默认模型</FieldLabel>
            <Select id={`${scenario.id}-default-model`} name="defaultModelId" defaultValue={scenario.defaultModelId ?? ""}>
              <option value="">不使用旧模型绑定</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} · {model.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${scenario.id}-fallback-model`}>旧 Fallback 模型</FieldLabel>
            <Select id={`${scenario.id}-fallback-model`} name="fallbackModelId" defaultValue={scenario.fallbackModelId ?? ""}>
              <option value="">不启用 fallback</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} · {model.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked={scenario.isEnabled} name="isEnabled" type="checkbox" />
          启用场景
        </label>
        <Button className="w-fit" type="submit">
          <Save data-icon="inline-start" />
          保存场景
        </Button>
      </FieldGroup>
    </form>
  );
}
