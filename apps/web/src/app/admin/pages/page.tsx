import { CalendarClock } from "lucide-react";

import { MarkdownEditor } from "@/components/cms/markdown-editor";
import { AdminShell } from "@/components/shell/admin-shell";
import { AdminTableSection } from "@/components/shell/admin-table-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  archivePageAction,
  createPageAction,
  deletePageAction,
  getAdminPages,
  publishPageAction,
  updatePageAction,
  type CmsPage
} from "@/lib/cms-api";
import { getAdminMediaAssets, type MediaAsset } from "@/lib/media-api";

export const dynamic = "force-dynamic";

function statusLabel(status: CmsPage["status"]) {
  return status === "PUBLISHED" ? "已发布" : status === "ARCHIVED" ? "已归档" : "草稿";
}

function datetimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function PageForm({
  action,
  mediaAssets,
  page,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  mediaAssets: MediaAsset[];
  page?: CmsPage;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      {page ? <input name="id" type="hidden" value={page.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel>页面标题</FieldLabel>
            <Input name="title" defaultValue={page?.title ?? ""} required />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input name="slug" defaultValue={page?.slug ?? ""} placeholder="about" required />
          </Field>
          <Field>
            <FieldLabel>状态</FieldLabel>
            <Select name="status" defaultValue={page?.status ?? "DRAFT"}>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="ARCHIVED">已归档</option>
            </Select>
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>定时发布时间</FieldLabel>
            <Input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={datetimeLocalValue(page?.scheduledAt)}
            />
            <FieldDescription>草稿到达该时间后可由定时发布任务转为已发布。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>索引控制</FieldLabel>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm">
              <input name="noIndex" type="checkbox" defaultChecked={page?.noIndex ?? false} />
              不允许搜索引擎索引
            </label>
          </Field>
        </FieldGroup>
      </div>
      <FieldGroup className="lg:grid lg:grid-cols-2">
        <Field>
          <FieldLabel>SEO 标题</FieldLabel>
          <Input name="seoTitle" defaultValue={page?.seoTitle ?? ""} />
        </Field>
        <Field>
          <FieldLabel>SEO 描述</FieldLabel>
          <Input name="seoDescription" defaultValue={page?.seoDescription ?? ""} />
        </Field>
        <Field>
          <FieldLabel>SEO 关键词</FieldLabel>
          <Input name="seoKeywords" defaultValue={page?.seoKeywords ?? ""} />
        </Field>
        <Field>
          <FieldLabel>Canonical URL</FieldLabel>
          <Input name="canonicalUrl" defaultValue={page?.canonicalUrl ?? ""} placeholder="https://..." />
        </Field>
        <Field>
          <FieldLabel>OG 标题</FieldLabel>
          <Input name="ogTitle" defaultValue={page?.ogTitle ?? ""} />
        </Field>
        <Field>
          <FieldLabel>OG 描述</FieldLabel>
          <Input name="ogDescription" defaultValue={page?.ogDescription ?? ""} />
        </Field>
        <Field className="lg:col-span-2">
          <FieldLabel>OG 图片</FieldLabel>
          <Input name="ogImage" defaultValue={page?.ogImage ?? ""} placeholder="https://..." />
        </Field>
      </FieldGroup>
      <MarkdownEditor name="content" defaultValue={page?.content ?? ""} mediaAssets={mediaAssets} />
      <Button className="w-fit" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}

export default async function AdminPagesPage() {
  const [pages, mediaAssets] = await Promise.all([getAdminPages(), getAdminMediaAssets()]);

  return (
    <AdminShell
      active="/admin/pages"
      title="单页管理"
      description="管理关于我们、服务条款等独立页面，并维护 SEO 与定时发布。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>新增单页</CardTitle>
            <CardDescription>单页支持 Markdown 正文、图片插入、SEO 字段和索引控制。</CardDescription>
          </CardHeader>
          <CardContent>
            <PageForm action={createPageAction} mediaAssets={mediaAssets} submitLabel="新增单页" />
          </CardContent>
        </Card>

        <AdminTableSection
          title="单页列表"
          description="单页数据来自真实 CMS API，前台只允许访问已发布且已到发布时间的单页。"
          addLabel="新增单页"
          headers={["页面标题", "Slug", "状态", "更新时间", "SEO 描述", "操作"]}
        >
          {pages.map((page) => (
            <TableRow key={page.slug}>
              <TableCell className="font-medium">{page.title}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{page.slug}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Badge variant={page.status === "PUBLISHED" ? "secondary" : "muted"}>
                    {statusLabel(page.status)}
                  </Badge>
                  {page.scheduledAt ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock />
                      {new Date(page.scheduledAt).toLocaleString("zh-CN")}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{new Date(page.updatedAt).toLocaleDateString("zh-CN")}</TableCell>
              <TableCell className="max-w-md text-muted-foreground">
                {page.seoDescription ?? "未设置"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <form action={publishPageAction}>
                    <input name="id" type="hidden" value={page.id} />
                    <input name="slug" type="hidden" value={page.slug} />
                    <Button variant="outline" size="sm" type="submit">
                      发布
                    </Button>
                  </form>
                  <form action={archivePageAction}>
                    <input name="id" type="hidden" value={page.id} />
                    <input name="slug" type="hidden" value={page.slug} />
                    <Button variant="outline" size="sm" type="submit">
                      下架
                    </Button>
                  </form>
                  <form action={deletePageAction}>
                    <input name="id" type="hidden" value={page.id} />
                    <Button variant="outline" size="sm" type="submit">
                      删除
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </AdminTableSection>

        <Card>
          <CardHeader>
            <CardTitle>编辑单页</CardTitle>
            <CardDescription>展开单页后可修改正文、发布状态和 SEO 字段。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pages.map((page) => (
              <details className="rounded-lg border border-border bg-background p-4" key={page.id}>
                <summary className="cursor-pointer font-medium">{page.title}</summary>
                <div className="mt-4">
                  <PageForm
                    action={updatePageAction}
                    mediaAssets={mediaAssets}
                    page={page}
                    submitLabel="保存单页"
                  />
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
