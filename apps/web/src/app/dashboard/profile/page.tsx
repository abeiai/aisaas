import { ShieldCheck, Smartphone, UserRound } from "lucide-react";

import {
  BindPhoneForm,
  PasswordForm,
  ProfileForm
} from "@/components/profile/profile-forms";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell active="profile">
      <section className="flex w-full flex-col gap-8 px-5 py-8">
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

          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                <Smartphone />
              </div>
              <CardTitle>绑定手机</CardTitle>
              <CardDescription>邮箱注册用户也可以绑定手机号，用验证码登录。</CardDescription>
            </CardHeader>
            <CardContent>
              <BindPhoneForm user={user} />
            </CardContent>
          </Card>
        </div>
      </section>
    </DashboardShell>
  );
}
