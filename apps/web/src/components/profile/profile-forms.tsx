"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, LogOut, Save, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionToast } from "@/components/ui/action-toast";
import {
  bindPhoneAction,
  changePasswordAction,
  sendBindPhoneCodeAction,
  updateProfileAction,
  userLogoutAction,
  type AuthActionState,
  type PublicUser
} from "@/lib/auth-actions";

const initialState: AuthActionState = {};

function displayEmail(email: string) {
  return email.endsWith("@users.aisaas.local") ? "未绑定邮箱（手机号注册）" : email;
}

function maskPhone(phone: string | null) {
  if (!phone) {
    return "未绑定";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ActionToast state={state} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">邮箱</FieldLabel>
          <Input id="email" value={displayEmail(user.email)} disabled readOnly />
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
      <Button className="w-fit" disabled={isPending} type="submit">
        <Save data-icon="inline-start" />
        {isPending ? "保存中..." : "保存资料"}
      </Button>
    </form>
  );
}

export function BindPhoneForm({ user }: { user: PublicUser }) {
  const [phone, setPhone] = useState(user.phone ?? "");
  const [codeState, codeFormAction, isCodePending] = useActionState(
    sendBindPhoneCodeAction,
    initialState
  );
  const [bindState, bindFormAction, isBindPending] = useActionState(bindPhoneAction, initialState);

  return (
    <div className="flex flex-col gap-6">
      <ActionToast state={codeState} />
      <ActionToast state={bindState} />
      <div className="rounded-lg border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        当前绑定手机号：<span className="font-medium text-foreground">{maskPhone(user.phone)}</span>
      </div>

      <form action={codeFormAction} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="bind-phone">手机号</FieldLabel>
          <Input
            id="bind-phone"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            placeholder="请输入要绑定的手机号"
          />
          <FieldDescription>绑定后可使用手机号验证码登录。</FieldDescription>
        </Field>
        <Button className="w-fit" disabled={isCodePending || !phone} type="submit" variant="outline">
          <Smartphone data-icon="inline-start" />
          {isCodePending ? "发送中..." : "获取验证码"}
        </Button>
      </form>

      <form action={bindFormAction} className="flex flex-col gap-4">
        <input name="phone" type="hidden" value={phone} />
        <Field>
          <FieldLabel htmlFor="bind-phone-code">验证码</FieldLabel>
          <Input
            id="bind-phone-code"
            name="code"
            inputMode="numeric"
            maxLength={8}
            placeholder="请输入短信验证码"
          />
          <FieldDescription>本地默认验证码为 199599。</FieldDescription>
        </Field>
        <Button className="w-fit" disabled={isBindPending || !phone} type="submit">
          <Save data-icon="inline-start" />
          {isBindPending ? "绑定中..." : "绑定手机号"}
        </Button>
      </form>
    </div>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ActionToast state={state} />
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
          <Link href="/experience/chat">继续体验</Link>
        </Button>
      </div>
    </div>
  );
}
