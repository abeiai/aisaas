import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOptionalCurrentUser, userLogoutAction } from "@/lib/auth-actions";
import { getPublicSystemConfigs } from "@/lib/settings-api";

const defaultNavItems = [
  { href: "/", label: "首页" },
  { href: "/features", label: "功能" },
  { href: "/use-cases", label: "场景" },
  { href: "/tools", label: "工具" },
  { href: "/pricing", label: "价格" },
  { href: "/articles", label: "文章" },
  { href: "/dashboard", label: "用户中心" }
];

const footerLinks = [
  { href: "/features", label: "产品功能" },
  { href: "/use-cases", label: "使用场景" },
  { href: "/tools", label: "AI 工具" },
  { href: "/pricing", label: "价格方案" },
  { href: "/articles", label: "文章列表" },
  { href: "/pages/about", label: "关于我们" }
];

const accountLinks = [
  { href: "/dashboard", label: "用户中心" },
  { href: "/dashboard/tasks", label: "任务历史" },
  { href: "/dashboard/audio-tasks", label: "音频任务" },
  { href: "/dashboard/voices", label: "我的音色" },
  { href: "/dashboard/billing", label: "账单中心" },
  { href: "/dashboard/profile", label: "个人资料" },
  { href: "/admin/login", label: "管理员登录" },
  { href: "/admin/articles", label: "文章管理" }
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
  const siteName = configs.get("siteName") || "AI SaaS";
  const siteLogo = safeImageUrl(configs.get("siteLogo"));
  const footerText =
    configs.get("footerText") || configs.get("siteDescription") || "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。";
  const beianNo = configs.get("beianNo") || "";
  const serviceQrCode = safeImageUrl(configs.get("serviceQrCode"));
  const navItems = parseNavItems(configs.get("publicNavItems")).filter((item) => !item.href.startsWith("/experience"));
  const style = {
    "--primary": safeHexColor(configs.get("themePrimaryColor"), "#292524"),
    "--ring": safeHexColor(configs.get("themePrimaryColor"), "#292524")
  } as CSSProperties;

  return (
    <main className="min-h-screen bg-background text-foreground" style={style}>
      {showHeader ? (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Link className="flex min-w-0 items-center gap-2 font-display text-2xl font-light tracking-normal" href="/">
              {siteLogo ? <img alt={siteName} className="h-8 w-auto shrink-0 object-contain" src={siteLogo} /> : null}
              <span className="truncate">{siteName}</span>
            </Link>
            <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
              {navItems.map((item, index) => (
                <Fragment key={`${item.label}-${item.href}`}>
                  {index === 1 ? <ExperienceNavMenu /> : null}
                  <Link className="hover:text-foreground" href={item.href}>
                    {item.label}
                  </Link>
                </Fragment>
              ))}
              {navItems.length <= 1 ? <ExperienceNavMenu /> : null}
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard">{user.nickname || "用户中心"}</Link>
                  </Button>
                  <form action={userLogoutAction}>
                    <Button size="sm" type="submit" variant="outline">
                      退出登录
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">登录</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register">注册</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>
      ) : null}
      {children}
      {showFooter ? (
        <footer className="border-t border-border bg-background">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="flex flex-col gap-3">
              <p className="font-display text-2xl font-light">{siteName}</p>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">{footerText}</p>
              {beianNo ? <p className="text-xs text-muted-foreground">{beianNo}</p> : null}
              {serviceQrCode ? (
                <img alt="客服二维码" className="mt-2 size-24 rounded-md border border-border object-cover" src={serviceQrCode} />
              ) : null}
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">前台入口</p>
              {footerLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">账户入口</p>
              {accountLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
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
    return defaultNavItems;
  }

  const items = value
    .split("\n")
    .map((line) => {
      const [labelInput, hrefInput] = line.split("|");
      const label = String(labelInput ?? "").trim();
      const href = String(hrefInput ?? "").trim();

      return label && isSafeInternalHref(href) ? { href, label } : null;
    })
    .filter((item): item is { href: string; label: string } => Boolean(item))
    .slice(0, 12);

  return items.length > 0 ? items : defaultNavItems;
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
