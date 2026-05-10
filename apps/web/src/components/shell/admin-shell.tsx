import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

import { adminNavItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { adminLogoutAction } from "@/lib/auth-actions";

interface AdminShellProps {
  active: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminShell({ active, title, description, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-border bg-card lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Link className="font-display text-2xl font-light" href="/admin">
              AI SaaS
            </Link>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
              管理端
            </span>
          </div>
          <nav className="grid gap-1 p-4">
            {adminNavItems.map((item) => (
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  active === item.href && "bg-secondary text-foreground"
                )}
                href={item.href}
                key={item.href}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 flex-col gap-4 border-b border-border bg-background px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-normal">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-border bg-card px-4 py-2 text-sm">
                超级管理员 · admin@example.com
              </div>
              <form action={adminLogoutAction}>
                <Button variant="outline" size="sm" type="submit">
                  <LogOut data-icon="inline-start" />
                  退出登录
                </Button>
              </form>
            </div>
          </header>
          <div className="p-5 md:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
