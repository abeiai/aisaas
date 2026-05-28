import { AdminShell } from "@/components/shell/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSystemConfigs, updateSystemConfigAction } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSystemConfigs();
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  return (
    <AdminShell
      active="/admin/settings"
      title="系统设置"
      description="管理站点、首页、SEO、备案、客服、点数和媒体上传配置。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>运营配置</CardTitle>
            <CardDescription>配置会保存到数据库，公开项可被前台首页读取，后台项只在管理端使用。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSystemConfigAction} className="grid gap-6 xl:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="site-name">站点名称</FieldLabel>
                  <Input
                    id="site-name"
                    name="siteName"
                    defaultValue={configByKey.get("siteName") ?? "AI SaaS"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-logo">站点 Logo</FieldLabel>
                  <Input
                    id="site-logo"
                    name="siteLogo"
                    defaultValue={configByKey.get("siteLogo") ?? ""}
                    placeholder="https://example.com/logo.png"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="theme-primary-color">主题主色</FieldLabel>
                  <Input
                    id="theme-primary-color"
                    name="themePrimaryColor"
                    type="color"
                    defaultValue={configByKey.get("themePrimaryColor") ?? "#292524"}
                    required
                  />
                  <FieldDescription>前台按钮、链接和强调元素使用的主色。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-url">前台地址</FieldLabel>
                  <Input
                    id="site-url"
                    name="siteUrl"
                    defaultValue={configByKey.get("siteUrl") ?? "http://localhost:7341"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-description">站点描述</FieldLabel>
                  <Textarea
                    id="site-description"
                    name="siteDescription"
                    defaultValue={
                      configByKey.get("siteDescription") ??
                      "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。"
                    }
                    required
                  />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="seo-title">SEO 标题</FieldLabel>
                  <Input
                    id="seo-title"
                    name="seoTitle"
                    defaultValue={configByKey.get("seoTitle") ?? "AI SaaS - 简体中文内容型工具站底座"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="seo-description">SEO 描述</FieldLabel>
                  <Textarea
                    id="seo-description"
                    name="seoDescription"
                    defaultValue={
                      configByKey.get("seoDescription") ??
                      "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。"
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="beian-no">备案号</FieldLabel>
                  <Input
                    id="beian-no"
                    name="beianNo"
                    defaultValue={configByKey.get("beianNo") ?? "待备案"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-qr-code">客服二维码</FieldLabel>
                  <Input
                    id="service-qr-code"
                    name="serviceQrCode"
                    defaultValue={configByKey.get("serviceQrCode") ?? ""}
                    placeholder="https://example.com/qrcode.png"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="default-credit-exchange-rate">默认点数兑换比例</FieldLabel>
                  <Input
                    id="default-credit-exchange-rate"
                    name="defaultCreditExchangeRate"
                    defaultValue={configByKey.get("defaultCreditExchangeRate") ?? "1 元 = 100 点"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="api-base-url">API 地址</FieldLabel>
                  <Input
                    id="api-base-url"
                    name="apiBaseUrl"
                    defaultValue={configByKey.get("apiBaseUrl") ?? "http://localhost:7342/api"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="registration-status">注册入口</FieldLabel>
                  <Input
                    id="registration-status"
                    name="registrationStatus"
                    defaultValue={configByKey.get("registrationStatus") ?? "开放"}
                    required
                  />
                </Field>
                <FieldGroup className="rounded-lg border border-border bg-background p-4">
                  <Field>
                    <FieldLabel htmlFor="media-image-max-size-mb">图片上传大小</FieldLabel>
                    <Input
                      id="media-image-max-size-mb"
                      name="mediaImageMaxSizeMb"
                      type="number"
                      min="1"
                      max="200"
                      defaultValue={configByKey.get("mediaImageMaxSizeMb") ?? "10"}
                      required
                    />
                    <FieldDescription>单位 MB，默认 10MB。</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="media-audio-max-size-mb">音频上传大小</FieldLabel>
                    <Input
                      id="media-audio-max-size-mb"
                      name="mediaAudioMaxSizeMb"
                      type="number"
                      min="1"
                      max="200"
                      defaultValue={configByKey.get("mediaAudioMaxSizeMb") ?? "20"}
                      required
                    />
                    <FieldDescription>单位 MB，默认 20MB。</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="media-video-max-size-mb">视频上传大小</FieldLabel>
                    <Input
                      id="media-video-max-size-mb"
                      name="mediaVideoMaxSizeMb"
                      type="number"
                      min="1"
                      max="200"
                      defaultValue={configByKey.get("mediaVideoMaxSizeMb") ?? "200"}
                      required
                    />
                    <FieldDescription>单位 MB，默认 200MB。</FieldDescription>
                  </Field>
                </FieldGroup>
                <Button className="w-fit" type="submit">保存配置</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
