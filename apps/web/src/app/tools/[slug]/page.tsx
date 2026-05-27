import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  FileAudio,
  Headphones,
  LoaderCircle,
  Sparkles,
  WalletCards
} from "lucide-react";

import { StreamToolForm } from "@/components/ai/stream-tool-form";
import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createToolTaskAction,
  getAiTask,
  getAiTool,
  getAiTools,
  type AiTask,
  type AiToolInputField
} from "@/lib/ai-api";
import {
  audioUrl,
  createAudioToolTaskAction,
  getAudioTask,
  getVoiceLibrary,
  type VoiceLibrary
} from "@/lib/audio-api";
import { getKnowledgeBases } from "@/lib/knowledge-api";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "未完成";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function statusVariant(status: AiTask["status"]) {
  if (status === "SUCCEEDED") {
    return "secondary" as const;
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "muted" as const;
  }

  return "outline" as const;
}

function taskInputText(task: AiTask | null) {
  return task?.input && typeof task.input.text === "string" ? task.input.text : "";
}

function taskVariable(task: AiTask | null, name: string) {
  return task?.input.variables?.[name] ?? "";
}

function isAudioField(field: AiToolInputField) {
  return ["voice-select", "audio-upload", "slider", "audio-preview", "format-select"].includes(field.type);
}

function isAudioTool(tool: Awaited<ReturnType<typeof getAiTool>>, fields: AiToolInputField[]) {
  return tool.requiredCapabilities.includes("AUDIO") || fields.some(isAudioField);
}

function toolFields(tool: Awaited<ReturnType<typeof getAiTool>>) {
  if (tool.inputSchema?.fields.length) {
    return tool.inputSchema.fields;
  }

  return [
    {
      name: "input",
      label: "输入内容",
      type: "textarea",
      required: true,
      placeholder: "请填写生成需求",
      options: []
    },
    ...tool.promptVariables.map((variable) => ({
      name: variable.name,
      label: variable.label,
      type: "text" as const,
      required: variable.required,
      placeholder: variable.placeholder,
      options: []
    }))
  ] satisfies AiToolInputField[];
}

function FieldControl({
  field,
  task,
  voiceLibrary
}: {
  field: AiToolInputField;
  task: AiTask | null;
  voiceLibrary: VoiceLibrary | null;
}) {
  const name = field.name === "input" ? "input" : `var_${field.name}`;
  const value = field.name === "input" ? taskInputText(task) : taskVariable(task, field.name);
  const id = field.name === "input" ? "input" : `var_${field.name}`;
  const defaultValue = field.defaultValue === undefined ? value : String(field.defaultValue);

  if (field.type === "textarea") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Textarea
          id={id}
          name={name}
          defaultValue={value}
          minLength={field.required ? 1 : undefined}
          maxLength={field.name === "input" ? 2000 : undefined}
          placeholder={field.placeholder}
          rows={field.name === "input" ? 8 : 5}
          required={field.required}
        />
        {field.name === "input" ? (
          <FieldDescription>最多 2000 字，建议写清目标用户、语气和限制条件。</FieldDescription>
        ) : null}
      </Field>
    );
  }

  if (field.type === "select") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Select id={id} name={name} defaultValue={value} required={field.required}>
          <option value="">请选择</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "format-select") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Select id={id} name={name} defaultValue={defaultValue || field.options[0] || "mp3"} required={field.required}>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option.toUpperCase()}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "voice-select") {
    const systemVoices = voiceLibrary?.systemVoices ?? [];
    const platformVoices = voiceLibrary?.platformVoices?.filter((voice) => voice.status === "READY") ?? [];
    const customVoices = voiceLibrary?.customVoices.filter((voice) => voice.status === "READY") ?? [];

    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Select id={id} name={name} defaultValue={voiceLibrary?.defaultVoice.voiceAssetId ? `voice:${voiceLibrary.defaultVoice.voiceAssetId}` : ""} required={field.required}>
          <option value="">使用默认系统音色</option>
          {systemVoices.map((voice) => (
            <option key={voice.providerVoiceId} value={`system:${voice.providerVoiceId ?? ""}`}>
              {voice.name} · 系统音色
            </option>
          ))}
          {platformVoices.map((voice) => (
            <option key={voice.id} value={`voice:${voice.id}`}>
              {voice.name} · {voice.type === "CLONED" ? "平台复刻音色" : "平台设计音色"}
            </option>
          ))}
          {customVoices.map((voice) => (
            <option key={voice.id} value={`voice:${voice.id}`}>
              {voice.name} · {voice.typeName}
            </option>
          ))}
        </Select>
        <FieldDescription>只显示系统音色、平台音色和已审核可用的个人音色。</FieldDescription>
      </Field>
    );
  }

  if (field.type === "audio-upload") {
    const accept = field.accept?.join(",") || "audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,video/mp4";

    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <Input accept={accept} id={id} name={name} required={field.required} type="file" />
        <FieldDescription>
          仅支持音频文件，大小不超过 {(field.maxSizeMb ?? 20).toLocaleString("zh-CN")}MB。
        </FieldDescription>
      </Field>
    );
  }

  if (field.type === "slider") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        <div className="grid gap-3">
          <Input
            id={id}
            max={field.max}
            min={field.min}
            name={name}
            step="0.1"
            type="range"
            defaultValue={defaultValue || field.min}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{field.min ?? 0}</span>
            <span>默认 {defaultValue || field.min}</span>
            <span>{field.max ?? 1}</span>
          </div>
        </div>
        <FieldDescription>
          范围 {field.min ?? 0} - {field.max ?? 1}，提交时后端会再次校验。
        </FieldDescription>
      </Field>
    );
  }

  if (field.type === "audio-preview") {
    return (
      <Field>
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
          <FileAudio data-icon="inline-start" />
          {field.label}会在提交成功后显示在右侧结果区。
        </div>
      </Field>
    );
  }

  if (field.type === "switch") {
    const checked = ["1", "true", "on", "yes", "是", "启用"].includes(value.toLowerCase());

    return (
      <Field>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-input bg-card px-4 py-2 text-sm">
          <input
            className="size-4 accent-foreground"
            defaultChecked={checked}
            name={name}
            type="checkbox"
            value="true"
          />
          <span className="font-medium">{field.label}</span>
        </label>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        max={field.max}
        min={field.min}
        placeholder={field.placeholder}
        required={field.required}
        type={field.type === "number" ? "number" : "text"}
      />
    </Field>
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getAiTool(slug).catch(() => null);

  if (!tool) {
    return {
      title: "AI 工具 - AI SaaS"
    };
  }

  return {
    title: `${tool.name} - AI SaaS`,
    description: tool.description ?? "中文 AI 工具模板"
  };
}

export default async function ToolDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ task?: string; audioTask?: string; voice?: string; error?: string; created?: string; failed?: string }>;
}) {
  const { slug } = await params;
  const tool = await getAiTool(slug).catch(() => null);

  if (!tool) {
    notFound();
  }

  const query = await searchParams;
  const fields = toolFields(tool);
  const audioTool = isAudioTool(tool, fields);
  const [knowledgeBases, recommendations, voiceLibrary, audioTask] = await Promise.all([
    audioTool ? Promise.resolve([]) : getKnowledgeBases().catch(() => []),
    getAiTools(tool.toolCategory?.slug).catch(() => []),
    audioTool ? getVoiceLibrary().catch(() => null) : Promise.resolve(null),
    audioTool && query.audioTask ? getAudioTask(query.audioTask).catch(() => null) : Promise.resolve(null)
  ]);
  const currentTask = query.task
    ? await getAiTask(query.task)
        .then((task) => (task.scenario.slug === tool.slug ? task : null))
        .catch(() => null)
    : null;
  const currentVoice = query.voice
    ? voiceLibrary?.customVoices.find((voice) => voice.id === query.voice) ?? null
    : null;
  const balanceError = query.error?.includes("点数余额不足");
  const relatedTools = recommendations.filter((item) => item.slug !== tool.slug).slice(0, 3);
  const resultAudioUrl = audioTask ? audioUrl(audioTask) : null;

  return (
    <PublicShell>
      <section className="flex w-full flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-col gap-4">
            <Badge>{tool.toolCategory?.name ?? "AI 工具"}</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal md:text-6xl">
              {tool.name}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {tool.description ?? "填写动态表单后生成内容，结果会同步到任务历史。"}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">已开放</Badge>
              <span className="inline-flex items-center gap-2">
                <Coins data-icon="inline-start" />
                预估 {tool.costCredits.toLocaleString("zh-CN")} 点 / 次
              </span>
              {tool.defaultModelAlias ? <Badge variant="outline">{tool.defaultModelAlias}</Badge> : null}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/tools">
              <ArrowLeft data-icon="inline-start" />
              返回工具列表
            </Link>
          </Button>
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

        {query.created && currentTask?.status === "SUCCEEDED" ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm">
              <CheckCircle2 data-icon="inline-start" />
              生成成功，结果和点数结算已同步到任务历史。
            </CardContent>
          </Card>
        ) : null}

        {query.failed && currentTask?.status === "FAILED" ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <AlertCircle data-icon="inline-start" />
              生成失败，冻结点数已自动释放。
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>输入需求</CardTitle>
              <CardDescription>提交前请确认点数余额充足。未登录提交会先进入登录流程。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={audioTool ? createAudioToolTaskAction : createToolTaskAction} className="flex flex-col gap-6">
                <input name="scenarioSlug" type="hidden" value={tool.slug} />
                {audioTool ? <input name="consentStatement" type="hidden" value="我确认上传的音频为本人声音，或我已获得声音权利人的明确授权。我承诺不会将该音色用于冒充他人、诈骗、侵权、虚假宣传或其他违法违规用途。" /> : null}
                <FieldGroup>
                  {fields.map((field) => (
                    <FieldControl field={field} key={field.name} task={currentTask} voiceLibrary={voiceLibrary} />
                  ))}
                  {!audioTool && knowledgeBases.length > 0 ? (
                    <Field>
                      <FieldLabel htmlFor="knowledgeBaseId">关联知识库</FieldLabel>
                      <Select
                        id="knowledgeBaseId"
                        name="knowledgeBaseId"
                        defaultValue={currentTask?.knowledgeBaseId ?? ""}
                      >
                        <option value="">不使用知识库</option>
                        {knowledgeBases.map((base) => (
                          <option key={base.id} value={base.id}>
                            {base.name}
                          </option>
                        ))}
                      </Select>
                      <FieldDescription>选择后会检索相关片段并拼入 Prompt。</FieldDescription>
                    </Field>
                  ) : null}
                </FieldGroup>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    {audioTool ? <Headphones data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                    {audioTool ? "生成音频" : "生成内容"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/login?next=${encodeURIComponent(`/tools/${tool.slug}`)}`}>
                      登录后使用
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成结果</CardTitle>
              <CardDescription>提交任务后会在这里展示当前结果，也会同步到任务历史。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {audioTask ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">音频任务</span>
                      <span className="font-mono text-xs">{audioTask.id}</span>
                    </div>
                    <Badge variant={audioTask.status === "SUCCEEDED" ? "secondary" : audioTask.status === "FAILED" ? "muted" : "outline"}>
                      {audioTask.statusName}
                    </Badge>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">预估点数</p>
                      <p className="mt-1 font-medium">{audioTask.estimatedCredits.toLocaleString("zh-CN")} 点</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">实际消耗</p>
                      <p className="mt-1 font-medium">{(audioTask.actualCredits ?? 0).toLocaleString("zh-CN")} 点</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">完成时间</p>
                      <p className="mt-1 font-medium">{formatDate(audioTask.finishedAt)}</p>
                    </div>
                  </div>
                  {resultAudioUrl ? (
                    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
                      <audio className="w-full" controls src={resultAudioUrl}>
                        <track kind="captions" />
                      </audio>
                      <Button asChild className="w-fit" size="sm" variant="outline">
                        <a download href={resultAudioUrl}>
                          下载音频
                          <FileAudio data-icon="inline-end" />
                        </a>
                      </Button>
                    </div>
                  ) : null}
                  {audioTask.status === "FAILED" ? (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
                      <AlertCircle data-icon="inline-start" />
                      {audioTask.errorMessage ?? "语音任务失败，冻结点数已自动释放。"}
                    </div>
                  ) : null}
                </>
              ) : currentVoice ? (
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
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/dashboard/voices">
                        <Headphones data-icon="inline-start" />
                        管理音色
                      </Link>
                    </Button>
                    {currentVoice.status === "READY" ? (
                      <Button asChild variant="outline">
                        <Link href={`/tools/article-to-speech?voice=${currentVoice.id}`}>使用该音色合成</Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : currentTask ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-4">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">任务编号</span>
                      <span className="font-mono text-xs">{currentTask.id}</span>
                    </div>
                    <Badge variant={statusVariant(currentTask.status)}>{currentTask.statusName}</Badge>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">预估点数</p>
                      <p className="mt-1 font-medium">
                        {currentTask.estimatedCredits.toLocaleString("zh-CN")} 点
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">实际消耗</p>
                      <p className="mt-1 font-medium">
                        {(currentTask.actualCredits ?? 0).toLocaleString("zh-CN")} 点
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-muted-foreground">完成时间</p>
                      <p className="mt-1 font-medium">{formatDate(currentTask.finishedAt)}</p>
                    </div>
                  </div>
                  {currentTask.status === "SUCCEEDED" && currentTask.output ? (
                    <div className="whitespace-pre-wrap rounded-md border border-border bg-background p-5 text-sm leading-7">
                      {currentTask.output}
                    </div>
                  ) : null}
                  {currentTask.status === "FAILED" ? (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
                      <AlertCircle data-icon="inline-start" />
                      {currentTask.errorMessage ?? "AI 生成失败，请稍后重试"}
                    </div>
                  ) : null}
                  {currentTask.status === "RUNNING" || currentTask.status === "RESERVED" ? (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
                      <LoaderCircle data-icon="inline-start" />
                      任务处理中，请稍后刷新查看结果。
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  暂无生成结果。未登录用户提交后会先进入登录流程，余额不足时会提示充值。
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {relatedTools.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-medium">同类工具推荐</h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/tools?category=${tool.toolCategory?.slug ?? ""}`}>查看分类</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedTools.map((item) => (
                <Card key={item.slug}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description ?? "中文 AI 工具模板"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline">
                      <Link href={`/tools/${item.slug}`}>
                        进入工具
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {!audioTool ? (
          <Card>
            <CardHeader>
              <CardTitle>SSE 流式输出</CardTitle>
              <CardDescription>用于验证流式生成、逐字显示和中断释放冻结点数。</CardDescription>
            </CardHeader>
            <CardContent>
              <StreamToolForm
                placeholder={fields.find((field) => field.name === "input")?.placeholder ?? "请输入生成需求"}
                promptVariables={tool.promptVariables}
                scenarioId={tool.id}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>
    </PublicShell>
  );
}
