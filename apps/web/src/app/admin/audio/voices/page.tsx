import Link from "next/link";
import { CheckCircle2, Edit3, Filter, Mic2, Plus, Power, PowerOff, RotateCcw, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createAdminPlatformVoiceAction,
  deleteAdminSystemVoiceAction,
  deleteAdminUserVoiceQuickAction,
  getAdminAudioModels,
  getAdminSystemVoiceAssets,
  getAdminVoiceAssets,
  toggleAdminSystemVoiceEnabledAction,
  toggleAdminUserVoiceEnabledAction,
  type AdminAudioModel,
  type AdminSystemVoiceAsset,
  type AdminVoiceAsset
} from "@/lib/audio-admin-api";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    keyword?: string;
    status?: string;
    language?: string;
    model?: string;
    create?: "platform-clone" | "platform-design";
  }>;
}

function statusVariant(status: string) {
  if (status === "READY") {
    return "secondary" as const;
  }

  if (status === "REJECTED" || status === "DISABLED" || status === "DELETED" || status === "FAILED") {
    return "muted" as const;
  }

  return "outline" as const;
}

export default async function AdminAudioVoicesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const [systemVoices, voiceAssets, audioModels] = await Promise.all([
    getAdminSystemVoiceAssets({
      keyword: query.keyword,
      status: query.status,
      language: query.language,
      model: query.model
    }),
    getAdminVoiceAssets(),
    getAdminAudioModels()
  ]);
  const activeVoiceAssets = voiceAssets.filter((voice) => voice.status !== "DELETED");
  const platformClonedVoices = activeVoiceAssets.filter((voice) => voice.isPlatform && voice.type === "CLONED");
  const platformDesignedVoices = activeVoiceAssets.filter((voice) => voice.isPlatform && voice.type === "DESIGNED");
  const userClonedVoices = activeVoiceAssets.filter((voice) => !voice.isPlatform && voice.type === "CLONED");
  const userDesignedVoices = activeVoiceAssets.filter((voice) => !voice.isPlatform && voice.type === "DESIGNED");
  const pendingUserVoiceCount = [...userClonedVoices, ...userDesignedVoices].filter(
    (voice) => voice.status === "PENDING_REVIEW"
  ).length;
  const readyPublicVoiceCount =
    systemVoices.filter((voice) => voice.status === "READY").length +
    platformClonedVoices.filter((voice) => voice.status === "READY").length +
    platformDesignedVoices.filter((voice) => voice.status === "READY").length;

  return (
    <AdminShell
      active="/admin/audio/voices"
      title="音色库"
      description="统一管理系统音色、平台音色和用户音色。平台音色对所有用户可选，用户音色只对本人可选。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="公共可用音色" value={readyPublicVoiceCount.toLocaleString("zh-CN")} />
          <Metric label="平台复刻音色" value={platformClonedVoices.length.toLocaleString("zh-CN")} />
          <Metric label="平台设计音色" value={platformDesignedVoices.length.toLocaleString("zh-CN")} />
          <Metric label="用户待审核" value={pendingUserVoiceCount.toLocaleString("zh-CN")} />
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle>平台音色</CardTitle>
              <CardDescription>平台复刻和平台设计音色可像系统音色一样被前台用户选择。</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={query.create === "platform-clone" ? "default" : "outline"}>
                <Link href="/admin/audio/voices?create=platform-clone">
                  <Plus data-icon="inline-start" />
                  平台音色复刻
                </Link>
              </Button>
              <Button asChild variant={query.create === "platform-design" ? "default" : "outline"}>
                <Link href="/admin/audio/voices?create=platform-design">
                  <Plus data-icon="inline-start" />
                  平台音色设计
                </Link>
              </Button>
            </div>
          </CardHeader>
          {query.create ? (
            <CardContent>
              <PlatformVoiceForm createType={query.create} models={audioModels} />
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统音色</CardTitle>
            <CardDescription>直接引入模型提供方的官方音色，只支持启用、禁用和展示信息编辑。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <SystemVoiceFilters query={query} />
            <SystemVoiceTable voices={systemVoices} />
          </CardContent>
        </Card>

        <VoiceAssetSection
          description="管理员添加的复刻音色，对所有用户开放选择。"
          emptyText="暂无平台复刻音色。"
          scope="platform"
          title="平台复刻音色"
          voices={platformClonedVoices}
        />
        <VoiceAssetSection
          description="管理员添加的设计音色，对所有用户开放选择。"
          emptyText="暂无平台设计音色。"
          scope="platform"
          title="平台设计音色"
          voices={platformDesignedVoices}
        />
        <VoiceAssetSection
          description="用户通过前台声音复刻创建，只能被创建者本人选用。"
          emptyText="暂无用户复刻音色。"
          scope="user"
          title="用户复刻音色"
          voices={userClonedVoices}
        />
        <VoiceAssetSection
          description="用户通过前台声音设计创建，只能被创建者本人选用。"
          emptyText="暂无用户设计音色。"
          scope="user"
          title="用户设计音色"
          voices={userDesignedVoices}
        />
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <Mic2 />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function PlatformVoiceForm({ createType, models }: { createType: "platform-clone" | "platform-design"; models: AdminAudioModel[] }) {
  const type = createType === "platform-clone" ? "CLONED" : "DESIGNED";
  const ttsModels = models.filter((model) => model.supportsTts);

  return (
    <form action={createAdminPlatformVoiceAction} className="grid gap-4 rounded-md border border-border bg-secondary/30 p-4 lg:grid-cols-3">
      <input name="type" type="hidden" value={type} />
      <Field>
        <FieldLabel htmlFor="platform-voice-name">显示名称</FieldLabel>
        <Input id="platform-voice-name" name="name" placeholder={type === "CLONED" ? "例如：平台复刻男声" : "例如：平台设计旁白"} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="platform-provider-voice-id">Provider voice_id</FieldLabel>
        <Input id="platform-provider-voice-id" name="providerVoiceId" placeholder="例如：longanhuan 或后台复刻生成的 voice_id" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="platform-model">绑定语音模型</FieldLabel>
        <Select id="platform-model" name="modelInstanceId" required>
          <option value="">选择支持 TTS 的模型</option>
          {ttsModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName} · {model.modelName}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="platform-language">语言</FieldLabel>
        <Input id="platform-language" name="language" placeholder="例如：普通话、美式英语" />
      </Field>
      <Field>
        <FieldLabel htmlFor="platform-preview">试听音频 URL</FieldLabel>
        <Input id="platform-preview" name="previewAudioUrl" placeholder="可选，填写可公开访问的试听地址" />
      </Field>
      <Field className="lg:col-span-3">
        <FieldLabel htmlFor="platform-description">描述</FieldLabel>
        <Textarea id="platform-description" name="description" placeholder="音色特征、适用场景和使用说明" rows={3} />
      </Field>
      <div className="flex justify-end gap-2 lg:col-span-3">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/audio/voices">取消</Link>
        </Button>
        <Button disabled={ttsModels.length === 0} type="submit">
          <CheckCircle2 data-icon="inline-start" />
          保存{type === "CLONED" ? "平台复刻音色" : "平台设计音色"}
        </Button>
      </div>
    </form>
  );
}

function SystemVoiceFilters({ query }: { query: Awaited<PageProps["searchParams"]> }) {
  return (
    <form className="grid gap-3 rounded-md border border-border bg-secondary/30 p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto_auto]">
      <Field>
        <FieldLabel htmlFor="keyword">搜索</FieldLabel>
        <Input defaultValue={query.keyword ?? ""} id="keyword" name="keyword" placeholder="名称、voice 参数、特质、场景" />
      </Field>
      <Field>
        <FieldLabel htmlFor="status">状态</FieldLabel>
        <Select defaultValue={query.status ?? ""} id="status" name="status">
          <option value="">全部状态</option>
          <option value="READY">可用</option>
          <option value="DISABLED">已禁用</option>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="language">语言</FieldLabel>
        <Select defaultValue={query.language ?? ""} id="language" name="language">
          <option value="">全部语言</option>
          <option value="普通话">普通话</option>
          <option value="粤语">粤语</option>
          <option value="闽南语">闽南语</option>
          <option value="英式英语">英式英语</option>
          <option value="美式英语">美式英语</option>
          <option value="日语">日语</option>
          <option value="韩语">韩语</option>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="model">模型</FieldLabel>
        <Select defaultValue={query.model ?? ""} id="model" name="model">
          <option value="">全部模型</option>
          <option value="cosyvoice-v3-flash">cosyvoice-v3-flash</option>
          <option value="cosyvoice-v3-plus">cosyvoice-v3-plus</option>
        </Select>
      </Field>
      <div className="flex items-end">
        <Button className="w-full" type="submit">
          <Filter data-icon="inline-start" />
          筛选
        </Button>
      </div>
      <div className="flex items-end">
        <Button asChild className="w-full" variant="outline">
          <Link href="/admin/audio/voices">
            <RotateCcw data-icon="inline-start" />
            重置
          </Link>
        </Button>
      </div>
    </form>
  );
}

function SystemVoiceTable({ voices }: { voices: AdminSystemVoiceAsset[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>音色</TableHead>
            <TableHead>语言与能力</TableHead>
            <TableHead>试听</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {voices.length > 0 ? (
            voices.map((voice) => <SystemVoiceRow key={voice.providerVoiceId} voice={voice} />)
          ) : (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={5}>
                没有匹配的系统音色。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SystemVoiceRow({ voice }: { voice: AdminSystemVoiceAsset }) {
  return (
    <TableRow>
      <TableCell className="min-w-72 align-top">
        <div className="flex flex-col gap-2">
          <div>
            <p className="font-medium">{voice.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{voice.providerVoiceId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{voice.targetModel}</Badge>
            {voice.sourceModels.map((model) => (
              <Badge key={model} variant="muted">来源：{model}</Badge>
            ))}
            {voice.isCustomized ? <Badge variant="secondary">已自定义</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{voice.description}</p>
        </div>
      </TableCell>
      <TableCell className="min-w-64 align-top">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {voice.ageCategory ? <Badge variant="outline">{voice.ageCategory}</Badge> : null}
            {voice.languages.map((language) => (
              <Badge key={language} variant="muted">{language}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <SupportBadge label="SSML" value={voice.ssmlSupported} />
            <SupportBadge label="Instruct" value={voice.instructSupported} />
            <SupportBadge label="时间戳" value={voice.timestampSupported} />
          </div>
          <p className="text-xs text-muted-foreground">
            {voice.scene} · {voice.trait} · 官方年龄：{voice.age}
          </p>
        </div>
      </TableCell>
      <TableCell className="min-w-64 align-top">
        <audio className="w-full" controls src={voice.previewAudioUrl}>
          <track kind="captions" />
        </audio>
      </TableCell>
      <TableCell className="min-w-36 align-top">
        <VoiceStatus status={voice.status} statusName={voice.statusName} note={voice.disabledReason} />
      </TableCell>
      <TableCell className="min-w-60 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <form action={toggleAdminSystemVoiceEnabledAction}>
            <input name="providerVoiceId" type="hidden" value={voice.providerVoiceId} />
            <input name="nextStatus" type="hidden" value={voice.status === "READY" ? "DISABLED" : "READY"} />
            <Button size="sm" type="submit" variant={voice.status === "READY" ? "outline" : "default"}>
              {voice.status === "READY" ? <PowerOff data-icon="inline-start" /> : <Power data-icon="inline-start" />}
              {voice.status === "READY" ? "停用" : "启用"}
            </Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/audio/voices/system/${voice.providerVoiceId}/edit`}>
              <Edit3 data-icon="inline-start" />
              编辑
            </Link>
          </Button>
          <form action={deleteAdminSystemVoiceAction}>
            <input name="providerVoiceId" type="hidden" value={voice.providerVoiceId} />
            <Button size="sm" type="submit" variant="outline">
              <Trash2 data-icon="inline-start" />
              删除
            </Button>
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}

function VoiceAssetSection({
  description,
  emptyText,
  scope,
  title,
  voices
}: {
  description: string;
  emptyText: string;
  scope: "platform" | "user";
  title: string;
  voices: AdminVoiceAsset[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>音色</TableHead>
                <TableHead>归属</TableHead>
                <TableHead>Provider voice_id</TableHead>
                <TableHead>试听</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voices.length > 0 ? (
                voices.map((voice) => <VoiceAssetRow key={voice.id} scope={scope} voice={voice} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>{emptyText}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function VoiceAssetRow({ scope, voice }: { scope: "platform" | "user"; voice: AdminVoiceAsset }) {
  const isReady = voice.status === "READY";
  const isDeleted = voice.status === "DELETED";
  const canEnable = Boolean(voice.providerVoiceId) && !isDeleted;

  return (
    <TableRow>
      <TableCell className="min-w-64 align-top">
        <div className="flex flex-col gap-1">
          <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/audio/voices/${voice.id}`}>
            {voice.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {scope === "platform" ? (voice.type === "CLONED" ? "平台复刻音色" : "平台设计音色") : voice.typeName} · {voice.targetModel}
          </span>
          {voice.description ? <span className="line-clamp-2 text-xs text-muted-foreground">{voice.description}</span> : null}
        </div>
      </TableCell>
      <TableCell className="min-w-52 align-top">
        {scope === "platform" ? (
          <Badge variant="secondary">平台公共</Badge>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            <span>{voice.user.nickname}</span>
            <span className="text-xs text-muted-foreground">{voice.user.email}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-64 break-all font-mono text-xs align-top">{voice.providerVoiceId ?? "未生成"}</TableCell>
      <TableCell className="min-w-56 align-top">
        {voice.previewAudioUrl ? (
          <audio className="w-full" controls src={voice.previewAudioUrl}>
            <track kind="captions" />
          </audio>
        ) : (
          <span className="text-sm text-muted-foreground">暂无试听</span>
        )}
      </TableCell>
      <TableCell className="min-w-40 align-top">
        <VoiceStatus status={voice.status} statusName={voice.statusName} note={voice.reviewNote ?? voice.disabledReason} />
      </TableCell>
      <TableCell className="min-w-72 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          {scope === "user" ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/audio/voices/${voice.id}`}>
                <CheckCircle2 data-icon="inline-start" />
                审核
              </Link>
            </Button>
          ) : null}
          <form action={toggleAdminUserVoiceEnabledAction}>
            <input name="id" type="hidden" value={voice.id} />
            <input name="action" type="hidden" value={isReady ? "DISABLE" : "APPROVE"} />
            <Button disabled={!isReady && !canEnable} size="sm" type="submit" variant={isReady ? "outline" : "default"}>
              {isReady ? <PowerOff data-icon="inline-start" /> : <Power data-icon="inline-start" />}
              {isReady ? "停用" : "启用"}
            </Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/audio/voices/${voice.id}`}>
              <Edit3 data-icon="inline-start" />
              编辑
            </Link>
          </Button>
          <form action={deleteAdminUserVoiceQuickAction}>
            <input name="id" type="hidden" value={voice.id} />
            <Button disabled={isDeleted} size="sm" type="submit" variant="outline">
              <Trash2 data-icon="inline-start" />
              删除
            </Button>
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}

function VoiceStatus({ note, status, statusName }: { note?: string | null; status: string; statusName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Badge className="w-fit" variant={statusVariant(status)}>{statusName}</Badge>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}

function SupportBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <Badge variant={value ? "secondary" : "outline"}>
      {label}
      {value ? "支持" : "不支持"}
    </Badge>
  );
}
