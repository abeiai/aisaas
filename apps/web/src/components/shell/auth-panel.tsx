import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthPanelProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: {
    label: string;
    href: string;
    action: string;
  };
}

export function AuthPanel({ title, description, children, footer }: AuthPanelProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl px-5 py-10 lg:grid-cols-[1fr_440px] lg:gap-12">
        <section className="hidden flex-col justify-center gap-8 lg:flex">
          <Link className="font-display text-3xl font-light" href="/">
            AI SaaS
          </Link>
          <div className="flex max-w-2xl flex-col gap-5">
            <p className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
              简体中文工具站底座
            </p>
            <h1 className="font-display text-6xl font-light leading-tight tracking-normal">
              登录后继续使用 AI 工具
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              前台用户可进入工具列表、任务历史、点数充值和个人资料；会话通过 HTTP Cookie 保持，错误提示保持简体中文。
            </p>
          </div>
        </section>
        <section className="flex items-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {children}
              <p className="text-center text-sm text-muted-foreground">
                {footer.label}
                <Link className="ml-1 font-medium text-foreground" href={footer.href}>
                  {footer.action}
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
