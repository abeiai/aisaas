"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AudioLines,
  ChevronRight,
  Download,
  Headphones,
  History,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  WandSparkles
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PublicUser } from "@/lib/auth-actions";
import { cosyVoiceV35PresetPrefix } from "@/lib/cosyvoice-v35-presets";
import { cn } from "@/lib/utils";

export interface VoiceModelOption {
  aliasKey: string;
  displayName: string;
  statusName: string;
  providerName: string | null;
  modelName: string | null;
  isConfigured: boolean;
  inputPrice: string;
  outputPrice: string;
  pricingMode: "TOKENS" | "TOKEN_CACHE" | "TOKEN_TIERED" | "REQUEST" | "CHARACTERS" | "IMAGES" | "SECONDS" | "VIDEO_SECONDS";
  pricingUnit: "K_TOKENS" | "M_TOKENS" | "REQUEST" | "CHARACTER" | "K_CHARACTERS" | "TEN_K_CHARACTERS" | "IMAGE" | "SECOND";
  creditsPerCny: number;
}

export interface VoiceOption {
  value: string;
  name: string;
  description: string | null;
  badge: string;
  previewAudioUrl: string | null;
  language?: string | null;
  languages?: string[];
  trait?: string | null;
  scene?: string | null;
  ageCategory?: "儿童" | "青年" | "中年" | "老年" | null;
  supportedModels?: string[];
  ssmlSupported?: boolean;
  instructSupported?: boolean;
  timestampSupported?: boolean;
  isDefault?: boolean;
}

export interface VoiceTaskItem {
  id: string;
  title: string;
  status: string;
  statusName: string;
  createdAt: string;
  audioUrl: string | null;
  voiceName: string;
  credits: number;
}

export interface CurrentVoiceTask extends VoiceTaskItem {
  text: string | null;
  errorMessage: string | null;
}

interface VoiceConsoleProps {
  currentUser: PublicUser | null;
  models: VoiceModelOption[];
  voices: VoiceOption[];
  history: VoiceTaskItem[];
  currentTask: CurrentVoiceTask | null;
  error?: string;
  createAction: (formData: FormData) => void | Promise<void>;
}

const textLimit = 5000;
const defaultVoiceValue = `${cosyVoiceV35PresetPrefix}announcer`;
const voiceDraftKey = "aisaas:experience-voice:draft";

interface VoiceConsoleDraft {
  text?: string;
  selectedModel?: string;
  selectedVoice?: string;
  speed?: string;
  pitch?: string;
  volume?: string;
}

export function VoiceConsole({
  currentUser,
  models,
  voices,
  history,
  currentTask,
  error,
  createAction
}: VoiceConsoleProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [text, setText] = useState(currentTask?.text ?? "");
  const [selectedModel, setSelectedModel] = useState(() => defaultModelAlias(models));
  const [selectedVoice, setSelectedVoice] = useState(
    voices.find((voice) => voice.isDefault)?.value ?? voices[0]?.value ?? defaultVoiceValue
  );
  const [speed, setSpeed] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [volume, setVolume] = useState("1");
  const [draftReady, setDraftReady] = useState(Boolean(currentTask));

  const selectedModelOption = useMemo(
    () => models.find((model) => model.aliasKey === selectedModel) ?? models[0],
    [models, selectedModel]
  );
  const estimatedBillingCharacters = useMemo(() => estimateTtsBillingCharacters(text), [text]);
  const estimatedCredits = useMemo(
    () => estimateVoiceCredits(selectedModelOption, estimatedBillingCharacters),
    [estimatedBillingCharacters, selectedModelOption]
  );
  const compatibleVoices = useMemo(() => {
    const modelName = selectedModelOption?.modelName;
    const filtered = voices.filter((voice) => {
      if (!modelName || !voice.supportedModels?.length) {
        return true;
      }

      return voice.supportedModels.includes(modelName);
    });

    return filtered.length > 0 ? filtered : voices;
  }, [selectedModelOption?.modelName, voices]);
  const selectedVoiceOption = useMemo(
    () => compatibleVoices.find((voice) => voice.value === selectedVoice) ?? compatibleVoices[0] ?? voices[0],
    [compatibleVoices, selectedVoice, voices]
  );
  const selectedOfficialPreset = selectedVoice.startsWith(cosyVoiceV35PresetPrefix);
  const hasConfiguredModel = models.some((model) => model.isConfigured);
  const selectedModelReady = Boolean(selectedModelOption?.isConfigured);
  const selectedVoiceSupported = Boolean(
    !selectedVoiceOption?.supportedModels?.length ||
      (selectedModelOption?.modelName && selectedVoiceOption.supportedModels.includes(selectedModelOption.modelName))
  );
  const requiredModelsText = selectedVoiceOption?.supportedModels?.join(" 或 ");
  const modelWarning = !hasConfiguredModel
    ? "尚未配置可用语音模型，请先在后台启用阿里云百炼语音 Provider 并绑定语音模型。"
    : !selectedModelReady
      ? "当前选择的语音默认模型尚未配置可用模型。"
      : !selectedVoiceSupported
        ? `当前音色需要 ${requiredModelsText}，请切换兼容模型或后台完成配置。`
        : null;
  const canSubmit = Boolean(currentUser && text.trim().length > 0 && selectedModelReady && selectedVoiceSupported);

  useEffect(() => {
    if (currentTask?.text === undefined || currentTask.text === null) {
      return;
    }

    setText(currentTask.text);
  }, [currentTask?.id, currentTask?.text]);

  useEffect(() => {
    if (currentTask) {
      setDraftReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(voiceDraftKey);
      if (!raw) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(raw) as unknown;
      if (!isVoiceConsoleDraft(draft)) {
        setDraftReady(true);
        return;
      }

      if (typeof draft.text === "string") {
        setText(draft.text.slice(0, textLimit));
      }

      if (draft.selectedModel && (models.length === 0 || models.some((model) => model.aliasKey === draft.selectedModel))) {
        setSelectedModel(draft.selectedModel);
      }

      if (draft.selectedVoice && (voices.length === 0 || voices.some((voice) => voice.value === draft.selectedVoice))) {
        setSelectedVoice(draft.selectedVoice);
      }

      if (draft.speed) {
        setSpeed(draft.speed);
      }

      if (draft.pitch) {
        setPitch(draft.pitch);
      }

      if (draft.volume) {
        setVolume(draft.volume);
      }
    } catch {
      window.localStorage.removeItem(voiceDraftKey);
    } finally {
      setDraftReady(true);
    }
  }, [currentTask, models, voices]);

  useEffect(() => {
    if (currentTask || !draftReady) {
      return;
    }

    window.localStorage.setItem(
      voiceDraftKey,
      JSON.stringify({
        text,
        selectedModel,
        selectedVoice,
        speed,
        pitch,
        volume
      } satisfies VoiceConsoleDraft)
    );
  }, [currentTask, draftReady, pitch, selectedModel, selectedVoice, speed, text, volume]);

  useEffect(() => {
    if (models.length === 0 || models.some((model) => model.aliasKey === selectedModel)) {
      return;
    }

    setSelectedModel(defaultModelAlias(models));
  }, [models, selectedModel]);

  useEffect(() => {
    if (compatibleVoices.length === 0 || compatibleVoices.some((voice) => voice.value === selectedVoice)) {
      return;
    }

    setSelectedVoice(compatibleVoices.find((voice) => voice.isDefault)?.value ?? compatibleVoices[0].value);
  }, [compatibleVoices, selectedVoice]);

  function insertSnippet(snippet: string) {
    setText((current) => {
      const glue = current && !current.endsWith("\n") ? "\n" : "";
      return `${current}${glue}${snippet}`.slice(0, textLimit);
    });
  }

  function resetParameters() {
    setSpeed("1");
    setPitch("0");
    setVolume("1");
  }

  return (
    <main
      className={cn(
        "grid h-[calc(100vh-4rem)] min-h-0 overflow-hidden bg-[#f6f6f5] text-foreground",
        sidebarCollapsed ? "grid-cols-[76px_minmax(0,1fr)]" : "grid-cols-[292px_minmax(0,1fr)]"
      )}
    >
      <aside className="flex min-h-0 flex-col border-r border-border bg-background">
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link className="flex min-w-0 items-center gap-2 font-display text-2xl font-light tracking-normal" href="/">
            <AudioLines className="size-7" />
            {!sidebarCollapsed ? <span className="truncate">AI SaaS</span> : null}
          </Link>
          <Button
            aria-label={sidebarCollapsed ? "展开左栏" : "收起左栏"}
            className="size-9 px-0"
            onClick={() => setSidebarCollapsed((current) => !current)}
            type="button"
            variant="ghost"
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>

        <div className="flex shrink-0 flex-col gap-2 px-4 pb-5">
          <Link
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-medium shadow-sm hover:bg-secondary",
              sidebarCollapsed ? "px-0" : "px-4"
            )}
            href="/experience/voice"
          >
            <Headphones className="size-4" />
            {!sidebarCollapsed ? <span>语音合成</span> : null}
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <History className="size-4" />
                <span>语音合成历史</span>
              </div>
              {history.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {history.map((task) => (
                    <Link
                      className={cn(
                        "flex flex-col gap-1 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-secondary",
                        currentTask?.id === task.id ? "bg-secondary text-foreground" : "text-muted-foreground"
                      )}
                      href={`/experience/voice?task=${task.id}`}
                      key={task.id}
                    >
                      <span className="line-clamp-2 font-medium text-foreground">{task.title}</span>
                      <span className="flex items-center justify-between gap-2 text-xs">
                        <span>{task.statusName}</span>
                        <span>{task.createdAt}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card px-3 py-5 text-sm leading-6 text-muted-foreground">
                  暂无历史。生成成功后会在这里保留最近的语音任务。
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 pt-2 text-muted-foreground">
              <History className="size-5" />
              <span className="[writing-mode:vertical-rl] text-xs">历史</span>
            </div>
          )}
        </div>

      </aside>

      <form action={createAction} className="flex min-h-0 flex-col">
        <header className="flex h-[86px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
              <Headphones className="size-7" />
              文字转语音
            </h1>
            <p className="text-sm text-muted-foreground">体验区 · 语音合成</p>
          </div>
          <div className="flex min-w-[300px] max-w-[580px] flex-1 items-end justify-end gap-3">
            <label className="flex w-full max-w-[420px] flex-col gap-1 text-xs font-medium text-muted-foreground">
              选择模型
              <Select name="modelAlias" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
                {models.map((model) => (
                  <option key={model.aliasKey} value={model.aliasKey}>
                    {model.displayName} · {model.providerName ?? "语音模型"}
                  </option>
                ))}
                {models.length === 0 ? <option value="tts-default">默认语音合成模型 · 登录后加载</option> : null}
              </Select>
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <Textarea
                className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent p-6 text-base leading-8 shadow-none focus:border-transparent focus:ring-0 md:text-base"
                maxLength={textLimit}
                minLength={1}
                name="text"
                onChange={(event) => setText(event.target.value)}
                placeholder="在此处开始输入文字，生成您的个性化音频。"
                required
                value={text}
              />
              <div className="flex shrink-0 flex-col gap-4 border-t border-border px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="h-9 bg-[#9f86ff] px-4 text-white hover:bg-[#8d73ef]"
                    onClick={() => insertSnippet("[开心]")}
                    type="button"
                  >
                    <Sparkles data-icon="inline-start" />
                    情绪
                  </Button>
                  <Button onClick={() => insertSnippet("<break time=\"500ms\" />")} type="button" variant="outline">
                    {"<#>"} 停顿
                  </Button>
                  <Button onClick={() => insertSnippet("嗯，")} type="button" variant="outline">
                    {"()"} 语气词
                  </Button>
                  <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
                    <span>长文模式</span>
                    <span className="inline-flex h-5 w-9 items-center rounded-full bg-secondary p-0.5">
                      <span className="size-4 rounded-full bg-muted-foreground/70" />
                    </span>
                    <span>
                      {text.length.toLocaleString("zh-CN")} / {textLimit.toLocaleString("zh-CN")} 字符
                    </span>
                    <span>
                      计费字符 {estimatedBillingCharacters.toLocaleString("zh-CN")} · 预估{" "}
                      {estimatedCredits.toLocaleString("zh-CN")} 点
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select className="max-w-[220px] bg-secondary text-muted-foreground" defaultValue="auto" name="languageDetection">
                    <option value="auto">语言检测</option>
                    <option value="zh-CN">中文</option>
                    <option value="en-US">英文</option>
                  </Select>
                  <Select className="max-w-[160px]" defaultValue="mp3" name="format">
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="opus">Opus</option>
                  </Select>
                  <Select className="max-w-[160px]" defaultValue="24000" name="sampleRate">
                    <option value="16000">16000 Hz</option>
                    <option value="24000">24000 Hz</option>
                    <option value="48000">48000 Hz</option>
                  </Select>
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-5 text-lg font-semibold">
                  <span>调试台</span>
                  <span className="text-muted-foreground">生成历史</span>
                </div>
                <Button className="h-8 px-3 text-muted-foreground" onClick={resetParameters} type="button" variant="ghost">
                  <RotateCcw data-icon="inline-start" />
                  参数重置
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold">音色</p>
                    <Select name="voiceChoice" value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)}>
                      {compatibleVoices.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {voice.name} · {voice.badge}
                        </option>
                      ))}
                      {compatibleVoices.length === 0 ? <option value={defaultVoiceValue}>v3.5 播报女声 · CosyVoice v3.5 音色模板</option> : null}
                    </Select>
                    <div className="flex gap-3 rounded-xl border border-border bg-secondary/60 p-3">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
                        <Volume2 className="size-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {selectedVoiceOption?.name ?? "龙小淳"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {selectedVoiceOption?.description ?? "CosyVoice v3.5 音色模板，适合中文旁白和课程内容。"}
                        </p>
                        <Badge className="mt-2" variant="outline">
                          {selectedVoiceOption?.badge ?? "系统示范"}
                        </Badge>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedVoiceOption?.ageCategory ? (
                            <Badge variant="muted">{selectedVoiceOption.ageCategory}</Badge>
                          ) : null}
                          {(selectedVoiceOption?.languages?.length
                            ? selectedVoiceOption.languages
                            : selectedVoiceOption?.language
                              ? [selectedVoiceOption.language]
                              : []
                          ).map((language) => (
                            <Badge key={language} variant="muted">
                              {language}
                            </Badge>
                          ))}
                          <SupportBadge label="SSML" value={selectedVoiceOption?.ssmlSupported} />
                          <SupportBadge label="Instruct" value={selectedVoiceOption?.instructSupported} />
                          <SupportBadge label="时间戳" value={selectedVoiceOption?.timestampSupported} />
                        </div>
                      </div>
                    </div>
                    {selectedVoiceOption?.previewAudioUrl ? (
                      <audio className="w-full" controls src={selectedVoiceOption.previewAudioUrl}>
                        <track kind="captions" />
                      </audio>
                    ) : (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {selectedOfficialPreset
                          ? "首次使用该 v3.5 音色模板会自动创建对应音色，生成成功后会复用到后续合成。"
                          : "当前音色暂无试听样例，提交后会直接调用阿里云相关模型生成音频。"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{selectedModelOption?.displayName ?? "默认语音合成模型"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {modelWarning ?? "已配置，可直接合成"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>

                  <RangeField label="语速" max="2" min="0.5" name="speed" onChange={setSpeed} step="0.1" value={speed} />
                  <RangeField label="声调" max="500" min="-500" name="pitch" onChange={setPitch} step="50" value={pitch} />
                  <RangeField label="音量" max="2" min="0" name="volume" onChange={setVolume} step="0.1" value={volume} />
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-6 py-4">
          {error ? (
            <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              操作失败：{error}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <VoiceResult task={currentTask} />
            <div className="flex shrink-0 items-center justify-end gap-3">
              <span className="text-sm text-muted-foreground">
                {currentUser ? "预估仅用于冻结，成功后按接口 usage.characters 结算" : "登录后可生成语音"}
              </span>
              {currentUser ? (
                <VoiceSubmitButton disabled={!canSubmit} />
              ) : (
                <Button asChild>
                  <Link href={`/login?next=${encodeURIComponent("/experience/voice")}`}>
                    <LogIn data-icon="inline-start" />
                    登录后合成
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

function defaultModelAlias(models: VoiceModelOption[]) {
  return models.find((model) => model.isConfigured)?.aliasKey ?? models[0]?.aliasKey ?? "tts-default";
}

function estimateTtsBillingCharacters(text: string) {
  let count = 0;

  for (const char of text) {
    count += (char.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
  }

  return count;
}

function estimateVoiceCredits(model: VoiceModelOption | undefined, characterCount: number) {
  if (!model || model.pricingMode !== "CHARACTERS") {
    return 0;
  }

  const pricePerUnit = Math.max(0, Number(model.inputPrice || 0));
  const creditsPerCny = Math.max(0, model.creditsPerCny || 100);
  const unitSize = model.pricingUnit === "CHARACTER" ? 1 : model.pricingUnit === "K_CHARACTERS" ? 1000 : 10000;
  const cost = (Math.max(0, characterCount) / unitSize) * pricePerUnit;

  return cost > 0 ? Math.ceil(Math.max(1, cost * creditsPerCny)) : 0;
}

function isVoiceConsoleDraft(value: unknown): value is VoiceConsoleDraft {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function RangeField({
  label,
  max,
  min,
  name,
  onChange,
  step,
  value
}: {
  label: string;
  max: string;
  min: string;
  name: string;
  onChange: (value: string) => void;
  step: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="flex items-center justify-between gap-3 text-sm font-semibold">
        {label}
        <span className="min-w-12 rounded-lg bg-secondary px-3 py-1 text-center text-sm font-medium">{value}</span>
      </span>
      <input
        className="h-2 accent-primary"
        max={max}
        min={min}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function SupportBadge({ label, value }: { label: string; value?: boolean }) {
  if (typeof value !== "boolean") {
    return null;
  }

  return (
    <Badge variant={value ? "secondary" : "outline"}>
      {label}
      {value ? "支持" : "不支持"}
    </Badge>
  );
}

function VoiceResult({ task }: { task: CurrentVoiceTask | null }) {
  if (!task) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Play className="size-4" />
        生成完成后，播放条会出现在这里。
      </div>
    );
  }

  if (task.status === "FAILED") {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <span className="font-medium text-foreground">合成失败</span>
        <span className="text-muted-foreground">{task.errorMessage ?? "语音合成失败，冻结点数已释放。"}</span>
      </div>
    );
  }

  if (!task.audioUrl) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <WandSparkles className="size-4" />
        {task.statusName}，刷新后可查看最新播放结果。
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">生成结果 · {task.voiceName}</span>
        <span className="text-muted-foreground">消耗 {task.credits.toLocaleString("zh-CN")} 点</span>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <audio className="min-w-0 flex-1" controls src={task.audioUrl}>
          <track kind="captions" />
        </audio>
        <Button asChild size="sm" variant="outline">
          <a download href={task.audioUrl}>
            <Download data-icon="inline-start" />
            下载
          </a>
        </Button>
      </div>
    </div>
  );
}

function VoiceSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit">
      <Sparkles data-icon="inline-start" />
      {pending ? "生成中..." : "生成音频"}
    </Button>
  );
}
