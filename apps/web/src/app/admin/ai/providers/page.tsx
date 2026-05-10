import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAiProviderPresets } from "@/lib/ai-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminAiProviderPresetsPage() {
  const providers = await getAdminAiProviderPresets();

  return (
    <AdminShell
      active="/admin/ai/providers"
      title="AI Provider 快速配置"
      description="查看内置 Provider，填写 API Key，启用模型并完成连接测试。"
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle>{provider.displayName}</CardTitle>
                <CardDescription>{provider.defaultBaseUrl}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{provider.adapterType}</Badge>
                <Badge variant={provider.instance?.status === "ENABLED" ? "secondary" : "muted"}>
                  {provider.instance?.statusName ?? "未启用"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <Info label="Preset 版本" value={provider.presetVersion} />
                <Info label="区域" value={provider.region ?? "未标注"} />
                <Info label="API Key" value={provider.instance?.apiKeyPreview ?? "尚未配置 API Key"} icon={<KeyRound />} />
              </div>
              <div className="flex flex-wrap gap-2">
                {provider.modelPresets.slice(0, 4).map((model) => (
                  <Badge key={model.id} variant="outline">
                    <Sparkles data-icon="inline-start" />
                    {model.displayName}
                  </Badge>
                ))}
              </div>
              <Button asChild className="w-fit">
                <Link href={`/admin/ai/providers/${provider.id}`}>
                  配置 Provider
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-medium">
        {icon}
        {value}
      </p>
    </div>
  );
}
