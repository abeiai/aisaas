import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, FileAudio, Mic2, ShieldCheck, Upload, WalletCards } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createVoiceCloneAction, getAudioModels, getVoiceLibrary } from "@/lib/audio-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "声音复刻 - AI SaaS",
  description: "上传已授权的声音样本，提交声音复刻任务并保存到个人音色库。"
};

export default async function VoiceClonePage({
  searchParams
}: {
  searchParams: Promise<{ voice?: string; error?: string; created?: string; failed?: string }>;
}) {
  const query = await searchParams;
  const [models, library, publicConfigs] = await Promise.all([
    getAudioModels().catch(() => []),
    getVoiceLibrary().catch(() => null),
    getPublicSystemConfigs().catch(() => [])
  ]);
  const configByKey = new Map(publicConfigs.map((config) => [config.key, config.value]));
  const safetyNotice =
    configByKey.get("audioSafetyNotice") ??
    "AI 生成语音可能被误用，请勿用于冒充他人、诈骗、侵权、虚假宣传或违法违规用途。声音复刻仅允许上传本人声音或已获得授权的声音。生成音频建议标注为 AI 生成语音。";
  const consentText =
    configByKey.get("audioCloneConsentText") ??
    "我确认上传的音频为本人声音，或我已获得声音权利人的明确授权。我承诺不会将该音色用于冒充他人、诈骗、侵权、虚假宣传或其他违法违规用途。";
  const cloneModels = models.filter((model) => model.aliasKey === "voice-clone-default" || model.aliasKey === "audio-preview");
  const currentVoice = query.voice
    ? library?.customVoices.find((voice) => voice.id === query.voice) ?? null
    : null;
  const balanceError = query.error?.includes("点数余额不足");

  return (
    <PublicShell>
      <section className="flex w-full flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-col gap-4">
            <Badge>语音工具</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              声音复刻
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              上传 10-20 秒清晰音频样本，创建仅自己可见的复刻音色。提交前必须确认声音授权。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/tools">
                <ArrowLeft data-icon="inline-start" />
                返回工具列表
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/voices">我的音色库</Link>
            </Button>
          </div>
        </div>

        {query.error ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <span className="inline-flex items-center gap-3">
                <AlertCircle data-icon="inline-start" />
                操作失败：{query.error}
              </span>
              {balanceError ? (
                <Button asChild size="sm">
                  <Link href="/dashboard/billing">
                    去充值
                    <WalletCards data-icon="inline-end" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
            <ShieldCheck data-icon="inline-start" />
            <span className="leading-6">{safetyNotice}</span>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>上传声音样本</CardTitle>
              <CardDescription>样本会先进入音频资产，再创建复刻任务和授权记录。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createVoiceCloneAction} className="flex flex-col gap-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">音色名称</FieldLabel>
                    <Input id="name" maxLength={80} name="name" placeholder="例如：我的课程旁白音色" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="file">声音样本</FieldLabel>
                    <Input accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,video/mp4" id="file" name="file" required type="file" />
                    <FieldDescription>建议上传 10-20 秒清晰、无背景噪音、无长静音的音频。</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="modelAlias">Target Model</FieldLabel>
                    <Select id="modelAlias" name="modelAlias" defaultValue="voice-clone-default">
                      {cloneModels.map((model) => (
                        <option key={model.aliasKey} value={model.aliasKey}>
                          {model.displayName} · {model.statusName}
                        </option>
                      ))}
                      {cloneModels.length === 0 ? <option value="voice-clone-default">默认声音复刻模型 · 未配置</option> : null}
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description">备注</FieldLabel>
                    <Textarea id="description" maxLength={240} name="description" placeholder="例如：仅用于本人课程试听和内容播报。" rows={4} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="consentType">授权类型</FieldLabel>
                    <Select id="consentType" name="consentType" defaultValue="SELF_VOICE">
                      <option value="SELF_VOICE">本人声音</option>
                      <option value="AUTHORIZED_VOICE">已获授权声音</option>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ownerName">声音权利人姓名</FieldLabel>
                    <Input id="ownerName" maxLength={80} name="ownerName" placeholder="本人声音可不填；使用授权声音时必填" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ownerContact">权利人联系方式</FieldLabel>
                    <Input id="ownerContact" maxLength={160} name="ownerContact" placeholder="授权声音必填，用于审计留存" />
                  </Field>
                  <Field>
                    <label className="flex items-start gap-3 rounded-md border border-border bg-background p-4 text-sm">
                      <input className="mt-1 size-4 accent-foreground" name="consentAccepted" required type="checkbox" />
                      <span className="leading-6">
                        {consentText}
                      </span>
                    </label>
                    <input name="consentStatement" type="hidden" value={consentText} />
                  </Field>
                </FieldGroup>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    <Upload data-icon="inline-start" />
                    提交复刻任务
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/login?next=${encodeURIComponent("/tools/voice-clone")}`}>登录后使用</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>录音质量要求</CardTitle>
                <CardDescription>不满足要求的样本更容易复刻失败。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <Requirement icon={<ShieldCheck />} text="请上传本人声音或已获得授权的声音样本。" />
                <Requirement icon={<AlertCircle />} text="请勿上传他人声音、公众人物声音或用于冒充他人的音频。" />
                <Requirement icon={<FileAudio />} text="建议上传 10-20 秒清晰、无背景噪音、无长静音的音频。" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>复刻结果</CardTitle>
                <CardDescription>复刻音色默认 PRIVATE，只能在自己的音色库中管理。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {currentVoice ? (
                  <>
                    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-background p-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{currentVoice.name}</p>
                        <p className="text-sm text-muted-foreground">{currentVoice.targetModel}</p>
                      </div>
                      <Badge variant={currentVoice.status === "READY" ? "secondary" : currentVoice.status === "FAILED" ? "muted" : "outline"}>
                        {currentVoice.statusName}
                      </Badge>
                    </div>
                    {currentVoice.previewAudioUrl ? <audio className="w-full" controls src={currentVoice.previewAudioUrl} /> : null}
                    <Button asChild>
                      <Link href="/dashboard/voices">
                        <Mic2 data-icon="inline-start" />
                        管理音色
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                    暂无复刻结果。提交后可以在这里查看音色状态，也可以到音色库和任务历史继续跟踪。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Requirement({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-background p-4">
      {icon}
      <span className="leading-6">{text}</span>
    </div>
  );
}
