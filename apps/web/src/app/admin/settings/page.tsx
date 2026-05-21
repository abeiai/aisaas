import { AdminShell } from "@/components/shell/admin-shell";
import { AdminTableSection } from "@/components/shell/admin-table-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSystemConfigs, updateSystemConfigAction } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

const aiConfigKeys = new Set([
  "defaultAiModel",
  "aiSaveFullContent",
  "audioVoiceCloneReviewRequired",
  "audioVoiceDesignReviewRequired",
  "audioUserPublicVoiceEnabled",
  "audioCloneDefaultVisibility",
  "audioDesignDefaultVisibility",
  "audioSafetyNotice",
  "audioCloneConsentText",
  "audioDownloadNotice"
]);
const paymentConfigKeys = new Set([
  "paymentAlipayEnabled",
  "paymentAlipayAppId",
  "paymentAlipayEnvironment",
  "paymentAlipayPrivateKeyEncrypted",
  "paymentAlipayPublicKeyEncrypted",
  "paymentAlipayNotifyUrl",
  "paymentAlipayReturnUrl",
  "paymentAlipayPageEnabled",
  "paymentAlipayWapEnabled",
  "paymentWechatEnabled",
  "paymentWechatAppId",
  "paymentWechatMerchantId",
  "paymentWechatApiV3KeyEncrypted",
  "paymentWechatMerchantPrivateKeyEncrypted",
  "paymentWechatMerchantSerialNo",
  "paymentWechatNotifyUrl",
  "paymentWechatPublicKeyEncrypted",
  "paymentWechatPublicKeyId",
  "paymentWechatAppSecretEncrypted",
  "paymentWechatJsapiOauthCallbackUrl",
  "paymentWechatNativeEnabled",
  "paymentWechatH5Enabled",
  "paymentWechatJsapiEnabled"
]);

export default async function AdminSettingsPage() {
  const settings = await getAdminSystemConfigs();
  const systemSettings = settings.filter((setting) => !aiConfigKeys.has(setting.key) && !paymentConfigKeys.has(setting.key));
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
                  <FieldLabel htmlFor="public-nav-items">前台导航菜单</FieldLabel>
                  <Textarea
                    id="public-nav-items"
                    name="publicNavItems"
                    defaultValue={
                      configByKey.get("publicNavItems") ??
                      "首页|/\n功能|/features\n场景|/use-cases\n工具|/tools\n价格|/pricing\n文章|/articles\n用户中心|/dashboard"
                    }
                    required
                  />
                  <FieldDescription>每行一个菜单，格式为 名称|站内路径。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="footer-text">Footer 文案</FieldLabel>
                  <Textarea
                    id="footer-text"
                    name="footerText"
                    defaultValue={
                      configByKey.get("footerText") ??
                      "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。"
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-title">首页标题</FieldLabel>
                  <Input
                    id="home-title"
                    name="homeTitle"
                    defaultValue={
                      configByKey.get("homeTitle") ?? "面向内容型 AI SaaS 的第一批可运营页面"
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-description">首页描述</FieldLabel>
                  <Textarea
                    id="home-description"
                    name="homeDescription"
                    defaultValue={
                      configByKey.get("homeDescription") ??
                      "首页、文章、单页、用户中心和管理后台已经连成可访问的中文界面。"
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-cta-text">首页 CTA 文案</FieldLabel>
                  <Input
                    id="home-cta-text"
                    name="homeCtaText"
                    defaultValue={configByKey.get("homeCtaText") ?? "免费注册"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-cta-href">首页 CTA 链接</FieldLabel>
                  <Input
                    id="home-cta-href"
                    name="homeCtaHref"
                    defaultValue={configByKey.get("homeCtaHref") ?? "/register"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-feature-highlights">首页亮点</FieldLabel>
                  <Textarea
                    id="home-feature-highlights"
                    name="homeFeatureHighlights"
                    defaultValue={
                      configByKey.get("homeFeatureHighlights") ??
                      "可访问路由\n中文界面\n真实 CMS\n后台管理\n登录闭环"
                    }
                    required
                  />
                  <FieldDescription>每行一个亮点，首页会展示为标签。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="home-latest-article-count">首页最新文章数量</FieldLabel>
                  <Input
                    id="home-latest-article-count"
                    name="homeLatestArticleCount"
                    type="number"
                    min="1"
                    max="12"
                    defaultValue={configByKey.get("homeLatestArticleCount") ?? "3"}
                    required
                  />
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

        <AdminTableSection
          title="配置项列表"
          description="配置项数据来自真实系统配置 API。"
          headers={["配置项", "当前值", "可公开", "更新时间"]}
        >
          {systemSettings.map((setting) => (
            <TableRow key={setting.key}>
              <TableCell className="font-medium">{setting.label}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{setting.value}</TableCell>
              <TableCell>
                <Badge variant={setting.isPublic ? "secondary" : "muted"}>
                  {setting.isPublic ? "公开" : "后台"}
                </Badge>
              </TableCell>
              <TableCell>{new Date(setting.updatedAt).toLocaleDateString("zh-CN")}</TableCell>
            </TableRow>
          ))}
        </AdminTableSection>
      </div>
    </AdminShell>
  );
}
