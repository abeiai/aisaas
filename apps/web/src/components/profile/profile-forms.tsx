"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LogOut, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  updateProfileAction,
  userLogoutAction,
  type AuthActionState,
  type PublicUser
} from "@/lib/auth-actions";

const initialState: AuthActionState = {};

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">邮箱</FieldLabel>
          <Input id="email" value={user.email} disabled readOnly />
          <FieldDescription>邮箱用于登录，第一阶段暂不支持修改。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="nickname">昵称</FieldLabel>
          <Input
            id="nickname"
            name="nickname"
            defaultValue={user.nickname}
            maxLength={32}
            placeholder="请输入昵称"
            required
          />
        </Field>
      </FieldGroup>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}
      <Button className="w-fit" disabled={isPending} type="submit">
        <Save data-icon="inline-start" />
        {isPending ? "保存中..." : "保存资料"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">当前密码</FieldLabel>
          <Input id="currentPassword" name="currentPassword" minLength={8} type="password" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">新密码</FieldLabel>
          <Input id="newPassword" name="newPassword" minLength={8} maxLength={72} type="password" required />
          <FieldDescription>密码会在服务端哈希存储，不会明文保存。</FieldDescription>
        </Field>
      </FieldGroup>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}
      <Button className="w-fit" disabled={isPending} type="submit" variant="outline">
        <ArrowRight data-icon="inline-start" />
        {isPending ? "修改中..." : "修改密码"}
      </Button>
    </form>
  );
}

export function LogoutPanel() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-6 text-muted-foreground">
        退出后需要重新登录才能访问用户中心、账单中心和 AI 任务。
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={userLogoutAction}>
          <Button type="submit" variant="outline">
            <LogOut data-icon="inline-start" />
            退出登录
          </Button>
        </form>
        <Button asChild variant="ghost">
          <Link href="/tools">继续使用工具</Link>
        </Button>
      </div>
    </div>
  );
}
