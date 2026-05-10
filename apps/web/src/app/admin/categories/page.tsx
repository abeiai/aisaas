import { AdminShell } from "@/components/shell/admin-shell";
import { AdminTableSection } from "@/components/shell/admin-table-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  createCategoryAction,
  deleteCategoryAction,
  getAdminCategories,
  updateCategoryAction
} from "@/lib/cms-api";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <AdminShell
      active="/admin/categories"
      title="文章分类管理"
      description="管理文章分类名称、slug、状态和文章数量。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>新增分类</CardTitle>
            <CardDescription>slug 只能包含小写字母、数字和短横线。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCategoryAction} className="grid gap-5 md:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="category-name">分类名称</FieldLabel>
                  <Input id="category-name" name="name" placeholder="例如：产品设计" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
                  <Input id="category-slug" name="slug" placeholder="product-design" required />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="category-description">分类描述</FieldLabel>
                  <Input id="category-description" name="description" placeholder="用于后台识别分类用途" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category-sort">排序值</FieldLabel>
                  <Input id="category-sort" name="sortOrder" defaultValue="0" type="number" />
                  <FieldDescription>
                    <label className="inline-flex items-center gap-2">
                      <input defaultChecked name="isVisible" type="checkbox" />
                      前台可见
                    </label>
                  </FieldDescription>
                </Field>
                <Button className="w-fit" type="submit">新增分类</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <AdminTableSection
          title="分类列表"
          description="分类数据来自真实 CMS API。"
          addLabel="新增分类"
          headers={["分类名称", "Slug", "文章数", "状态", "排序", "更新时间", "操作"]}
        >
          {categories.map((category) => (
            <TableRow key={category.slug}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{category.slug}</TableCell>
              <TableCell>{category._count?.articles ?? 0}</TableCell>
              <TableCell>
                <Badge variant={category.isVisible ? "secondary" : "muted"}>
                  {category.isVisible ? "显示" : "隐藏"}
                </Badge>
              </TableCell>
              <TableCell>{category.sortOrder}</TableCell>
              <TableCell>{new Date(category.updatedAt).toLocaleDateString("zh-CN")}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <form action={deleteCategoryAction}>
                    <input name="id" type="hidden" value={category.id} />
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
            <CardTitle>编辑分类</CardTitle>
            <CardDescription>展开某个分类后可修改名称、slug、显示状态和排序值。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {categories.map((category) => (
              <details className="rounded-xl border border-border bg-background p-4" key={category.id}>
                <summary className="cursor-pointer font-medium">{category.name}</summary>
                <form action={updateCategoryAction} className="mt-4 grid gap-5 md:grid-cols-2">
                  <input name="id" type="hidden" value={category.id} />
                  <FieldGroup>
                    <Field>
                      <FieldLabel>分类名称</FieldLabel>
                      <Input name="name" defaultValue={category.name} required />
                    </Field>
                    <Field>
                      <FieldLabel>Slug</FieldLabel>
                      <Input name="slug" defaultValue={category.slug} required />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>分类描述</FieldLabel>
                      <Input name="description" defaultValue={category.description ?? ""} />
                    </Field>
                    <Field>
                      <FieldLabel>排序值</FieldLabel>
                      <Input name="sortOrder" defaultValue={category.sortOrder} type="number" />
                      <FieldDescription>
                        <label className="inline-flex items-center gap-2">
                          <input defaultChecked={category.isVisible} name="isVisible" type="checkbox" />
                          前台可见
                        </label>
                      </FieldDescription>
                    </Field>
                    <Button className="w-fit" type="submit">保存分类</Button>
                  </FieldGroup>
                </form>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
