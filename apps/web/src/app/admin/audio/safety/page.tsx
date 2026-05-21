import Link from "next/link";
import { CheckCircle2, ShieldCheck, Trash2, XCircle } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteAdminVoiceAssetAction,
  getAdminAudioSafetySettings,
  getAdminVoiceAssets,
  reviewVoiceAssetAction,
  type AdminVoiceAsset
} from "@/lib/audio-admin-api";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (status === "READY") {
    return "secondary" as const;
  }

  if (status === "REJECTED" || status === "DISABLED" || status === "DELETED" || status === "FAILED") {
    return "muted" as const;
  }

  return "outline" as const;
}

function yesNo(value: boolean) {
  return value ? "开启" : "关闭";
}

export default async function AdminAudioSafetyPage() {
  const [settings, voices] = await Promise.all([getAdminAudioSafetySettings(), getAdminVoiceAssets()]);
  const pendingVoices = voices.filter((voice) => voice.status === "PENDING_REVIEW");
  const disabledVoices = voices.filter((voice) => ["REJECTED", "DISABLED", "DELETED"].includes(voice.status));

  return (
    <AdminShell
      active="/admin/audio/safety"
      title="语音审核"
      description="查看声音授权记录，审核复刻与设计音色，并处理违规音色。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="待审核音色" value={pendingVoices.length.toLocaleString("zh-CN")} />
          <Metric label="已处理违规" value={disabledVoices.length.toLocaleString("zh-CN")} />
          <Metric label="复刻审核开关" value={yesNo(settings.cloneReviewRequired)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>安全策略</CardTitle>
            <CardDescription>审核开关和协议文案在系统设置中维护，前台提交时会保存授权声明快照。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="声音复刻审核" value={yesNo(settings.cloneReviewRequired)} />
            <Info label="声音设计审核" value={yesNo(settings.designReviewRequired)} />
            <Info label="允许公开用户音色" value={yesNo(settings.userPublicVoiceEnabled)} />
            <Info label="复刻默认可见性" value={settings.cloneDefaultVisibility} />
            <Info label="设计默认可见性" value={settings.designDefaultVisibility} />
            <div className="rounded-md border border-border p-4 md:col-span-2 xl:col-span-3">
              <p className="text-sm text-muted-foreground">语音安全提示</p>
              <p className="mt-2 text-sm leading-6">{settings.safetyNotice}</p>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href="/admin/settings">去系统设置调整</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>音色审核与违规处理</CardTitle>
            <CardDescription>禁用或删除后不可用于新合成任务，历史任务记录保留。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>音色</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>授权记录</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>任务</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voices.length > 0 ? (
                    voices.map((voice) => <VoiceRow key={voice.id} voice={voice} />)
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        暂无自定义音色。
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
          <ShieldCheck />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function VoiceRow({ voice }: { voice: AdminVoiceAsset }) {
  const reviewFormId = `review-${voice.id}`;
  const deleteFormId = `delete-${voice.id}`;

  return (
    <TableRow>
      <TableCell className="min-w-64">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{voice.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{voice.targetModel}</span>
          <span className="text-xs text-muted-foreground">{voice.typeName} · {voice.visibility}</span>
          {voice.previewAudioUrl ? <audio className="mt-2 w-full" controls src={voice.previewAudioUrl} /> : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{voice.user.nickname}</span>
          <span className="text-xs text-muted-foreground">{voice.user.email}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-80">
        {voice.consent ? (
          <div className="flex flex-col gap-2 text-sm">
            <Badge variant="outline">{voice.consent.consentTypeName}</Badge>
            <span className="leading-6 text-muted-foreground">{voice.consent.consentText}</span>
            <span className="text-xs text-muted-foreground">
              {voice.consent.ownerName ?? "本人"} · {voice.consent.ownerContact ?? "未填写联系方式"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">暂无授权记录</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <Badge variant={statusVariant(voice.status)}>{voice.statusName}</Badge>
          {voice.disabledReason ? <span className="text-xs text-muted-foreground">{voice.disabledReason}</span> : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 text-sm">
          <span>{voice.taskCount.toLocaleString("zh-CN")} 个任务</span>
          {voice.recentTasks.map((task) => (
            <span className="text-xs text-muted-foreground" key={task.id}>
              {task.typeName} · {task.statusName}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="min-w-80">
        <div className="flex flex-col gap-4">
          <form action={reviewVoiceAssetAction} className="flex flex-col gap-3" id={reviewFormId}>
            <input name="id" type="hidden" value={voice.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${voice.id}-action`}>审核动作</FieldLabel>
                <Select id={`${voice.id}-action`} name="action" defaultValue="APPROVE">
                  <option value="APPROVE">审核通过</option>
                  <option value="REJECT">审核拒绝</option>
                  <option value="DISABLE">禁用音色</option>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${voice.id}-reason`}>原因</FieldLabel>
                <Input id={`${voice.id}-reason`} name="reason" placeholder="拒绝、禁用或补充说明" />
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit">
                <CheckCircle2 data-icon="inline-start" />
                保存审核
              </Button>
            </div>
          </form>

          <form action={deleteAdminVoiceAssetAction} className="flex flex-col gap-3" id={deleteFormId}>
            <input name="id" type="hidden" value={voice.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${voice.id}-delete-reason`}>删除原因</FieldLabel>
                <Input id={`${voice.id}-delete-reason`} name="reason" placeholder="违规、侵权或用户请求删除" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input name="confirm" type="checkbox" />
                确认删除该音色
              </label>
            </FieldGroup>
            <Button size="sm" type="submit" variant="outline">
              <Trash2 data-icon="inline-start" />
              删除
            </Button>
          </form>

          {voice.status === "PENDING_REVIEW" ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <XCircle />
              未审核通过前不可用于语音合成。
            </div>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
