import { Save } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAiToolCategoryAction,
  getAdminAiToolCategories,
  updateAiToolCategoryAction
} from "@/lib/ai-admin-api";
import type { AiToolCategory } from "@/lib/ai-api";

export const dynamic = "force-dynamic";

export default async function AdminAiToolCategoriesPage() {
  const categories = await getAdminAiToolCategories();

  return (
    <AdminShell
      active="/admin/ai/tool-categories"
      title="AI 工具分类"
      description="管理前台工具市场的分类、可见性和排序。"
    >
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>新增分类</CardTitle>
            <CardDescription>slug 只能使用小写字母、数字和短横线。</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryForm action={createAiToolCategoryAction} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>{category.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryForm action={updateAiToolCategoryAction} category={category} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function CategoryForm({
  category,
  action
}: {
  category?: AiToolCategory;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${category?.id ?? "new"}-name`}>分类名称</FieldLabel>
          <Input
            id={`${category?.id ?? "new"}-name`}
            name="name"
            defaultValue={category?.name ?? ""}
            placeholder="例如：写作"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${category?.id ?? "new"}-slug`}>slug</FieldLabel>
          <Input
            id={`${category?.id ?? "new"}-slug`}
            name="slug"
            defaultValue={category?.slug ?? ""}
            placeholder="writing"
            required
          />
        </Field>
      </FieldGroup>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${category?.id ?? "new"}-description`}>说明</FieldLabel>
          <Textarea
            id={`${category?.id ?? "new"}-description`}
            name="description"
            defaultValue={category?.description ?? ""}
            rows={3}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${category?.id ?? "new"}-sort`}>排序</FieldLabel>
            <Input
              id={`${category?.id ?? "new"}-sort`}
              min="0"
              name="sortOrder"
              type="number"
              defaultValue={category?.sortOrder ?? 0}
            />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input defaultChecked={category?.isVisible ?? true} name="isVisible" type="checkbox" />
            前台可见
          </label>
        </div>
        <FieldDescription>隐藏分类后，前台工具市场不会展示该分类下的工具。</FieldDescription>
        <Button className="w-fit" type="submit">
          <Save data-icon="inline-start" />
          保存分类
        </Button>
      </FieldGroup>
    </form>
  );
}
