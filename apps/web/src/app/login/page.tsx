import { AuthPanel } from "@/components/shell/auth-panel";
import { UserLoginForm } from "@/components/auth/user-login-form";

function nextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin")
    ? value
    : undefined;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = nextPath(params.next);
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <AuthPanel
      title="用户登录"
      description="使用邮箱和密码进入用户中心，继续创建 AI 任务或充值点数。"
      footer={{
        label: "还没有账号？",
        href: registerHref,
        action: "立即注册"
      }}
    >
      <UserLoginForm next={next} />
    </AuthPanel>
  );
}
