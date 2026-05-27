"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Coins, LogIn, LogOut, UserPlus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { userLogoutAction, type PublicUser } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

interface UserAccountMenuProps {
  user: PublicUser | null;
  availableCredits?: number | null;
  loginHref?: string;
  registerHref?: string;
  className?: string;
}

export function UserAccountMenu({
  user,
  availableCredits,
  loginHref = "/login",
  registerHref,
  className
}: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.nickname?.trim() || "体验区用户";
  const accountLabel = user ? displayAccount(user) : "";
  const resolvedRegisterHref = registerHref ?? deriveRegisterHref(loginHref);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button asChild size="sm" variant="outline">
          <Link href={resolvedRegisterHref}>
            <UserPlus data-icon="inline-start" />
            注册
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={loginHref}>
            <LogIn data-icon="inline-start" />
            登录
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative z-50", className)} ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        onClick={() => setOpen((current) => !current)}
        title={displayName}
        type="button"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-12 w-[300px] overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl"
          role="menu"
        >
          <div className="border-b border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Coins className="size-4" />
                </span>
                <span className="text-sm font-semibold">剩余点数</span>
              </div>
              <Link
                className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary"
                href="/dashboard/billing"
                onClick={() => setOpen(false)}
              >
                充值
              </Link>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm text-muted-foreground">当前可用</span>
              <span className="font-display text-2xl font-medium">
                {formatCredits(availableCredits)} 点
              </span>
            </div>
          </div>

          <div className="border-b border-border p-4">
            <p className="text-xs text-muted-foreground">当前账号</p>
            <p className="mt-2 truncate text-base font-semibold">{displayName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{accountLabel}</p>
          </div>

          <div className="flex flex-col p-2 text-sm">
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary"
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <UserRound className="size-4" />
              个人信息
            </Link>
            <form action={userLogoutAction}>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary"
                role="menuitem"
                type="submit"
              >
                <LogOut className="size-4" />
                退出登录
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCredits(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("zh-CN") : "--";
}

function displayAccount(user: PublicUser) {
  if (user.phone && user.email.endsWith("@users.aisaas.local")) {
    return `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`;
  }

  return user.email;
}

function deriveRegisterHref(loginHref: string) {
  try {
    const url = new URL(loginHref, "https://local.aisaas");
    const next = url.searchParams.get("next");

    return next ? `/register?next=${encodeURIComponent(next)}` : "/register";
  } catch {
    return "/register";
  }
}
