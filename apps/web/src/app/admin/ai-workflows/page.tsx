import { Save } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminAiWorkflows, saveWorkflowAction } from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiWorkflowsPage() {
  const workflows = await getAdminAiWorkflows();

  return (
    <AdminShell
      active="/admin/ai-workflows"
      title="AI 工作流"
      description="配置输入、生成、改写、总结等多步骤 Prompt。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>保存工作流</CardTitle>
            <CardDescription>相同 slug 会覆盖旧步骤，第一版固定最多 3 步。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveWorkflowAction} className="grid gap-5 lg:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">名称</FieldLabel>
                  <Input id="name" name="name" defaultValue="内容三步工作流" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input id="slug" name="slug" defaultValue="content-three-step" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">描述</FieldLabel>
                  <Textarea id="description" name="description" rows={3} defaultValue="输入后依次生成、改写和总结。" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="costCredits">点数规则</FieldLabel>
                  <Input id="costCredits" name="costCredits" type="number" min="0" defaultValue="0" />
                  <FieldDescription>当前 MVP 工作流默认 0 点，仅用于验证编排记录。</FieldDescription>
                </Field>
              </FieldGroup>
              <FieldGroup>
                {[0, 1, 2].map((index) => (
                  <div className="grid gap-3 rounded-md border border-border p-4" key={index}>
                    <Field>
                      <FieldLabel htmlFor={`stepName${index}`}>第 {index + 1} 步名称</FieldLabel>
                      <Input
                        id={`stepName${index}`}
                        name={`stepName${index}`}
                        defaultValue={["生成初稿", "改写优化", "总结要点"][index]}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`stepPrompt${index}`}>第 {index + 1} 步 Prompt</FieldLabel>
                      <Textarea
                        id={`stepPrompt${index}`}
                        name={`stepPrompt${index}`}
                        defaultValue={["根据输入生成初稿", "保持事实不变并优化表达", "总结为三条要点"][index]}
                        rows={2}
                        required
                      />
                    </Field>
                  </div>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input defaultChecked name="isEnabled" type="checkbox" />
                  启用工作流
                </label>
                <Button className="w-fit" type="submit">
                  <Save data-icon="inline-start" />
                  保存工作流
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{workflow.name}</CardTitle>
                  <Badge variant={workflow.isEnabled ? "secondary" : "outline"}>
                    {workflow.isEnabled ? "已启用" : "已停用"}
                  </Badge>
                </div>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                {workflow.steps.map((step) => (
                  <p key={step.id}>
                    {step.sortOrder + 1}. {step.name}：{step.prompt}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
