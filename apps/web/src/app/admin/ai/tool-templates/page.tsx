import { Download } from "lucide-react";

import { AiToolTemplateImportForm } from "@/components/admin/ai-tool-template-import-form";
import { AdminShell } from "@/components/shell/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { exportAdminAiToolTemplates } from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiToolTemplatesPage() {
  const exported = await exportAdminAiToolTemplates();
  const exportText = JSON.stringify(exported, null, 2);

  return (
    <AdminShell
      active="/admin/ai/tool-templates"
      title="AI 工具模板"
      description="导出、预览和导入工具模板 JSON。导入不会覆盖同 slug 工具。"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>导出模板</CardTitle>
            <CardDescription>可用于迁移工具配置，不包含 API Key、任务记录或用户数据。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea readOnly value={exportText} rows={22} />
            <Button asChild variant="outline">
              <a
                download="ai-tool-templates.json"
                href={`data:application/json;charset=utf-8,${encodeURIComponent(exportText)}`}
              >
                <Download data-icon="inline-start" />
                下载 JSON
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导入模板</CardTitle>
            <CardDescription>先预览冲突，再执行导入；默认跳过已存在 slug。</CardDescription>
          </CardHeader>
          <CardContent>
            <AiToolTemplateImportForm />
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
