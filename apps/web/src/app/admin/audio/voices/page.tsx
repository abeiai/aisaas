import Link from "next/link";
import { Edit3, Filter, Mic2, Power, PowerOff, RotateCcw, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteAdminSystemVoiceAction,
  deleteAdminUserVoiceQuickAction,
  getAdminSystemVoiceAssets,
  getAdminVoiceAssets,
  toggleAdminSystemVoiceEnabledAction,
  toggleAdminUserVoiceEnabledAction,
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
  const [systemVoices, userVoices] = await Promise.all([
    getAdminSystemVoiceAssets({
      keyword: query.keyword,
      status: query.status,
      language: query.language,
      model: query.model
    }),
    getAdminVoiceAssets()
  ]);
  const systemReadyCount = systemVoices.filter((voice) => voice.status === "READY").length;
  const systemDisabledCount = systemVoices.filter((voice) => voice.status === "DISABLED").length;
  const userReadyCount = userVoices.filter((voice) => voice.status === "READY").length;
  const userPendingCount = userVoices.filter((voice) => voice.status === "PENDING_REVIEW").length;

  return (
    <AdminShell
      active="/admin/audio/voices"
      title="音色库"
      description="管理官方系统音色和用户复刻、设计生成的音色。系统音色禁用后前台不再展示，也不能用于合成。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="系统可用音色" value={systemReadyCount.toLocaleString("zh-CN")} />
          <Metric label="系统禁用音色" value={systemDisabledCount.toLocaleString("zh-CN")} />
          <Metric label="用户可用音色" value={userReadyCount.toLocaleString("zh-CN")} />
          <Metric label="用户待审核" value={userPendingCount.toLocaleString("zh-CN")} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>官方系统音色</CardTitle>
            <CardDescription>
              来自阿里云 CosyVoice v3 官方音色列表。可调整后台展示信息、年龄分类和启停状态。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <SystemVoiceFilters query={query} />
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
                  {systemVoices.length > 0 ? (
                    systemVoices.map((voice) => <SystemVoiceRow key={voice.providerVoiceId} voice={voice} />)
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户音色</CardTitle>
            <CardDescription>管理用户复刻和设计生成的音色，查看授权状态并处理违规音色。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>音色名称</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>Provider voice_id</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userVoices.length > 0 ? (
                    userVoices.map((voice) => <VoiceRow key={voice.id} voice={voice} />)
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        暂无用户音色。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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

function SystemVoiceFilters({ query }: { query: Awaited<PageProps["searchParams"]> }) {
  return (
    <form className="grid gap-3 rounded-md border border-border bg-secondary/30 p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto_auto]">
      <Field>
        <FieldLabel htmlFor="keyword">搜索</FieldLabel>
        <Input
          defaultValue={query.keyword ?? ""}
          id="keyword"
          name="keyword"
          placeholder="名称、voice 参数、特质、场景"
        />
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
              <Badge key={model} variant="muted">
                来源：{model}
              </Badge>
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
              <Badge key={language} variant="muted">
                {language}
              </Badge>
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
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant={statusVariant(voice.status)}>
            {voice.statusName}
          </Badge>
          {voice.disabledReason ? <span className="text-xs text-muted-foreground">{voice.disabledReason}</span> : null}
        </div>
      </TableCell>
      <TableCell className="min-w-60 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <form action={toggleAdminSystemVoiceEnabledAction}>
            <input name="providerVoiceId" type="hidden" value={voice.providerVoiceId} />
            <input name="nextStatus" type="hidden" value={voice.status === "READY" ? "DISABLED" : "READY"} />
            <Button size="sm" type="submit" variant={voice.status === "READY" ? "outline" : "default"}>
              {voice.status === "READY" ? (
                <PowerOff data-icon="inline-start" />
              ) : (
                <Power data-icon="inline-start" />
              )}
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

function SupportBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <Badge variant={value ? "secondary" : "outline"}>
      {label}
      {value ? "支持" : "不支持"}
    </Badge>
  );
}

function VoiceRow({ voice }: { voice: AdminVoiceAsset }) {
  const isReady = voice.status === "READY";
  const isDeleted = voice.status === "DELETED";
  const canEnable = Boolean(voice.providerVoiceId) && !isDeleted;

  return (
    <TableRow>
      <TableCell className="min-w-64">
        <div className="flex flex-col gap-1">
          <Button asChild className="w-fit px-0" variant="ghost">
            <Link href={`/admin/audio/voices/${voice.id}`}>{voice.name}</Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            {voice.typeName} · {voice.visibility}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{voice.targetModel}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{voice.user.nickname}</span>
          <span className="text-xs text-muted-foreground">{voice.user.email}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{voice.providerVoiceId ?? "未生成"}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <Badge variant={statusVariant(voice.status)}>{voice.statusName}</Badge>
          {voice.reviewNote ? <span className="text-xs text-muted-foreground">{voice.reviewNote}</span> : null}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(voice.createdAt).toLocaleString("zh-CN")}
      </TableCell>
      <TableCell className="min-w-60">
        <div className="flex flex-wrap justify-end gap-2">
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
