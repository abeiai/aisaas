import { HttpStatus, Injectable } from "@nestjs/common";
import { getPrismaClient } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { UpdateSystemConfigDto } from "./dto/update-system-config.dto.js";

const configDefinitions = [
  {
    key: "siteName",
    label: "站点名称",
    value: "AI SaaS",
    description: "用于前台、后台和浏览器标题的站点名称。",
    isPublic: true,
    sortOrder: 10
  },
  {
    key: "siteLogo",
    label: "站点 Logo",
    value: "",
    description: "前台导航和运营物料可使用的 Logo 图片地址。",
    isPublic: true,
    sortOrder: 15
  },
  {
    key: "themePrimaryColor",
    label: "主题主色",
    value: "#292524",
    description: "前台按钮、链接和强调元素使用的主色，只允许 6 位十六进制颜色。",
    isPublic: true,
    sortOrder: 16
  },
  {
    key: "publicNavItems",
    label: "前台导航菜单",
    value: "首页|/\n功能|/features\n场景|/use-cases\n工具|/tools\n价格|/pricing\n文章|/articles\n用户中心|/dashboard",
    description: "每行一个菜单，格式为 名称|站内路径，最多 12 项。",
    isPublic: true,
    sortOrder: 17
  },
  {
    key: "siteMenus",
    label: "站点菜单结构",
    value: "",
    description: "菜单管理保存的结构化菜单数据，包含菜单项、层级和展示位置。",
    isPublic: true,
    sortOrder: 18
  },
  {
    key: "footerText",
    label: "Footer 文案",
    value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
    description: "前台页脚展示的站点说明。",
    isPublic: true,
    sortOrder: 18
  },
  {
    key: "homeTitle",
    label: "首页标题",
    value: "面向内容型 AI SaaS 的第一批可运营页面",
    description: "前台首页首屏标题。",
    isPublic: true,
    sortOrder: 19
  },
  {
    key: "homeDescription",
    label: "首页描述",
    value: "首页、文章、单页、用户中心和管理后台已经连成可访问的中文界面。",
    description: "前台首页首屏描述。",
    isPublic: true,
    sortOrder: 20
  },
  {
    key: "homeCtaText",
    label: "首页 CTA 文案",
    value: "免费注册",
    description: "首页首屏主按钮文案。",
    isPublic: true,
    sortOrder: 21
  },
  {
    key: "homeCtaHref",
    label: "首页 CTA 链接",
    value: "/register",
    description: "首页首屏主按钮链接。",
    isPublic: true,
    sortOrder: 22
  },
  {
    key: "homeFeatureHighlights",
    label: "首页功能亮点",
    value: "可访问路由\n中文界面\n真实 CMS\n后台管理\n登录闭环",
    description: "首页展示的功能亮点，每行一个项目。",
    isPublic: true,
    sortOrder: 23
  },
  {
    key: "homeLatestArticleCount",
    label: "首页最新文章数量",
    value: "3",
    description: "首页展示的最新文章数量。",
    isPublic: true,
    sortOrder: 24
  },
  {
    key: "seoTitle",
    label: "SEO 标题",
    value: "AI SaaS - 简体中文内容型工具站底座",
    description: "默认 SEO 标题。",
    isPublic: true,
    sortOrder: 25
  },
  {
    key: "seoDescription",
    label: "SEO 描述",
    value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
    description: "默认 SEO 描述。",
    isPublic: true,
    sortOrder: 26
  },
  {
    key: "siteUrl",
    label: "前台地址",
    value: "http://localhost:7341",
    description: "对外展示和运营校验使用的前台访问地址。",
    isPublic: true,
    sortOrder: 27
  },
  {
    key: "siteDescription",
    label: "站点描述",
    value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
    description: "用于首页、SEO 和后台识别的简短介绍。",
    isPublic: true,
    sortOrder: 30
  },
  {
    key: "beianNo",
    label: "备案号",
    value: "待备案",
    description: "前台页脚展示的备案号。",
    isPublic: true,
    sortOrder: 35
  },
  {
    key: "serviceQrCode",
    label: "客服二维码",
    value: "",
    description: "客服二维码图片地址，仅对前台展示需要的地址公开。",
    isPublic: true,
    sortOrder: 36
  },
  {
    key: "defaultCreditExchangeRate",
    label: "默认点数兑换比例",
    value: "1 元 = 100 点",
    description: "后台展示使用的默认点数兑换说明。",
    isPublic: false,
    sortOrder: 37
  },
  {
    key: "defaultAiModel",
    label: "默认 AI 模型",
    value: "本地 mock",
    description: "后台运营识别使用的默认 AI 模型名称。",
    isPublic: false,
    sortOrder: 38
  },
  {
    key: "aiSaveFullContent",
    label: "AI 完整内容保存",
    value: "false",
    description: "默认仅保存输入输出预览与哈希；明确启用后才保存完整 Prompt 和生成内容。",
    isPublic: false,
    sortOrder: 39
  },
  {
    key: "apiBaseUrl",
    label: "API 地址",
    value: "http://localhost:7342/api",
    description: "核心业务 API 的基础地址。",
    isPublic: false,
    sortOrder: 40
  },
  {
    key: "registrationStatus",
    label: "注册入口",
    value: "开放",
    description: "前台用户注册入口的运营状态。",
    isPublic: false,
    sortOrder: 50
  },
  {
    key: "mediaImageMaxSizeMb",
    label: "图片上传大小",
    value: "10",
    description: "媒体素材中图片文件的最大上传大小，单位 MB。",
    isPublic: false,
    sortOrder: 90
  },
  {
    key: "mediaAudioMaxSizeMb",
    label: "音频上传大小",
    value: "20",
    description: "媒体素材中音频文件的最大上传大小，单位 MB。",
    isPublic: false,
    sortOrder: 91
  },
  {
    key: "mediaVideoMaxSizeMb",
    label: "视频上传大小",
    value: "200",
    description: "媒体素材中视频文件的最大上传大小，单位 MB。",
    isPublic: false,
    sortOrder: 92
  },
  {
    key: "audioVoiceCloneReviewRequired",
    label: "声音复刻审核",
    value: "true",
    description: "声音复刻生成的自定义音色是否需要管理员审核后才能使用。",
    isPublic: false,
    sortOrder: 310
  },
  {
    key: "audioVoiceDesignReviewRequired",
    label: "声音设计审核",
    value: "false",
    description: "声音设计生成的自定义音色是否需要管理员审核后才能使用。",
    isPublic: false,
    sortOrder: 311
  },
  {
    key: "audioUserPublicVoiceEnabled",
    label: "允许公开用户音色",
    value: "false",
    description: "是否允许用户创建 PUBLIC 可见性的自定义音色。",
    isPublic: false,
    sortOrder: 312
  },
  {
    key: "audioCloneDefaultVisibility",
    label: "复刻音色默认可见性",
    value: "PRIVATE",
    description: "声音复刻生成音色的默认可见性。",
    isPublic: false,
    sortOrder: 313
  },
  {
    key: "audioDesignDefaultVisibility",
    label: "设计音色默认可见性",
    value: "PRIVATE",
    description: "声音设计生成音色的默认可见性。",
    isPublic: false,
    sortOrder: 314
  },
  {
    key: "audioSafetyNotice",
    label: "语音安全提示",
    value: "AI 生成语音可能被误用，请勿用于冒充他人、诈骗、侵权、虚假宣传或违法违规用途。声音复刻仅允许上传本人声音或已获得授权的声音。生成音频建议标注为 AI 生成语音。",
    description: "前台语音工具和音色库展示的统一风险提示。",
    isPublic: true,
    sortOrder: 315
  },
  {
    key: "audioCloneConsentText",
    label: "声音复刻授权声明",
    value: "我确认上传的音频为本人声音，或我已获得声音权利人的明确授权。我承诺不会将该音色用于冒充他人、诈骗、侵权、虚假宣传或其他违法违规用途。",
    description: "声音复刻提交前必须勾选并保存快照的授权声明。",
    isPublic: true,
    sortOrder: 316
  },
  {
    key: "audioDownloadNotice",
    label: "音频下载提示",
    value: "下载或对外使用生成音频前，请确认用途合法合规，并建议标注为 AI 生成语音。",
    description: "生成音频下载区域展示的轻量提示。",
    isPublic: true,
    sortOrder: 317
  }
] as const;

type ConfigKey = (typeof configDefinitions)[number]["key"];

@Injectable()
export class SystemConfigService {
  private readonly prisma = getPrismaClient();

  async listConfigs() {
    await this.ensureDefaults();

    return this.prisma.systemConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
    });
  }

  async listPublicConfigs() {
    await this.ensureDefaults();

    const configs = await this.prisma.systemConfig.findMany({
      where: {
        isPublic: true
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
    });

    return configs.map((config) => ({
      key: config.key,
      label: config.label,
      value: config.value,
      description: config.description,
      group: config.group,
      sortOrder: config.sortOrder,
      updatedAt: config.updatedAt
    }));
  }

  async updateConfigs(dto: UpdateSystemConfigDto) {
    await this.ensureDefaults();

    const updates = Object.entries(dto)
      .filter(([key, value]) => this.isConfigKey(key) && value !== undefined)
      .map(([key, value]) => ({
        key: key as ConfigKey,
        value: this.normalizeConfigValue(key as ConfigKey, String(value).trim())
      }));

    if (updates.length === 0) {
      throw new AppException(40001, "请求参数错误", HttpStatus.BAD_REQUEST);
    }

    for (const update of updates) {
      if (!update.value && !this.isEmptyAllowed(update.key)) {
        throw new AppException(40001, "配置值不能为空", HttpStatus.BAD_REQUEST);
      }
    }

    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.systemConfig.update({
          where: {
            key: update.key
          },
          data: {
            value: update.value
          }
        })
      )
    );

    return this.listConfigs();
  }

  private async ensureDefaults() {
    await this.prisma.$transaction(
      configDefinitions.map((definition) =>
        this.prisma.systemConfig.upsert({
          where: {
            key: definition.key
          },
          update: {
            label: definition.label,
            description: definition.description,
            isPublic: definition.isPublic,
            sortOrder: definition.sortOrder
          },
          create: {
            key: definition.key,
            label: definition.label,
            value: definition.value,
            description: definition.description,
            group: "site",
            isPublic: definition.isPublic,
            sortOrder: definition.sortOrder
          }
        })
      )
    );
  }

  private isConfigKey(key: string): key is ConfigKey {
    return configDefinitions.some((definition) => definition.key === key);
  }

  private isEmptyAllowed(key: ConfigKey) {
    return key === "siteLogo" || key === "serviceQrCode" || key === "siteMenus";
  }

  private normalizeConfigValue(key: ConfigKey, value: string) {
    if (key === "themePrimaryColor") {
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
        throw new AppException(40001, "主题主色必须是 6 位十六进制颜色", HttpStatus.BAD_REQUEST);
      }

      return value.toLowerCase();
    }

    if (key === "publicNavItems") {
      return normalizePublicNavItems(value);
    }

    if (key === "siteMenus") {
      return normalizeSiteMenus(value);
    }

    if (
      key === "audioVoiceCloneReviewRequired" ||
      key === "audioVoiceDesignReviewRequired" ||
      key === "audioUserPublicVoiceEnabled"
    ) {
      if (value !== "true" && value !== "false") {
        throw new AppException(40001, "语音审核开关只能选择开启或关闭", HttpStatus.BAD_REQUEST);
      }
    }

    if (key === "audioCloneDefaultVisibility" || key === "audioDesignDefaultVisibility") {
      if (value !== "PRIVATE" && value !== "ADMIN_ONLY" && value !== "PUBLIC") {
        throw new AppException(40001, "音色默认可见性不合法", HttpStatus.BAD_REQUEST);
      }
    }

    if (key === "mediaImageMaxSizeMb" || key === "mediaAudioMaxSizeMb" || key === "mediaVideoMaxSizeMb") {
      return normalizeMediaUploadSizeMb(value);
    }

    return value;
  }
}

function normalizeMediaUploadSizeMb(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new AppException(40001, "媒体上传大小必须是整数 MB", HttpStatus.BAD_REQUEST);
  }

  const sizeMb = Number(value);

  if (!Number.isInteger(sizeMb) || sizeMb < 1 || sizeMb > 200) {
    throw new AppException(40001, "媒体上传大小必须在 1 到 200 MB 之间", HttpStatus.BAD_REQUEST);
  }

  return String(sizeMb);
}

function normalizePublicNavItems(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (lines.length === 0) {
    throw new AppException(40001, "前台导航菜单不能为空", HttpStatus.BAD_REQUEST);
  }

  return lines
    .map((line) => {
      const [labelInput, hrefInput] = line.split("|");
      const label = String(labelInput ?? "").trim();
      const href = String(hrefInput ?? "").trim();

      if (!label || label.length > 20) {
        throw new AppException(40001, "导航名称不能为空且不能超过 20 个字符", HttpStatus.BAD_REQUEST);
      }

      if (!isSafeInternalHref(href)) {
        throw new AppException(40001, "导航路径必须是安全的站内路径", HttpStatus.BAD_REQUEST);
      }

      return `${label}|${href}`;
    })
    .join("\n");
}

function normalizeSiteMenus(value: string) {
  if (!value.trim()) {
    return "";
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AppException(40001, "菜单结构不是合法 JSON", HttpStatus.BAD_REQUEST);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppException(40001, "菜单结构格式错误", HttpStatus.BAD_REQUEST);
  }

  const source = parsed as {
    version?: unknown;
    menus?: unknown;
    locations?: unknown;
  };

  if (!Array.isArray(source.menus) || source.menus.length > 8) {
    throw new AppException(40001, "菜单数量不能超过 8 个", HttpStatus.BAD_REQUEST);
  }

  const menus = source.menus.map((menuInput, menuIndex) => {
    if (!menuInput || typeof menuInput !== "object" || Array.isArray(menuInput)) {
      throw new AppException(40001, "菜单数据格式错误", HttpStatus.BAD_REQUEST);
    }

    const menu = menuInput as {
      id?: unknown;
      name?: unknown;
      items?: unknown;
    };
    const id = String(menu.id ?? `menu-${menuIndex + 1}`).trim();
    const name = String(menu.name ?? "").trim();

    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
      throw new AppException(40001, "菜单 ID 格式不合法", HttpStatus.BAD_REQUEST);
    }

    if (!name || name.length > 40) {
      throw new AppException(40001, "菜单名称不能为空且不能超过 40 个字符", HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(menu.items) || menu.items.length > 80) {
      throw new AppException(40001, "单个菜单最多包含 80 个菜单项", HttpStatus.BAD_REQUEST);
    }

    return {
      id,
      name,
      items: menu.items.map((itemInput, itemIndex) => normalizeSiteMenuItem(itemInput, itemIndex))
    };
  });

  const menuIds = new Set(menus.map((menu) => menu.id));
  const locationsInput =
    source.locations && typeof source.locations === "object" && !Array.isArray(source.locations)
      ? (source.locations as { primaryMenuId?: unknown; footerMenuId?: unknown })
      : {};
  const primaryMenuId = String(locationsInput.primaryMenuId ?? "").trim();
  const footerMenuId = String(locationsInput.footerMenuId ?? "").trim();

  return JSON.stringify({
    version: 1,
    menus,
    locations: {
      primaryMenuId: menuIds.has(primaryMenuId) ? primaryMenuId : "",
      footerMenuId: menuIds.has(footerMenuId) ? footerMenuId : ""
    }
  });
}

function normalizeSiteMenuItem(itemInput: unknown, itemIndex: number) {
  if (!itemInput || typeof itemInput !== "object" || Array.isArray(itemInput)) {
    throw new AppException(40001, "菜单项格式错误", HttpStatus.BAD_REQUEST);
  }

  const item = itemInput as {
    id?: unknown;
    type?: unknown;
    label?: unknown;
    href?: unknown;
    referenceId?: unknown;
    depth?: unknown;
  };
  const id = String(item.id ?? `item-${itemIndex + 1}`).trim();
  const type = String(item.type ?? "custom").trim();
  const label = String(item.label ?? "").trim();
  const href = String(item.href ?? "").trim();
  const depth = Number(item.depth ?? 0);

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new AppException(40001, "菜单项 ID 格式不合法", HttpStatus.BAD_REQUEST);
  }

  if (!["page", "article", "category", "custom"].includes(type)) {
    throw new AppException(40001, "菜单项类型不合法", HttpStatus.BAD_REQUEST);
  }

  if (!label || label.length > 40) {
    throw new AppException(40001, "菜单项名称不能为空且不能超过 40 个字符", HttpStatus.BAD_REQUEST);
  }

  if (!isSafeMenuHref(href)) {
    throw new AppException(40001, "菜单项链接必须是安全的站内路径或 http(s) 链接", HttpStatus.BAD_REQUEST);
  }

  return {
    id,
    type,
    label,
    href,
    referenceId: String(item.referenceId ?? "").trim(),
    depth: depth === 1 ? 1 : 0
  };
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

function isSafeMenuHref(value: string) {
  if (isSafeInternalHref(value)) {
    return true;
  }

  if (value.includes("<") || value.includes(">")) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
