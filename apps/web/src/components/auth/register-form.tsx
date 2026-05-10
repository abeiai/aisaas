"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = {};

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
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
      <Button asChild variant="outline">
        <Link href="/">返回首页</Link>
      </Button>
    </form>
  );
}
