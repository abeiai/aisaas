"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Mail, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  phoneLoginAction,
  registerAction,
  sendLoginPhoneCodeAction,
  type AuthActionState
} from "@/lib/auth-actions";

const initialState: AuthActionState = {};

export function RegisterForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [phoneState, phoneFormAction, isPhonePending] = useActionState(
    phoneLoginAction,
    initialState
  );
  const [codeState, codeFormAction, isCodePending] = useActionState(
    sendLoginPhoneCodeAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
        <Button
          type="button"
          variant={mode === "email" ? "default" : "ghost"}
          onClick={() => setMode("email")}
        >
          <Mail data-icon="inline-start" />
          邮箱注册
        </Button>
        <Button
          type="button"
          variant={mode === "phone" ? "default" : "ghost"}
          onClick={() => setMode("phone")}
        >
          <Smartphone data-icon="inline-start" />
          手机注册
        </Button>
      </div>

      {mode === "email" ? (
        <form action={formAction} className="flex flex-col gap-6">
          {next ? <input name="next" type="hidden" value={next} /> : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nickname">昵称</FieldLabel>
              <Input id="nickname" name="nickname" placeholder="请输入昵称" />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input id="email" name="email" placeholder="user@example.com" type="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input id="password" name="password" placeholder="至少 8 位字符" type="password" />
              <FieldDescription>密码会在服务端哈希存储，不会明文保存。</FieldDescription>
            </Field>
          </FieldGroup>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button disabled={isPending} type="submit">
            {isPending ? "创建中..." : "创建账号"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <form action={codeFormAction} className="flex flex-col gap-4">
            <input name="purpose" type="hidden" value="LOGIN" />
            <Field>
              <FieldLabel htmlFor="register-phone">手机号</FieldLabel>
              <Input
                id="register-phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="请输入手机号"
              />
              <FieldDescription>手机号验证通过后会直接创建并登录账号。</FieldDescription>
            </Field>
            {codeState.error ? <p className="text-sm text-destructive">{codeState.error}</p> : null}
            {codeState.success ? (
              <p className="text-sm text-muted-foreground">{codeState.success}</p>
            ) : null}
            <Button disabled={isCodePending || !phone} type="submit" variant="outline">
              {isCodePending ? "发送中..." : "获取验证码"}
            </Button>
          </form>

          <form action={phoneFormAction} className="flex flex-col gap-6">
            {next ? <input name="next" type="hidden" value={next} /> : null}
            <input name="phone" type="hidden" value={phone} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="phone-nickname">昵称</FieldLabel>
                <Input id="phone-nickname" name="nickname" maxLength={32} placeholder="可选" />
              </Field>
              <Field>
                <FieldLabel htmlFor="register-phone-code">验证码</FieldLabel>
                <Input
                  id="register-phone-code"
                  name="code"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="请输入短信验证码"
                />
              </Field>
            </FieldGroup>
            {phoneState.error ? <p className="text-sm text-destructive">{phoneState.error}</p> : null}
            <Button disabled={isPhonePending || !phone} type="submit">
              {isPhonePending ? "创建中..." : "创建并登录"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
        </div>
      )}

      <Button asChild variant="outline">
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
