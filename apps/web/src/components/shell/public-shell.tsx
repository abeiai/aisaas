import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { UserAccountMenu } from "@/components/shell/user-account-menu";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getCurrentBillingIdentity } from "@/lib/billing-identity";
import { getWallet } from "@/lib/billing-api";
import {
  getMenuByLocation,
  isExternalHref,
  menuItemsToNavTree,
  parseSiteMenuConfig,
  type NavMenuItem
} from "@/lib/menu-config";
import { getUserOrganizations } from "@/lib/organizations-api";
import { getPublicSystemConfigs } from "@/lib/settings-api";
import { getThemeTemplate, themeTemplateStyle } from "@/lib/theme-templates";
import { cn } from "@/lib/utils";

const defaultNavItems = [
  { href: "/", label: "首页" },
  { href: "/features", label: "功能" },
  { href: "/use-cases", label: "场景" },
  { href: "/pricing", label: "价格" },
  { href: "/articles", label: "文章" },
  { href: "/dashboard", label: "用户中心" }
];

const defaultFooterLinks = [
  { href: "/features", label: "产品功能" },
  { href: "/use-cases", label: "使用场景" },
  { href: "/pricing", label: "价格方案" },
  { href: "/articles", label: "文章列表" },
  { href: "/pages/about", label: "关于我们" }
];

export async function PublicShell({
  children,
  showHeader = true,
  showFooter = true
}: Readonly<{ children: ReactNode; showHeader?: boolean; showFooter?: boolean }>) {
  const [configs, user] = await Promise.all([
    loadPublicConfigMap(),
    getOptionalCurrentUser()
  ]);
  const [wallet, organizations] = user
    ? await Promise.all([
      getWallet().catch(() => null),
      getUserOrganizations().catch(() => null)
    ])
    : [null, null];
  const billingIdentity = user ? await getCurrentBillingIdentity(organizations) : null;
  const billingOrganization =
    billingIdentity?.type === "ORGANIZATION"
      ? organizations?.organizations.find((organization) => organization.id === billingIdentity.organizationId)
      : null;
  const displayedCredits =
    billingIdentity?.type === "ORGANIZATION"
      ? billingOrganization?.quota.remainingQuota ?? billingOrganization?.wallet?.balanceAvailable ?? null
      : wallet?.availableCredits ?? null;
  const siteName = configs.get("siteName") || "AI SaaS";
  const siteLogo = safeImageUrl(configs.get("siteLogo"));
  const beianNo = configs.get("beianNo") || "";
  const copyrightText = configs.get("copyrightText") || "";
  const siteMenusValue = configs.get("siteMenus");
  const hasManagedMenus = Boolean(siteMenusValue?.trim());
  const siteMenus = parseSiteMenuConfig(siteMenusValue);
  const primaryMenu = getMenuByLocation(siteMenus, "primary");
  const footerMenu = getMenuByLocation(siteMenus, "footer");
  const navItems = hasManagedMenus
    ? primaryMenu
      ? hideToolApplicationItems(menuItemsToNavTree(primaryMenu.items))
      : []
    : hideToolApplicationItems(parseNavItems(configs.get("publicNavItems"))).filter(
        (item) => !item.href.startsWith("/experience")
      );
  const footerLinks = hasManagedMenus
    ? footerMenu
      ? hideToolApplicationItems(menuItemsToNavTree(footerMenu.items))
      : []
    : hideToolApplicationItems(defaultFooterLinks.map((item) => toNavMenuItem(item)));
  const theme = getThemeTemplate(configs.get("activeThemeTemplate"));
  const style = themeTemplateStyle(theme, safeHexColor(configs.get("themePrimaryColor"), "#292524"));

  return (
    <main
      className={cn("aisaas-public-shell min-h-screen bg-background text-foreground", `theme-${theme.key}`)}
      data-public-theme={theme.key}
      style={style}
    >
      {showHeader ? (
        <header className="aisaas-public-header sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 w-full items-center justify-between px-5">
            <Link className="flex min-w-0 items-center gap-2 font-display text-2xl font-light tracking-normal" href="/">
              {siteLogo ? <img alt={siteName} className="h-8 w-auto shrink-0 object-contain" src={siteLogo} /> : null}
              {!siteLogo ? <span className="truncate">{siteName}</span> : null}
            </Link>
            <nav className="aisaas-public-nav hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
              {navItems.map((item, index) => (
                <Fragment key={`${item.label}-${item.href}`}>
                  {!hasManagedMenus && index === 1 ? <ExperienceNavMenu /> : null}
                  <HeaderMenuItem item={item} />
                </Fragment>
              ))}
              {!hasManagedMenus && navItems.length <= 1 ? <ExperienceNavMenu /> : null}
            </nav>
            <div className="flex items-center gap-2">
              <UserAccountMenu
                availableCredits={displayedCredits}
                billingIdentity={billingIdentity}
                loginHref="/login"
                organizations={organizations}
                registerHref="/register"
                user={user}
              />
            </div>
          </div>
        </header>
      ) : null}
      {children}
      {showFooter ? (
        <footer className="aisaas-public-footer border-t border-border bg-background">
          <div className="flex w-full flex-col items-center gap-4 px-5 py-8 text-center text-sm text-muted-foreground">
            {footerLinks.length > 0 ? (
              <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {footerLinks.map((item) => (
                  <FooterMenuItem item={item} key={item.id} />
                ))}
              </nav>
            ) : null}
            {beianNo || copyrightText ? (
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                {beianNo ? <span>{beianNo}</span> : null}
                {copyrightText ? <span>{copyrightText}</span> : null}
              </p>
            ) : null}
          </div>
        </footer>
      ) : null}
    </main>
  );
}

function ExperienceNavMenu() {
  return (
    <div className="group relative">
      <Link className="inline-flex items-center gap-1 hover:text-foreground" href="/experience/chat">
        体验区
        <ChevronDown className="transition-transform group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute left-0 top-full z-20 mt-3 w-44 rounded-lg border border-border bg-card p-2 opacity-0 shadow-sm transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <Link className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-secondary hover:text-foreground" href="/experience/chat">
          <span className="text-sm font-medium">AI 对话</span>
          <span className="text-xs text-muted-foreground">基础 Chat 体验</span>
        </Link>
        <Link className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-secondary hover:text-foreground" href="/experience/voice">
          <span className="text-sm font-medium">语音合成</span>
          <span className="text-xs text-muted-foreground">文字转语音体验</span>
        </Link>
        <Link className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-secondary hover:text-foreground" href="/experience/image">
          <span className="text-sm font-medium">图片生成</span>
          <span className="text-xs text-muted-foreground">文生图与参考图</span>
        </Link>
        <Link className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-secondary hover:text-foreground" href="/experience/video">
          <span className="text-sm font-medium">视频生成</span>
          <span className="text-xs text-muted-foreground">文生视频与参考生成</span>
        </Link>
      </div>
    </div>
  );
}

function HeaderMenuItem({ item }: { item: NavMenuItem }) {
  if (item.children.length === 0) {
    return <MenuLink className="hover:text-foreground" item={item} />;
  }

  return (
    <div className="group relative">
      <MenuLink className="inline-flex items-center gap-1 hover:text-foreground" item={item}>
        <ChevronDown className="transition-transform group-hover:rotate-180" />
      </MenuLink>
      <div className="invisible absolute left-0 top-full z-20 mt-3 w-48 rounded-lg border border-border bg-card p-2 opacity-0 shadow-sm transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {item.children.map((child) => (
          <MenuLink
            className="flex rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary hover:text-foreground"
            item={child}
            key={child.id}
          />
        ))}
      </div>
    </div>
  );
}

function FooterMenuItem({ item }: { item: NavMenuItem }) {
  return (
    <>
      <MenuLink className="hover:text-foreground" item={item} />
      {item.children.map((child) => (
        <MenuLink className="hover:text-foreground" item={child} key={child.id} />
      ))}
    </>
  );
}

function MenuLink({
  children,
  className,
  item
}: {
  children?: ReactNode;
  className?: string;
  item: NavMenuItem;
}) {
  if (item.external || isExternalHref(item.href)) {
    return (
      <a className={className} href={item.href} rel="noreferrer" target="_blank">
        {item.label}
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={item.href}>
      {item.label}
      {children}
    </Link>
  );
}

async function loadPublicConfigMap() {
  try {
    const configs = await getPublicSystemConfigs();

    return new Map(configs.map((config) => [config.key, config.value]));
  } catch {
    return new Map<string, string>();
  }
}

function parseNavItems(value: string | undefined) {
  if (!value) {
    return defaultNavItems.map((item) => toNavMenuItem(item));
  }

  const items = value
    .split("\n")
    .map((line) => {
      const [labelInput, hrefInput] = line.split("|");
      const label = String(labelInput ?? "").trim();
      const href = String(hrefInput ?? "").trim();

      return label && isSafeInternalHref(href) ? toNavMenuItem({ href, label }) : null;
    })
    .filter((item): item is NavMenuItem => Boolean(item))
    .slice(0, 12);

  return items.length > 0 ? items : defaultNavItems.map((item) => toNavMenuItem(item));
}

function toNavMenuItem(item: { href: string; label: string }): NavMenuItem {
  return {
    id: `${item.label}-${item.href}`,
    label: item.label,
    href: item.href,
    external: isExternalHref(item.href),
    children: []
  };
}

function hideToolApplicationItems(items: NavMenuItem[]): NavMenuItem[] {
  return items
    .filter((item) => !isToolApplicationHref(item.href))
    .map((item) => ({
      ...item,
      children: hideToolApplicationItems(item.children)
    }));
}

function isToolApplicationHref(href: string) {
  return href === "/tools" || href.startsWith("/tools/");
}

function safeHexColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function safeImageUrl(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return "";
}

function isSafeInternalHref(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("<") &&
    !value.includes(">") &&
    !value.toLowerCase().includes("javascript:")
  );
}
