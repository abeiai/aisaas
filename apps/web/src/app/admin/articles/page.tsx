import Link from "next/link";
import { CalendarClock, Eye, Image, Play } from "lucide-react";

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
  archiveArticleAction,
  createArticleAction,
  deleteArticleAction,
  getAdminArticles,
  getAdminCategories,
  getAdminTags,
  publishArticleAction,
  publishDueContentAction,
  updateArticleAction,
  type CmsArticle,
  type CmsCategory,
  type CmsTag
} from "@/lib/cms-api";
import { getAdminMediaAssets, type MediaAsset } from "@/lib/media-api";

export const dynamic = "force-dynamic";

function statusLabel(status: CmsArticle["status"]) {
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

function articleCoverUrl(article?: CmsArticle) {
  return article?.coverMedia?.url ?? article?.coverImage ?? "";
}

function articleTagSlugs(article?: CmsArticle) {
  return article?.tags?.map((tag) => tag.slug) ?? [];
}

async function publishDueFormAction() {
  "use server";

  await publishDueContentAction();
}

function ArticleForm({
  action,
  categories,
  mediaAssets,
  tags,
  article,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  categories: CmsCategory[];
  mediaAssets: MediaAsset[];
  tags: CmsTag[];
  article?: CmsArticle;
  submitLabel: string;
}) {
  const coverUrl = articleCoverUrl(article);

  return (
    <form action={action} className="flex flex-col gap-5">
      {article ? <input name="id" type="hidden" value={article.id} /> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel>文章标题</FieldLabel>
            <Input name="title" defaultValue={article?.title ?? ""} required />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input name="slug" defaultValue={article?.slug ?? ""} placeholder="article-slug" required />
          </Field>
          <Field>
            <FieldLabel>分类</FieldLabel>
            <Select name="categoryId" defaultValue={article?.categoryId ?? categories[0]?.id} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>标签</FieldLabel>
            <Select
              className="min-h-28"
              name="tagSlugs"
              multiple
              defaultValue={articleTagSlugs(article)}
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </Select>
            <FieldDescription>按住系统多选键可选择多个标签。</FieldDescription>
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>状态</FieldLabel>
            <Select name="status" defaultValue={article?.status ?? "DRAFT"}>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="ARCHIVED">已归档</option>
            </Select>
          </Field>
          <Field>
            <FieldLabel>定时发布时间</FieldLabel>
            <Input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={datetimeLocalValue(article?.scheduledAt)}
            />
            <FieldDescription>草稿到达该时间后可由定时发布任务转为已发布。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>封面媒体</FieldLabel>
            <Select name="coverMediaId" defaultValue={article?.coverMediaId ?? ""}>
              <option value="">不选择媒体资源</option>
              {mediaAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalName}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>封面图片 URL</FieldLabel>
            <Input name="coverImage" defaultValue={article?.coverImage ?? ""} placeholder="https://..." />
            <FieldDescription>未选择媒体资源时可使用外部图片地址。</FieldDescription>
          </Field>
          <div className="aspect-[16/9] overflow-hidden rounded-lg border border-border bg-card">
            {coverUrl ? (
              <img className="size-full object-cover" src={coverUrl} alt={article?.title ?? "文章封面"} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Image />
                未设置封面
              </div>
            )}
          </div>
        </FieldGroup>
      </div>

      <Field>
        <FieldLabel>摘要</FieldLabel>
        <Input name="summary" defaultValue={article?.summary ?? ""} />
      </Field>

      <FieldGroup className="lg:grid lg:grid-cols-2">
        <Field>
          <FieldLabel>SEO 标题</FieldLabel>
          <Input name="seoTitle" defaultValue={article?.seoTitle ?? ""} />
        </Field>
        <Field>
          <FieldLabel>SEO 描述</FieldLabel>
          <Input name="seoDescription" defaultValue={article?.seoDescription ?? ""} />
        </Field>
        <Field>
          <FieldLabel>SEO 关键词</FieldLabel>
          <Input name="seoKeywords" defaultValue={article?.seoKeywords ?? ""} />
        </Field>
        <Field>
          <FieldLabel>Canonical URL</FieldLabel>
          <Input name="canonicalUrl" defaultValue={article?.canonicalUrl ?? ""} placeholder="https://..." />
        </Field>
        <Field>
          <FieldLabel>OG 标题</FieldLabel>
          <Input name="ogTitle" defaultValue={article?.ogTitle ?? ""} />
        </Field>
        <Field>
          <FieldLabel>OG 描述</FieldLabel>
          <Input name="ogDescription" defaultValue={article?.ogDescription ?? ""} />
        </Field>
        <Field>
          <FieldLabel>OG 图片</FieldLabel>
          <Input name="ogImage" defaultValue={article?.ogImage ?? ""} placeholder="https://..." />
        </Field>
        <Field>
          <FieldLabel>索引控制</FieldLabel>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm">
            <input name="noIndex" type="checkbox" defaultChecked={article?.noIndex ?? false} />
            不允许搜索引擎索引
          </label>
        </Field>
      </FieldGroup>

      <MarkdownEditor name="content" defaultValue={article?.content ?? ""} mediaAssets={mediaAssets} />

      <Button className="w-fit" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}

export default async function AdminArticlesPage() {
  const [articles, categories, mediaAssets, tags] = await Promise.all([
    getAdminArticles(),
    getAdminCategories(),
    getAdminMediaAssets(),
    getAdminTags()
  ]);

  return (
    <AdminShell
      active="/admin/articles"
      title="文章管理"
      description="管理文章封面、标签、Markdown 正文、SEO 字段和定时发布。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle>新增文章</CardTitle>
              <CardDescription>支持 Markdown 编辑、媒体图片插入、标签和 SEO 基础字段。</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/media">
                <Image data-icon="inline-start" />
                上传媒体
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <ArticleForm
                action={createArticleAction}
                categories={categories}
                mediaAssets={mediaAssets}
                tags={tags}
                submitLabel="新增文章"
              />
            ) : (
              <p className="text-sm text-muted-foreground">请先创建文章分类。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle>定时发布</CardTitle>
              <CardDescription>手动执行一次到期内容发布，便于本地和生产 Cron 调用同一接口。</CardDescription>
            </div>
            <form action={publishDueFormAction}>
              <Button variant="outline" type="submit">
                <Play data-icon="inline-start" />
                执行发布
              </Button>
            </form>
          </CardHeader>
        </Card>

        <AdminTableSection
          title="文章列表"
          description="前台只展示已发布且已到发布时间的文章。"
          addLabel="新增文章"
          headers={["标题", "分类", "标签", "状态", "发布时间", "操作"]}
        >
          {articles.map((article) => (
            <TableRow key={article.id}>
              <TableCell className="max-w-sm">
                <div className="flex items-center gap-3">
                  <div className="size-16 overflow-hidden rounded-lg border border-border bg-card">
                    {articleCoverUrl(article) ? (
                      <img
                        className="size-full object-cover"
                        src={articleCoverUrl(article)}
                        alt={article.title}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Image />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{article.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{article.slug}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{article.category?.name ?? "未分类"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {article.tags && article.tags.length > 0 ? (
                    article.tags.map((tag) => (
                      <Badge variant="outline" key={tag.id}>
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Badge variant={article.status === "PUBLISHED" ? "secondary" : "muted"}>
                    {statusLabel(article.status)}
                  </Badge>
                  {article.scheduledAt ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock />
                      {new Date(article.scheduledAt).toLocaleString("zh-CN")}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString("zh-CN")
                  : "未发布"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/articles/${article.id}/preview`}>
                      <Eye data-icon="inline-start" />
                      预览
                    </Link>
                  </Button>
                  <form action={publishArticleAction}>
                    <input name="id" type="hidden" value={article.id} />
                    <input name="slug" type="hidden" value={article.slug} />
                    <Button variant="outline" size="sm" type="submit">
                      发布
                    </Button>
                  </form>
                  <form action={archiveArticleAction}>
                    <input name="id" type="hidden" value={article.id} />
                    <input name="slug" type="hidden" value={article.slug} />
                    <Button variant="outline" size="sm" type="submit">
                      下架
                    </Button>
                  </form>
                  <form action={deleteArticleAction}>
                    <input name="id" type="hidden" value={article.id} />
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
            <CardTitle>编辑文章</CardTitle>
            <CardDescription>展开文章后可修改封面、标签、SEO 字段、定时发布和正文。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {articles.map((article) => (
              <details className="rounded-lg border border-border bg-background p-4" key={article.id}>
                <summary className="cursor-pointer font-medium">{article.title}</summary>
                <div className="mt-4">
                  <ArticleForm
                    action={updateArticleAction}
                    article={article}
                    categories={categories}
                    mediaAssets={mediaAssets}
                    tags={tags}
                    submitLabel="保存文章"
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
