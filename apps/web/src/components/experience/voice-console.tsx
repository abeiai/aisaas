"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Sparkles,
  Volume2,
  WandSparkles,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PublicUser } from "@/lib/auth-actions";
import { cosyVoiceV35PresetPrefix } from "@/lib/cosyvoice-v35-presets";
import type { UserOrganizationsResult } from "@/lib/organizations-api";
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
  initialOrganizationId?: string;
  organizations: UserOrganizationsResult | null;
}

const textLimit = 5000;
const defaultVoiceValue = `${cosyVoiceV35PresetPrefix}announcer`;
const voiceDraftKey = "aisaas:experience-voice:draft";
const voiceRecentKey = "aisaas:experience-voice:recent";
const voiceFavoriteKey = "aisaas:experience-voice:favorite";

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
  createAction,
  initialOrganizationId = "",
  organizations
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(initialOrganizationId);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [recentVoiceValues, setRecentVoiceValues] = useState<string[]>([]);
  const [favoriteVoiceValues, setFavoriteVoiceValues] = useState<string[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

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
  const availableOrganizations = useMemo(
    () =>
      organizations?.enabled
        ? organizations.organizations.filter((organization) => organization.memberStatus === "ACTIVE")
        : [],
    [organizations]
  );
  const billingContext = selectedOrganizationId ? "ORGANIZATION" : "PERSONAL";
  const selectedModelReady = Boolean(selectedModelOption?.isConfigured);
  const selectedVoiceSupported = Boolean(
    !selectedVoiceOption?.supportedModels?.length ||
      (selectedModelOption?.modelName && selectedVoiceOption.supportedModels.includes(selectedModelOption.modelName))
  );
  const canSubmit = Boolean(currentUser && text.trim().length > 0 && selectedModelReady && selectedVoiceSupported);

  function playPreviewAudio(url: string | null | undefined) {
    previewAudioRef.current?.pause();

    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = 0;
    }

    if (!url) {
      return;
    }

    const audio = new Audio(url);
    previewAudioRef.current = audio;
    void audio.play();
  }

  function pickVoice(value: string) {
    setSelectedVoice(value);
    setVoicePickerOpen(false);
    setRecentVoiceValues((current) => {
      const next = [value, ...current.filter((item) => item !== value)].slice(0, 5);
      window.localStorage.setItem(voiceRecentKey, JSON.stringify(next));
      return next;
    });
  }

  function toggleFavoriteVoice(value: string) {
    setFavoriteVoiceValues((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [value, ...current].slice(0, 50);
      window.localStorage.setItem(voiceFavoriteKey, JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    setSelectedOrganizationId(initialOrganizationId);
  }, [initialOrganizationId]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(voiceRecentKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        setRecentVoiceValues(stored.filter((item): item is string => typeof item === "string").slice(0, 5));
      }
    } catch {
      window.localStorage.removeItem(voiceRecentKey);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(voiceFavoriteKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        setFavoriteVoiceValues(stored.filter((item): item is string => typeof item === "string").slice(0, 50));
      }
    } catch {
      window.localStorage.removeItem(voiceFavoriteKey);
    }
  }, []);

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

  useEffect(() => {
    if (!selectedOrganizationId || availableOrganizations.some((organization) => organization.id === selectedOrganizationId)) {
      return;
    }

    setSelectedOrganizationId("");
  }, [availableOrganizations, selectedOrganizationId]);

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
        <input name="billingContext" type="hidden" value={billingContext} />
        {selectedOrganizationId ? <input name="organizationId" type="hidden" value={selectedOrganizationId} /> : null}
        <header className="flex h-[86px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
              <Headphones className="size-7" />
              文字转语音
            </h1>
            <p className="text-sm text-muted-foreground">体验区 · 语音合成</p>
          </div>
          <div className="flex min-w-[220px] max-w-[260px] flex-1 items-end justify-end gap-3">
            {currentUser && availableOrganizations.length > 0 ? (
              <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground">
                使用空间
                <Select value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)}>
                  <option value="">个人空间</option>
                  {availableOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
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
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-6 py-4">
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
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
                  <span>
                    {text.length.toLocaleString("zh-CN")} / {textLimit.toLocaleString("zh-CN")} 字符
                  </span>
                  <span>
                    计费字符 {estimatedBillingCharacters.toLocaleString("zh-CN")} · 预估{" "}
                    {estimatedCredits.toLocaleString("zh-CN")} 点
                  </span>
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-2 text-sm font-semibold">
                      模型
                      <Select name="modelAlias" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
                        {models.map((model) => (
                          <option key={model.aliasKey} value={model.aliasKey}>
                            {model.displayName} · {model.providerName ?? "语音模型"}
                          </option>
                        ))}
                        {models.length === 0 ? <option value="tts-default">默认语音合成模型 · 登录后加载</option> : null}
                      </Select>
                    </label>

                    <input name="voiceChoice" type="hidden" value={selectedVoice} />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold">语音</p>
                      <button
                        className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-input bg-card px-4 py-3 text-left outline-none transition-colors hover:bg-secondary focus:border-foreground focus:ring-[3px] focus:ring-ring/10"
                        onClick={() => setVoicePickerOpen(true)}
                        type="button"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                          <Volume2 className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-medium">{selectedVoiceOption?.name ?? "龙小淳"}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {selectedVoiceOption?.badge ?? "系统示范"}
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                      </button>
                    </div>
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
      {voicePickerOpen ? (
        <VoicePickerModal
          onClose={() => setVoicePickerOpen(false)}
          onPick={pickVoice}
          onPreview={playPreviewAudio}
          onToggleFavorite={toggleFavoriteVoice}
          favoriteVoiceValues={favoriteVoiceValues}
          recentVoiceValues={recentVoiceValues}
          selectedVoice={selectedVoice}
          voices={compatibleVoices}
        />
      ) : null}
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

function VoicePickerModal({
  favoriteVoiceValues,
  onClose,
  onPick,
  onPreview,
  onToggleFavorite,
  recentVoiceValues,
  selectedVoice,
  voices
}: {
  favoriteVoiceValues: string[];
  onClose: () => void;
  onPick: (value: string) => void;
  onPreview: (url: string | null | undefined) => void;
  onToggleFavorite: (value: string) => void;
  recentVoiceValues: string[];
  selectedVoice: string;
  voices: VoiceOption[];
}) {
  const [tab, setTab] = useState<"library" | "mine" | "favorite">("library");
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("all");
  const [gender, setGender] = useState("all");
  const [age, setAge] = useState("all");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [supportFilters, setSupportFilters] = useState({ ssml: false, instruct: false, timestamp: false });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const languageOptions = useMemo(() => uniqueValues(voices.flatMap((voice) => voice.languages?.length ? voice.languages : voice.language ? [voice.language] : [])), [voices]);
  const ageOptions = useMemo(() => uniqueValues(voices.map((voice) => voice.ageCategory).filter(Boolean)), [voices]);
  const tagOptions = useMemo(() => uniqueValues(voices.flatMap(voiceTags)).slice(0, 24), [voices]);
  const filteredVoices = useMemo(() => {
    const base =
      tab === "mine"
        ? voices.filter(isUserVoice)
        : tab === "favorite"
          ? uniqueValues([...favoriteVoiceValues, ...recentVoiceValues])
              .map((value) => voices.find((voice) => voice.value === value))
              .filter((voice): voice is VoiceOption => Boolean(voice))
          : voices;
    const query = keyword.trim().toLowerCase();

    return base.filter((voice) => {
      const searchable = [voice.name, voice.description, voice.badge, voice.trait, voice.scene, ...(voice.languages ?? []), voice.language]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const voiceLanguages = voice.languages?.length ? voice.languages : voice.language ? [voice.language] : [];

      return (
        (!query || searchable.includes(query)) &&
        (language === "all" || voiceLanguages.includes(language)) &&
        (gender === "all" || inferVoiceGender(voice) === gender) &&
        (age === "all" || voice.ageCategory === age) &&
        (!supportFilters.ssml || voice.ssmlSupported === true) &&
        (!supportFilters.instruct || voice.instructSupported === true) &&
        (!supportFilters.timestamp || voice.timestampSupported === true) &&
        selectedTags.every((tag) => voiceTags(voice).includes(tag))
      );
    });
  }, [age, favoriteVoiceValues, gender, keyword, language, recentVoiceValues, selectedTags, supportFilters, tab, voices]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-5xl flex-col rounded-3xl border border-border bg-card shadow-xl" role="dialog" aria-modal="true">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">音色选择</h2>
            <p className="mt-1 text-sm text-muted-foreground">从当前模型兼容的音色中选择一个用于合成。</p>
          </div>
          <Button aria-label="关闭音色选择" className="size-10 px-0" onClick={onClose} type="button" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex shrink-0 flex-col gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["library", "音色库"],
              ["mine", "我的音色"],
              ["favorite", "收藏音色"]
            ].map(([value, label]) => (
              <button
                className={cn("rounded-full px-4 py-2 text-sm font-medium", tab === value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}
                key={value}
                onClick={() => setTab(value as typeof tab)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(180px,1fr)_140px_120px_120px_120px_88px]">
            <input
              className="h-10 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-foreground"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索音色名称、标签或描述"
              value={keyword}
            />
            <FilterSelect label="按语种" value={language} onChange={setLanguage} options={languageOptions} />
            <FilterSelect label="按性别" value={gender} onChange={setGender} options={["女声", "男声"]} />
            <FilterSelect label="按年龄" value={age} onChange={setAge} options={ageOptions} />
            <div className="relative">
              <Button className="w-full" onClick={() => setTagPickerOpen((current) => !current)} type="button" variant="outline">
                按标签
              </Button>
              {tagPickerOpen ? (
                <div className="absolute right-0 top-12 z-10 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl">
                  <div className="grid gap-2 text-sm">
                    <CheckboxFilter checked={supportFilters.ssml} label="支持 SSML" onChange={(checked) => setSupportFilters((current) => ({ ...current, ssml: checked }))} />
                    <CheckboxFilter checked={supportFilters.instruct} label="支持 Instruct" onChange={(checked) => setSupportFilters((current) => ({ ...current, instruct: checked }))} />
                    <CheckboxFilter checked={supportFilters.timestamp} label="支持时间戳" onChange={(checked) => setSupportFilters((current) => ({ ...current, timestamp: checked }))} />
                  </div>
                  <div className="mt-4 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                    {tagOptions.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          className={cn("rounded-full border px-3 py-1.5 text-xs", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}
                          key={tag}
                          onClick={() => setSelectedTags((current) => active ? current.filter((item) => item !== tag) : [...current, tag])}
                          type="button"
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <Button onClick={() => setTagPickerOpen(false)} type="button">
              查找
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex flex-col gap-3 pt-4">
            {filteredVoices.map((voice) => {
              const selected = voice.value === selectedVoice;
              const favorited = favoriteVoiceValues.includes(voice.value);

              return (
                <div
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-secondary"
                  )}
                  key={voice.value}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Volume2 className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{voice.name}</span>
                    <span className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {voice.description ?? "暂无描述"}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button disabled={!voice.previewAudioUrl} onClick={() => onPreview(voice.previewAudioUrl)} type="button" variant="outline">
                      试听
                    </Button>
                    <Button onClick={() => onToggleFavorite(voice.value)} type="button" variant={favorited ? "default" : "outline"}>
                      {favorited ? "已收藏" : "收藏"}
                    </Button>
                    <button
                      className={cn("rounded-full px-5 py-2 text-sm font-medium", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}
                      onClick={() => onPick(voice.value)}
                      type="button"
                    >
                    {selected ? "已选" : "选择"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredVoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                没有符合条件的音色。
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <Select className="h-10 rounded-full" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="all">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}

function CheckboxFilter({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function voiceTags(voice: VoiceOption) {
  return uniqueValues([voice.badge, voice.trait, voice.scene, voice.ageCategory, ...(voice.languages ?? []), voice.language]);
}

function isUserVoice(voice: VoiceOption) {
  return voice.value.startsWith("voice:") && !voice.badge.startsWith("平台");
}

function inferVoiceGender(voice: VoiceOption) {
  const text = `${voice.name} ${voice.description ?? ""} ${voice.trait ?? ""}`.toLowerCase();

  if (/[女媛姐娘]/.test(text) || text.includes("female")) {
    return "女声";
  }

  if (/[男叔哥爷]/.test(text) || text.includes("male")) {
    return "男声";
  }

  return "";
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
