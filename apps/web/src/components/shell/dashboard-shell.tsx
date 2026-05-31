import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenText,
  Building2,
  Coins,
  FileText,
  LayoutDashboard,
  Mic2,
  UserRound,
  type LucideIcon
} from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { UserAccountMenu } from "@/components/shell/user-account-menu";
import { getCurrentUser } from "@/lib/auth-actions";
import { getCurrentBillingIdentity } from "@/lib/billing-identity";
import { getWallet } from "@/lib/billing-api";
import { getUserOrganizations } from "@/lib/organizations-api";
import { cn } from "@/lib/utils";

export type DashboardNavKey =
  | "overview"
  | "ai"
  | "knowledge"
  | "tasks"
  | "voices"
  | "billing"
  | "organizations"
  | "profile";

type DashboardNavItem = {
  key: DashboardNavKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

const dashboardNavItems: DashboardNavItem[] = [
  {
    key: "overview",
    href: "/dashboard",
    label: "概览",
    icon: LayoutDashboard
  },
  {
    key: "knowledge",
    href: "/dashboard/knowledge",
    label: "知识库",
    icon: BookOpenText
  },
  {
    key: "tasks",
    href: "/dashboard/tasks",
    label: "任务历史",
    icon: FileText
  },
  {
    key: "voices",
    href: "/dashboard/voices",
    label: "我的音色",
    icon: Mic2
  },
  {
    key: "billing",
    href: "/dashboard/billing",
    label: "账单中心",
    icon: Coins
  },
  {
    key: "organizations",
    href: "/dashboard/organizations",
    label: "企业空间",
    icon: Building2
  },
  {
    key: "profile",
    href: "/dashboard/profile",
    label: "个人资料",
    icon: UserRound
  }
];

export async function DashboardShell({
  active,
  children
}: Readonly<{ active: DashboardNavKey; children: ReactNode }>) {
  const [user, wallet, organizationResult] = await Promise.all([
    getCurrentUser(),
    getWallet().catch(() => null),
    getUserOrganizations().catch(() => null)
  ]);
  const billingIdentity = await getCurrentBillingIdentity(organizationResult);
  const billingOrganization =
    billingIdentity.type === "ORGANIZATION"
      ? organizationResult?.organizations.find((organization) => organization.id === billingIdentity.organizationId)
      : null;
  const displayedCredits =
    billingIdentity.type === "ORGANIZATION"
      ? billingOrganization?.quota.remainingQuota ?? billingOrganization?.wallet?.balanceAvailable ?? null
      : wallet?.availableCredits ?? null;
  const visibleNavItems = dashboardNavItems.filter(
    (item) => item.key !== "organizations" || organizationResult?.enabled
  );
  const activeItem = visibleNavItems.find((item) => item.key === active);

  return (
    <PublicShell showFooter={false} showHeader={false}>
      <div className="grid w-full md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card/60 md:min-h-screen md:border-b-0 md:border-r">
          <div className="sticky top-0 flex flex-col gap-5 px-4 py-5">
            <div className="flex flex-col gap-1 px-2">
              <p className="text-lg font-semibold">用户中心</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;

                return (
                  <Link
                    className={cn(
                      "flex min-w-[136px] items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm transition-colors md:min-w-0",
                      isActive
                        ? "border-border bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                    href={item.href}
                    key={item.key}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <Icon className="size-4" />
                    </span>
                    <span className="truncate font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-5 backdrop-blur">
            <h1 className="truncate text-xl font-semibold tracking-normal">
              {activeItem?.label ?? "用户中心"}
            </h1>
            <UserAccountMenu
              availableCredits={displayedCredits}
              billingIdentity={billingIdentity}
              organizations={organizationResult}
              user={user}
            />
          </header>
          {children}
        </div>
      </div>
    </PublicShell>
  );
}
