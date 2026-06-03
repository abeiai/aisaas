import type { CSSProperties } from "react";

export type ThemeTemplateKey = "default" | "blue-tech";

export interface ThemeTemplate {
  description: string;
  features: string[];
  key: ThemeTemplateKey;
  name: string;
  previewColors: string[];
  tagline: string;
  tokens: Record<`--${string}`, string>;
}

export const defaultThemeTemplateKey: ThemeTemplateKey = "default";

export const themeTemplates: ThemeTemplate[] = [
  {
    key: "default",
    name: "默认风格",
    tagline: "从当前前台页面提取的温和内容型 SaaS 风格",
    description: "保留现有前台的浅灰画布、暖黑文字、圆角按钮和内容卡片体系，适合内容站、工具站和运营型首页。",
    previewColors: ["#f5f5f5", "#ffffff", "#292524", "#e7e5e4"],
    features: ["当前前台默认样式", "内容型工具站", "浅色运营页面", "兼容页面编排模块"],
    tokens: {
      "--background": "#f5f5f5",
      "--foreground": "#0c0a09",
      "--card": "#ffffff",
      "--card-foreground": "#0c0a09",
      "--popover": "#ffffff",
      "--popover-foreground": "#0c0a09",
      "--primary": "#292524",
      "--primary-foreground": "#ffffff",
      "--secondary": "#f0efed",
      "--secondary-foreground": "#0c0a09",
      "--muted": "#f0efed",
      "--muted-foreground": "#777169",
      "--accent": "#e7e5e4",
      "--accent-foreground": "#0c0a09",
      "--destructive": "#dc2626",
      "--border": "#e7e5e4",
      "--input": "#d6d3d1",
      "--ring": "#292524",
      "--radius": "0.5rem",
      "--theme-card-shadow": "none",
      "--theme-header-shadow": "none"
    }
  },
  {
    key: "blue-tech",
    name: "蓝色科技",
    tagline: "更清爽的蓝色科技感界面，适合 AI 平台和开发者产品",
    description: "使用冷白画布、蓝色主按钮、细网格背景和更明快的卡片层级，保持所有前台功能、菜单、CMS、页面编排和体验区数据不变。",
    previewColors: ["#f3f8ff", "#ffffff", "#0b63f6", "#c5daf4"],
    features: ["蓝色主视觉", "科技感网格背景", "更强卡片层级", "不改变业务功能"],
    tokens: {
      "--background": "#f3f8ff",
      "--foreground": "#07162f",
      "--card": "#ffffff",
      "--card-foreground": "#07162f",
      "--popover": "#ffffff",
      "--popover-foreground": "#07162f",
      "--primary": "#0b63f6",
      "--primary-foreground": "#ffffff",
      "--secondary": "#e7f1ff",
      "--secondary-foreground": "#09234c",
      "--muted": "#eaf3ff",
      "--muted-foreground": "#5b6f8f",
      "--accent": "#d9ebff",
      "--accent-foreground": "#07162f",
      "--destructive": "#dc2626",
      "--border": "#c5daf4",
      "--input": "#aac4e6",
      "--ring": "#2f7cf6",
      "--radius": "0.75rem",
      "--theme-card-shadow": "0 18px 44px rgba(14, 89, 168, 0.10)",
      "--theme-header-shadow": "0 10px 30px rgba(14, 89, 168, 0.08)"
    }
  }
];

const fallbackThemeTemplate = themeTemplates[0]!;

export function isThemeTemplateKey(value: string): value is ThemeTemplateKey {
  return themeTemplates.some((theme) => theme.key === value);
}

export function getThemeTemplate(value: string | undefined | null) {
  return themeTemplates.find((theme) => theme.key === value) ?? fallbackThemeTemplate;
}

export function themeTemplateStyle(theme: ThemeTemplate, primaryColorOverride?: string): CSSProperties {
  const tokens = {
    ...theme.tokens
  };

  if (theme.key === "default" && primaryColorOverride && /^#[0-9a-fA-F]{6}$/.test(primaryColorOverride)) {
    tokens["--primary"] = primaryColorOverride.toLowerCase();
    tokens["--ring"] = primaryColorOverride.toLowerCase();
  }

  return tokens as CSSProperties;
}
