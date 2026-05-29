"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ArrowRight, Mail, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  phoneLoginAction,
  sendLoginPhoneCodeAction,
  userLoginAction,
  type AuthActionState
} from "@/lib/auth-actions";

const initialState: AuthActionState = {};

export function UserLoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [state, formAction, isPending] = useActionState(userLoginAction, initialState);
  const [phoneState, phoneFormAction, isPhonePending] = useActionState(
    phoneLoginAction,
    initialState
  );
  const [codeState, codeFormAction, isCodePending] = useActionState(
    sendLoginPhoneCodeAction,
    initialState
  );

  useEffect(() => {
    if (codeState.success) {
      setCodeCountdown(60);
    }
  }, [codeState]);

  useEffect(() => {
    if (codeCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCountdown((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCountdown]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
        <Button
          type="button"
          variant={mode === "email" ? "default" : "ghost"}
          onClick={() => setMode("email")}
        >
          <Mail data-icon="inline-start" />
          邮箱登录
        </Button>
        <Button
          type="button"
          variant={mode === "phone" ? "default" : "ghost"}
          onClick={() => setMode("phone")}
        >
          <Smartphone data-icon="inline-start" />
          手机登录
        </Button>
      </div>

      {mode === "email" ? (
        <form action={formAction} className="flex flex-col gap-6">
          {next ? <input name="next" type="hidden" value={next} /> : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input id="email" name="email" placeholder="user@example.com" type="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input id="password" name="password" placeholder="请输入密码" type="password" />
              <FieldDescription>请输入注册时设置的邮箱和密码。</FieldDescription>
            </Field>
          </FieldGroup>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button disabled={isPending} type="submit">
            {isPending ? "登录中..." : "登录到用户中心"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="-mt-2 text-sm text-muted-foreground">未注册手机号会验证后自动创建账号。</p>
          <form action={codeFormAction} className="hidden" id="login-phone-code-request">
            <input name="purpose" type="hidden" value="LOGIN" />
            <input name="phone" type="hidden" value={phone} />
          </form>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="login-phone">手机号</FieldLabel>
              <Input
                id="login-phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="请输入手机号"
              />
            </Field>
            {codeState.error ? <p className="text-sm text-destructive">{codeState.error}</p> : null}
            {codeState.success ? (
              <p className="text-sm text-muted-foreground">{codeState.success}</p>
            ) : null}
          </div>

          <form action={phoneFormAction} className="flex flex-col gap-6">
            {next ? <input name="next" type="hidden" value={next} /> : null}
            <input name="phone" type="hidden" value={phone} />
            <Field>
              <FieldLabel htmlFor="login-phone-code">验证码</FieldLabel>
              <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                <Input
                  id="login-phone-code"
                  name="code"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="请输入短信验证码"
                />
                <Button
                  disabled={isCodePending || !phone || codeCountdown > 0}
                  form="login-phone-code-request"
                  type="submit"
                  variant="outline"
                >
                  {isCodePending ? "发送中..." : codeCountdown > 0 ? `${codeCountdown}秒` : "获取验证码"}
                </Button>
              </div>
            </Field>
            {phoneState.error ? <p className="text-sm text-destructive">{phoneState.error}</p> : null}
            <Button disabled={isPhonePending || !phone} type="submit">
              {isPhonePending ? "登录中..." : "手机号登录"}
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
