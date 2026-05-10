import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";

import { PasswordForm, ProfileForm, LogoutPanel } from "@/components/profile/profile-forms";
import { PublicShell } from "@/components/shell/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge>个人资料</Badge>
            <h1 className="font-display text-5xl font-light leading-tight tracking-normal">
              账号与安全设置
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              修改昵称、更新密码或退出登录。邮箱作为登录账号，第一阶段暂不支持前台修改。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft data-icon="inline-start" />
              返回用户中心
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                <UserRound />
              </div>
              <CardTitle>基本资料</CardTitle>
              <CardDescription>昵称会展示在用户中心和后台用户详情中。</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={user} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                <ShieldCheck />
              </div>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>修改后下次登录请使用新密码。</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登录状态</CardTitle>
            <CardDescription>当前登录用户：{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <LogoutPanel />
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}
