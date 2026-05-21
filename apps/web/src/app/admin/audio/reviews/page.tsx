import Link from "next/link";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

import { AdminShell } from "@/components/shell/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminVoiceAssets,
  reviewVoiceAssetAction,
  type AdminVoiceAsset
} from "@/lib/audio-admin-api";
import { getAdminAudioSourceFileUrl } from "@/lib/audio-admin-url";

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

export default async function AdminAudioReviewsPage() {
  const voices = await getAdminVoiceAssets();
  const reviewVoices = [
    ...voices.filter((voice) => voice.status === "PENDING_REVIEW"),
    ...voices.filter((voice) => voice.status !== "PENDING_REVIEW")
  ];
  const pendingCount = voices.filter((voice) => voice.status === "PENDING_REVIEW").length;
  const approvedCount = voices.filter((voice) => voice.status === "READY").length;
  const rejectedCount = voices.filter((voice) => ["REJECTED", "DISABLED"].includes(voice.status)).length;

  return (
    <AdminShell
      active="/admin/audio/reviews"
      title="语音审核"
      description="集中处理待审核音色，查看授权声明、样本音频、用户信息和任务状态。"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="待审核" value={pendingCount.toLocaleString("zh-CN")} />
          <Metric label="已通过" value={approvedCount.toLocaleString("zh-CN")} />
          <Metric label="拒绝或禁用" value={rejectedCount.toLocaleString("zh-CN")} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>审核列表</CardTitle>
            <CardDescription>审核拒绝和禁用必须填写原因；审核通过后音色才可用于前台任务。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>音色</TableHead>
                    <TableHead>用户与授权</TableHead>
                    <TableHead>样本与预览</TableHead>
                    <TableHead>任务信息</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审核操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewVoices.length > 0 ? (
                    reviewVoices.map((voice) => <ReviewRow key={voice.id} voice={voice} />)
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        暂无需要审核的音色。
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

function ReviewRow({ voice }: { voice: AdminVoiceAsset }) {
  const sourceFileUrl = getAdminAudioSourceFileUrl(voice.sourceSampleFilePath);

  return (
    <TableRow>
      <TableCell className="min-w-60">
        <div className="flex flex-col gap-1">
          <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/audio/voices/${voice.id}`}>
            {voice.name}
          </Link>
          <span className="text-xs text-muted-foreground">{voice.typeName} · {voice.targetModel}</span>
          <span className="font-mono text-xs text-muted-foreground">{voice.providerVoiceId ?? "未生成 voice_id"}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-80">
        <div className="flex flex-col gap-2 text-sm">
          <span>{voice.user.nickname} · {voice.user.email}</span>
          {voice.consent ? (
            <>
              <Badge className="w-fit" variant="outline">{voice.consent.consentTypeName}</Badge>
              <span className="line-clamp-4 leading-6 text-muted-foreground">{voice.consent.consentText}</span>
            </>
          ) : (
            <span className="text-muted-foreground">暂无授权记录</span>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-72">
        <div className="flex flex-col gap-3">
          {voice.previewAudioUrl ? <audio className="w-full" controls src={voice.previewAudioUrl} /> : null}
          {sourceFileUrl ? (
            <Button asChild className="w-fit" size="sm" variant="outline">
              <a href={sourceFileUrl} rel="noreferrer" target="_blank">
                <ExternalLink data-icon="inline-start" />
                临时打开样本
              </a>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">无来源样本入口</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 text-sm">
          <span>{voice.taskCount.toLocaleString("zh-CN")} 个任务</span>
          {voice.recentTasks.slice(0, 3).map((task) => (
            <Link className="text-xs text-muted-foreground underline-offset-4 hover:underline" href={`/admin/audio/tasks/${task.id}`} key={task.id}>
              {task.typeName} · {task.statusName}
            </Link>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <Badge variant={statusVariant(voice.status)}>{voice.statusName}</Badge>
          {voice.reviewNote ? <span className="text-xs text-muted-foreground">{voice.reviewNote}</span> : null}
        </div>
      </TableCell>
      <TableCell className="min-w-72">
        <form action={reviewVoiceAssetAction} className="flex flex-col gap-3">
          <input name="id" type="hidden" value={voice.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${voice.id}-review-action`}>审核动作</FieldLabel>
              <Select id={`${voice.id}-review-action`} name="action" defaultValue="APPROVE">
                <option value="APPROVE">审核通过</option>
                <option value="REJECT">审核拒绝</option>
                <option value="DISABLE">禁用音色</option>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${voice.id}-review-reason`}>原因</FieldLabel>
              <Input id={`${voice.id}-review-reason`} name="reason" placeholder="拒绝或禁用时必填" />
            </Field>
          </FieldGroup>
          <Button className="w-fit" size="sm" type="submit">
            <CheckCircle2 data-icon="inline-start" />
            保存审核
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}
