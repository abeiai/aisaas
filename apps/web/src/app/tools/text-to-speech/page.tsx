import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, Download, Headphones, Play, WalletCards } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  audioUrl,
  createTtsAudioTaskAction,
  getAudioModels,
  getAudioTask,
  getVoiceLibrary
} from "@/lib/audio-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "语音合成 - AI SaaS",
  description: "输入中文文本，选择音色和模型，生成可在线播放和下载的语音音频。"
};

export default async function TextToSpeechPage({
  searchParams
}: {
  searchParams: Promise<{ task?: string; error?: string; created?: string; failed?: string; voice?: string }>;
}) {
  const query = await searchParams;
  const [models, library, task] = await Promise.all([
    getAudioModels().catch(() => []),
    getVoiceLibrary().catch(() => null),
    query.task ? getAudioTask(query.task).catch(() => null) : Promise.resolve(null)
  ]);
  const configuredModels = models.filter((model) => model.aliasKey.startsWith("tts") || model.aliasKey === "audio-preview");
  const systemVoices = library?.systemVoices ?? [];
  const platformVoices = library?.platformVoices.filter((voice) => voice.status === "READY") ?? [];
  const customVoices = library?.customVoices.filter((voice) => voice.status === "READY") ?? [];
  const resultUrl = task ? audioUrl(task) : null;
  const balanceError = query.error?.includes("点数余额不足");
  const modelError = query.error?.includes("模型别名") || query.error?.includes("未配置");

  return (
    <PublicShell>
      <section className="flex w-full flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-col gap-4">
            <Badge>语音工具</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              文字转语音
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              输入文本，选择系统音色或自己的音色，生成适合播客、课程、短视频旁白的中文语音。
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">最低 5 点</Badge>
              <Badge variant="outline">每 100 字约 5 点</Badge>
              <Badge variant="outline">最长 8000 字</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/tools">
                <ArrowLeft data-icon="inline-start" />
                返回工具列表
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/tasks">任务历史</Link>
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
              {modelError ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/ai/providers">去配置模型</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>合成参数</CardTitle>
              <CardDescription>提交后会先冻结预计点数，失败自动释放，成功后记录实际消耗。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTtsAudioTaskAction} className="flex flex-col gap-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="text">合成文本</FieldLabel>
                    <Textarea
                      id="text"
                      maxLength={8000}
                      minLength={1}
                      name="text"
                      placeholder="请输入要合成为语音的中文内容。建议一段控制在 300-800 字，试听更稳定。"
                      required
                      rows={10}
                    />
                    <FieldDescription>预计点数：每 100 字约 5 点，最低 5 点；生成前请确认钱包余额充足。</FieldDescription>
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="modelAlias">模型</FieldLabel>
                      <Select id="modelAlias" name="modelAlias" defaultValue="tts-default">
                        {configuredModels.map((model) => (
                          <option key={model.aliasKey} value={model.aliasKey}>
                            {model.displayName} · {model.statusName}
                          </option>
                        ))}
                        {configuredModels.length === 0 ? <option value="tts-default">默认语音合成模型 · 未配置</option> : null}
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="format">输出格式</FieldLabel>
                      <Select id="format" name="format" defaultValue="mp3">
                        <option value="mp3">MP3</option>
                        <option value="wav">WAV</option>
                        <option value="opus">Opus</option>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="voice">系统音色</FieldLabel>
                      <Select id="voice" name="voice" defaultValue={library?.defaultVoice.systemVoiceId ?? "longanyang"}>
                        {systemVoices.map((voice) => (
                          <option key={voice.providerVoiceId} value={voice.providerVoiceId ?? ""}>
                            {voice.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="voiceAssetId">我的音色</FieldLabel>
                      <Select id="voiceAssetId" name="voiceAssetId" defaultValue={query.voice ?? library?.defaultVoice.voiceAssetId ?? ""}>
                        <option value="">不使用平台或自定义音色</option>
                        {platformVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} · {voice.type === "CLONED" ? "平台复刻音色" : "平台设计音色"}
                          </option>
                        ))}
                        {customVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} · {voice.typeName}
                          </option>
                        ))}
                      </Select>
                      <FieldDescription>选择平台或自定义音色时会校验音色的 targetModel。</FieldDescription>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Field>
                      <FieldLabel htmlFor="speed">语速</FieldLabel>
                      <Input id="speed" max="2" min="0.5" name="speed" step="0.1" type="number" defaultValue="1" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="pitch">语调</FieldLabel>
                      <Input id="pitch" max="500" min="-500" name="pitch" step="50" type="number" defaultValue="0" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="volume">音量</FieldLabel>
                      <Input id="volume" max="2" min="0" name="volume" step="0.1" type="number" defaultValue="1" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sampleRate">采样率</FieldLabel>
                      <Select id="sampleRate" name="sampleRate" defaultValue="24000">
                        <option value="16000">16000</option>
                        <option value="24000">24000</option>
                        <option value="48000">48000</option>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    <Headphones data-icon="inline-start" />
                    生成音频
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/login?next=${encodeURIComponent("/tools/text-to-speech")}`}>登录后使用</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成结果</CardTitle>
              <CardDescription>成功任务可在线播放和下载，失败任务会显示中文原因。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {task ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">任务状态</span>
                      <span className="font-medium">{task.statusName}</span>
                    </div>
                    <Badge variant={task.status === "SUCCEEDED" ? "secondary" : task.status === "FAILED" ? "muted" : "outline"}>
                      {task.typeName}
                    </Badge>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <Info label="预计点数" value={`${task.estimatedCredits.toLocaleString("zh-CN")} 点`} />
                    <Info label="实际消耗" value={`${(task.actualCredits ?? 0).toLocaleString("zh-CN")} 点`} />
                  </div>
                  {resultUrl ? (
                    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
                      <audio className="w-full" controls src={resultUrl}>
                        <track kind="captions" />
                      </audio>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild size="sm" variant="outline">
                          <a href={resultUrl}>
                            <Play data-icon="inline-start" />
                            在线试听
                          </a>
                        </Button>
                        <Button asChild size="sm">
                          <a download href={resultUrl}>
                            下载音频
                            <Download data-icon="inline-end" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {task.status === "FAILED" ? (
                    <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                      {task.errorMessage ?? "语音合成失败，冻结点数已释放。"}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  暂无音频。提交后会在这里显示任务状态、点数消耗和音频播放器。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
