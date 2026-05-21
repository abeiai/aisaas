import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, Mic2, Sparkles, Wand2, WalletCards } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createVoiceDesignAction, getAudioModels, getVoiceLibrary } from "@/lib/audio-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "声音设计 - AI SaaS",
  description: "用中文描述想要的声音，生成可保存到个人音色库的设计音色。"
};

export default async function VoiceDesignPage({
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
  const designModels = models.filter((model) => model.aliasKey === "voice-design-default" || model.aliasKey === "audio-preview");
  const currentVoice = query.voice
    ? library?.customVoices.find((voice) => voice.id === query.voice) ?? null
    : null;
  const balanceError = query.error?.includes("点数余额不足");

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge>语音工具</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              声音设计
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              描述你想要的声音风格，生成新的个人音色。设计音色会保存到我的音色库，可继续用于文字转语音。
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
            <AlertCircle data-icon="inline-start" />
            <span className="leading-6">{safetyNotice}</span>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>设计音色</CardTitle>
              <CardDescription>声音设计会创建语音任务并冻结点数，失败时自动释放。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createVoiceDesignAction} className="flex flex-col gap-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">音色名称</FieldLabel>
                    <Input id="name" maxLength={80} name="name" placeholder="例如：绘本旁白女声" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="prompt">声音描述</FieldLabel>
                    <Textarea
                      id="prompt"
                      maxLength={1000}
                      minLength={1}
                      name="prompt"
                      placeholder="请描述你想要的声音，例如：温暖的年轻女性声音，语速自然，适合儿童绘本朗读。"
                      required
                      rows={8}
                    />
                    <FieldDescription>建议写清性别、年龄感、语速、情绪、用途和不希望出现的特征。</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="previewText">试听文本</FieldLabel>
                    <Textarea
                      id="previewText"
                      maxLength={300}
                      name="previewText"
                      placeholder="这里是一段试听文本，用来判断声音是否适合你的内容。"
                      rows={4}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="modelAlias">Target Model</FieldLabel>
                    <Select id="modelAlias" name="modelAlias" defaultValue="voice-design-default">
                      {designModels.map((model) => (
                        <option key={model.aliasKey} value={model.aliasKey}>
                          {model.displayName} · {model.statusName}
                        </option>
                      ))}
                      {designModels.length === 0 ? <option value="voice-design-default">默认声音设计模型 · 未配置</option> : null}
                    </Select>
                  </Field>
                </FieldGroup>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    <Wand2 data-icon="inline-start" />
                    生成音色
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/login?next=${encodeURIComponent("/tools/voice-design")}`}>登录后使用</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>设计结果</CardTitle>
              <CardDescription>成功后可进入音色库试听、重命名或设为默认音色。</CardDescription>
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
                  {currentVoice.previewAudioUrl ? (
                    <audio className="w-full" controls src={currentVoice.previewAudioUrl} />
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/dashboard/voices">
                        <Mic2 data-icon="inline-start" />
                        管理音色
                      </Link>
                    </Button>
                    {currentVoice.status === "READY" ? (
                      <Button asChild variant="outline">
                        <Link href={`/tools/text-to-speech?voice=${currentVoice.id}`}>使用该音色合成</Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  暂无设计结果。提交后会展示音色状态、试听地址和后续操作。
                </div>
              )}
              <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                <Sparkles data-icon="inline-start" />
                设计音色生成的 providerVoiceId 会保存到音色库，并记录 targetModel。
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
