import { ImageUp } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminMediaAssets, uploadMediaAction } from "@/lib/media-api";

export const dynamic = "force-dynamic";

function storageLabel(value: string) {
  return value === "S3" ? "对象存储" : "本地存储";
}

function formatSize(value: number) {
  if (value > 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(value / 1024)).toLocaleString("zh-CN")} KB`;
}

export default async function AdminMediaPage() {
  const assets = await getAdminMediaAssets();

  return (
    <AdminShell
      active="/admin/media"
      title="媒体资源"
      description="上传图片、查看可访问 URL，并为文章封面和 Markdown 正文插图使用。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>上传图片</CardTitle>
            <CardDescription>仅管理员可上传，支持 JPG、PNG、WebP、GIF，默认最大 2MB。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadMediaAction} className="flex flex-col gap-4 md:flex-row md:items-end">
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="file">选择图片</FieldLabel>
                  <Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
                </Field>
              </FieldGroup>
              <Button type="submit">
                <ImageUp data-icon="inline-start" />
                上传媒体
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>媒体列表</CardTitle>
            <CardDescription>复制 URL 可用于文章封面、OG 图片或 Markdown 插图。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>预览</TableHead>
                    <TableHead>文件</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>存储</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>上传时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.length > 0 ? (
                    assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="size-16 overflow-hidden rounded-lg border border-border bg-secondary">
                            <img className="size-full object-cover" src={asset.url} alt={asset.originalName} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{asset.originalName}</span>
                            <span className="font-mono text-xs text-muted-foreground">{asset.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>{asset.mimeType}</TableCell>
                        <TableCell>{formatSize(asset.size)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{storageLabel(asset.storageProvider)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-sm break-all font-mono text-xs text-muted-foreground">
                          {asset.url}
                        </TableCell>
                        <TableCell>{new Date(asset.createdAt).toLocaleString("zh-CN", { hour12: false })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={7}>
                        暂无媒体资源。
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
