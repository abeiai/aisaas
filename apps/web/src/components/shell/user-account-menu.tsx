"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Building2, Check, Coins, LogIn, LogOut, Repeat2, UserPlus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { userLogoutAction, type PublicUser } from "@/lib/auth-actions";
import { switchBillingIdentityAction, type BillingIdentity } from "@/lib/billing-identity";
import type { UserOrganizationsResult } from "@/lib/organizations-api";
import { cn } from "@/lib/utils";

interface UserAccountMenuProps {
  user: PublicUser | null;
  availableCredits?: number | null;
  billingIdentity?: BillingIdentity | null;
  loginHref?: string;
  organizations?: UserOrganizationsResult | null;
  registerHref?: string;
  className?: string;
}

export function UserAccountMenu({
  user,
  availableCredits,
  billingIdentity,
  loginHref = "/login",
  organizations,
  registerHref,
  className
}: UserAccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);
  const [identityMessage, setIdentityMessage] = useState("");
  const [isSwitchingIdentity, startIdentityTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.nickname?.trim() || "体验区用户";
  const accountLabel = user ? displayAccount(user) : "";
  const resolvedRegisterHref = registerHref ?? deriveRegisterHref(loginHref);
  const activeOrganizations = useMemo(
    () => (organizations?.enabled ? organizations.organizations.filter((organization) => organization.memberStatus === "ACTIVE") : []),
    [organizations]
  );
  const activeIdentity = billingIdentity ?? {
    type: "PERSONAL" as const,
    organizationId: null,
    label: "个人账号"
  };

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

  function switchIdentity(identity: string) {
    const formData = new FormData();
    formData.set("identity", identity);
    setIdentityMessage("");

    startIdentityTransition(async () => {
      const result = await switchBillingIdentityAction(formData);

      if (!result.ok) {
        setIdentityMessage(result.message ?? "登录身份切换失败，请稍后重试。");
        return;
      }

      setIdentityMenuOpen(false);
      setOpen(false);
      router.refresh();
    });
  }

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
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
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

          <div className="border-b border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">登录身份</p>
                <p className="mt-2 flex min-w-0 items-center gap-2 truncate text-base font-semibold">
                  {activeIdentity.type === "ORGANIZATION" ? <Building2 className="size-4 shrink-0" /> : <UserRound className="size-4 shrink-0" />}
                  <span className="truncate">{activeIdentity.label}</span>
                </p>
              </div>
              {activeOrganizations.length > 0 ? (
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60"
                  disabled={isSwitchingIdentity}
                  onClick={() => setIdentityMenuOpen((current) => !current)}
                  type="button"
                >
                  <Repeat2 className="size-3.5" />
                  切换身份
                </button>
              ) : null}
            </div>
            {identityMenuOpen ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-1">
                <IdentityOption
                  active={activeIdentity.type === "PERSONAL"}
                  disabled={isSwitchingIdentity}
                  label="个人账号"
                  onClick={() => switchIdentity("personal")}
                />
                {activeOrganizations.map((organization) => (
                  <IdentityOption
                    active={activeIdentity.organizationId === organization.id}
                    disabled={isSwitchingIdentity}
                    key={organization.id}
                    label={organization.name}
                    onClick={() => switchIdentity(`org:${organization.id}`)}
                  />
                ))}
              </div>
            ) : null}
            {identityMessage ? <p className="mt-2 text-xs text-destructive">{identityMessage}</p> : null}
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

function IdentityOption({
  active,
  disabled,
  label,
  onClick
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-60",
        active ? "bg-secondary text-foreground" : "text-muted-foreground"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{label}</span>
      {active ? <Check className="size-4 shrink-0" /> : null}
    </button>
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
