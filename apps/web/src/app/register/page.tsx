import { RegisterForm } from "@/components/auth/register-form";
import { AuthPanel } from "@/components/shell/auth-panel";

function nextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin")
    ? value
    : undefined;
}

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = nextPath(params.next);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthPanel
      title="用户注册"
      description="支持邮箱密码注册和手机验证码注册，注册后可直接进入体验区、任务历史和点数充值。"
      footer={{
        label: "已经有账号？",
        href: loginHref,
        action: "去登录"
      }}
    >
      <RegisterForm next={next} />
    </AuthPanel>
  );
}
