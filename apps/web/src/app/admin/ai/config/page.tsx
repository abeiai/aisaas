import { AdminShell } from "@/components/shell/admin-shell";
import { AdminTableSection } from "@/components/shell/admin-table-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSystemConfigs, updateAiConfigAction } from "@/lib/settings-api";

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

export default async function AdminAiConfigPage() {
  const settings = await getAdminSystemConfigs();
  const aiSettings = settings.filter((setting) => aiConfigKeys.has(setting.key));
  const configByKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  return (
    <AdminShell
      active="/admin/ai/config"
      title="AI 配置"
      description="集中管理默认 AI 策略、内容保存策略和语音 AI 安全审核配置。"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI 运行配置</CardTitle>
            <CardDescription>这些配置会影响 AI 任务记录、语音工具审核和前台语音安全提示。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAiConfigAction} className="grid gap-6 xl:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="default-ai-model">默认 AI 模型</FieldLabel>
                  <Input
                    id="default-ai-model"
                    name="defaultAiModel"
                    defaultValue={configByKey.get("defaultAiModel") ?? "本地 mock"}
                    required
                  />
                  <FieldDescription>后台运营识别使用的默认 AI 模型名称。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-save-full-content">AI 完整内容保存</FieldLabel>
                  <Select
                    id="ai-save-full-content"
                    name="aiSaveFullContent"
                    defaultValue={configByKey.get("aiSaveFullContent") ?? "false"}
                  >
                    <option value="false">关闭，仅保存预览与哈希</option>
                    <option value="true">启用，保存完整内容</option>
                  </Select>
                  <FieldDescription>默认关闭，启用后才保存完整输入、Prompt 和生成结果。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-voice-clone-review-required">声音复刻审核</FieldLabel>
                  <Select
                    id="audio-voice-clone-review-required"
                    name="audioVoiceCloneReviewRequired"
                    defaultValue={configByKey.get("audioVoiceCloneReviewRequired") ?? "true"}
                  >
                    <option value="true">开启，生成后进入待审核</option>
                    <option value="false">关闭，生成后直接可用</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-voice-design-review-required">声音设计审核</FieldLabel>
                  <Select
                    id="audio-voice-design-review-required"
                    name="audioVoiceDesignReviewRequired"
                    defaultValue={configByKey.get("audioVoiceDesignReviewRequired") ?? "false"}
                  >
                    <option value="false">关闭，生成后直接可用</option>
                    <option value="true">开启，生成后进入待审核</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-user-public-voice-enabled">允许公开用户音色</FieldLabel>
                  <Select
                    id="audio-user-public-voice-enabled"
                    name="audioUserPublicVoiceEnabled"
                    defaultValue={configByKey.get("audioUserPublicVoiceEnabled") ?? "false"}
                  >
                    <option value="false">不允许</option>
                    <option value="true">允许</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-clone-default-visibility">复刻音色默认可见性</FieldLabel>
                  <Select
                    id="audio-clone-default-visibility"
                    name="audioCloneDefaultVisibility"
                    defaultValue={configByKey.get("audioCloneDefaultVisibility") ?? "PRIVATE"}
                  >
                    <option value="PRIVATE">仅用户自己可见</option>
                    <option value="ADMIN_ONLY">仅管理员可见</option>
                    <option value="PUBLIC">公开可见</option>
                  </Select>
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="audio-design-default-visibility">设计音色默认可见性</FieldLabel>
                  <Select
                    id="audio-design-default-visibility"
                    name="audioDesignDefaultVisibility"
                    defaultValue={configByKey.get("audioDesignDefaultVisibility") ?? "PRIVATE"}
                  >
                    <option value="PRIVATE">仅用户自己可见</option>
                    <option value="ADMIN_ONLY">仅管理员可见</option>
                    <option value="PUBLIC">公开可见</option>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-safety-notice">语音安全提示</FieldLabel>
                  <Textarea
                    id="audio-safety-notice"
                    name="audioSafetyNotice"
                    defaultValue={
                      configByKey.get("audioSafetyNotice") ??
                      "AI 生成语音可能被误用，请勿用于冒充他人、诈骗、侵权、虚假宣传或违法违规用途。声音复刻仅允许上传本人声音或已获得授权的声音。生成音频建议标注为 AI 生成语音。"
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-clone-consent-text">声音复刻授权声明</FieldLabel>
                  <Textarea
                    id="audio-clone-consent-text"
                    name="audioCloneConsentText"
                    defaultValue={
                      configByKey.get("audioCloneConsentText") ??
                      "我确认上传的音频为本人声音，或我已获得声音权利人的明确授权。我承诺不会将该音色用于冒充他人、诈骗、侵权、虚假宣传或其他违法违规用途。"
                    }
                    required
                  />
                  <FieldDescription>用户提交复刻任务时会保存这段声明快照。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="audio-download-notice">音频下载提示</FieldLabel>
                  <Textarea
                    id="audio-download-notice"
                    name="audioDownloadNotice"
                    defaultValue={
                      configByKey.get("audioDownloadNotice") ??
                      "下载或对外使用生成音频前，请确认用途合法合规，并建议标注为 AI 生成语音。"
                    }
                    required
                  />
                </Field>
                <Button className="w-fit" type="submit">保存 AI 配置</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <AdminTableSection
          title="AI 配置项"
          description="这里只展示智能中枢相关的系统配置项。"
          headers={["配置项", "当前值", "可公开", "更新时间"]}
        >
          {aiSettings.map((setting) => (
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
