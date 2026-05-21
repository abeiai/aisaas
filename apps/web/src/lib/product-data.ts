import {
  BookOpenText,
  Bot,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Mic2,
  PenLine,
  Radio,
  ReceiptText,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Tags,
  WalletCards
} from "lucide-react";

export const pricingFaqs = [
  {
    question: "点数会过期吗？",
    answer: "第一版不设置点数有效期，后续如调整会在站内公告和订单页面提前说明。"
  },
  {
    question: "生成失败会扣点吗？",
    answer: "AI 任务会先冻结预估点数，失败后自动释放冻结点数，成功后按实际消耗结算。"
  },
  {
    question: "当前支持哪些支付方式？",
    answer: "第一阶段只支持支付宝和微信支付，不接入 Stripe、Paddle 或国际支付。"
  },
  {
    question: "适合什么团队使用？",
    answer: "适合需要中文内容工具站、运营文章、登录注册、充值点数和 AI 生成闭环的早期产品团队。"
  }
];

export const featureGroups = [
  {
    title: "中文内容站",
    description: "前台文章、单页、SEO 字段和后台 CMS 已形成基础发布闭环。",
    icon: BookOpenText,
    items: ["文章分类管理", "文章发布与草稿保护", "单页内容管理", "首页配置可运营"]
  },
  {
    title: "AI 工具入口",
    description: "工具列表、详情输入、任务结果和历史记录面向用户可见。",
    icon: Sparkles,
    items: ["AI 场景展示", "点数消耗提示", "生成结果回看", "失败释放冻结点数"]
  },
  {
    title: "支付与点数",
    description: "充值订单、钱包余额、流水记录和支付回调预留已经接入。",
    icon: WalletCards,
    items: ["支付宝", "微信支付", "钱包流水", "后台用户调点"]
  },
  {
    title: "运营后台",
    description: "管理员登录后可管理内容、用户、配置、支付订单和 AI 任务。",
    icon: LayoutDashboard,
    items: ["管理员登录", "CMS 管理", "用户管理", "操作日志"]
  }
];

export const useCaseGroups = [
  {
    title: "内容运营",
    description: "用文章和单页承接自然流量，再用 AI 工具提升内容生产效率。",
    icon: PenLine,
    examples: ["活动文案初稿", "文章摘要扩写", "产品介绍优化"]
  },
  {
    title: "工具站 MVP",
    description: "先上线可注册、可充值、可试用的中文工具入口，再逐步增加 AI 场景。",
    icon: Rocket,
    examples: ["文案生成器", "SEO 标题助手", "运营素材助手"]
  },
  {
    title: "知识付费配套",
    description: "通过 CMS 承载内容，通过点数账户承载轻量 AI 功能使用。",
    icon: Lightbulb,
    examples: ["课程资料页", "学员 AI 助手", "运营模板生成"]
  }
];

export const productTools = [
  {
    slug: "copywriting",
    title: "AI 文案生成",
    category: "内容运营",
    summary: "输入产品、活动或文章主题，生成结构清晰的中文运营文案。",
    description:
      "适合快速产出活动介绍、产品卖点、文章开头和社媒发布文案。生成前会提示预估点数，提交后可在任务历史中回看。",
    costCredits: 120,
    isAvailable: true,
    icon: Megaphone,
    placeholder: "例如：为一个面向内容运营的 AI 工具写首页介绍文案，语气克制可信。",
    inputLabel: "文案需求",
    resultLabel: "生成文案",
    tips: ["写清产品对象和使用场景", "补充目标用户和语气要求", "需要长文时分段提交更稳定"]
  },
  {
    slug: "article-outline",
    title: "文章大纲助手",
    category: "内容运营",
    summary: "根据主题拆解中文文章结构、标题层级和写作要点。",
    description: "适合 SEO 文章、运营文章和产品教程的前期结构规划。",
    costCredits: 80,
    isAvailable: false,
    icon: FileText,
    placeholder: "例如：围绕 AI 工具站如何做内容增长，生成一份文章大纲。",
    inputLabel: "文章主题",
    resultLabel: "大纲结果",
    tips: ["适合先确定标题方向", "可配合 CMS 文章发布", "后续接入真实 AI 场景"]
  },
  {
    slug: "seo-title",
    title: "SEO 标题优化",
    category: "增长转化",
    summary: "为文章或工具页生成更适合点击和检索的中文标题。",
    description: "适合优化文章标题、页面标题和摘要卖点。",
    costCredits: 60,
    isAvailable: false,
    icon: Search,
    placeholder: "例如：把“AI 文案工具介绍”优化成 5 个更适合搜索的标题。",
    inputLabel: "原始标题或主题",
    resultLabel: "标题建议",
    tips: ["标题不做夸张承诺", "关键词自然出现", "后续和 CMS SEO 字段联动"]
  }
];

export const toolCategories = Array.from(new Set(productTools.map((tool) => tool.category))).map(
  (category) => ({
    name: category,
    tools: productTools.filter((tool) => tool.category === category)
  })
);

export const conversionSteps = [
  {
    title: "注册账号",
    description: "用邮箱注册后进入用户中心，查看钱包、任务和个人资料。",
    icon: Tags,
    href: "/register"
  },
  {
    title: "选择工具",
    description: "从工具列表进入 AI 文案生成，先看点数消耗再提交任务。",
    icon: Bot,
    href: "/tools"
  },
  {
    title: "充值点数",
    description: "余额不足时进入账单中心，通过支付宝或微信创建充值订单。",
    icon: CreditCard,
    href: "/pricing"
  },
  {
    title: "回看结果",
    description: "在任务历史查看生成记录、消耗点数和任务状态。",
    icon: ReceiptText,
    href: "/dashboard/tasks"
  }
];

export const dashboardQuickLinks = [
  {
    title: "AI 工具",
    description: "进入工具列表，创建新的生成任务。",
    icon: Sparkles,
    href: "/tools"
  },
  {
    title: "任务历史",
    description: "查看最近 50 条 AI 任务和结果。",
    icon: ReceiptText,
    href: "/dashboard/tasks"
  },
  {
    title: "音色库",
    description: "管理系统音色、设计音色和复刻音色。",
    icon: Mic2,
    href: "/dashboard/voices"
  },
  {
    title: "音频任务",
    description: "查看语音合成、声音设计和复刻记录。",
    icon: Radio,
    href: "/dashboard/audio-tasks"
  },
  {
    title: "知识库",
    description: "上传文件，供 AI 工具进行基础 RAG 检索。",
    icon: Database,
    href: "/dashboard/knowledge"
  },
  {
    title: "点数充值",
    description: "查看钱包余额，创建支付宝或微信订单。",
    icon: WalletCards,
    href: "/dashboard/billing"
  },
  {
    title: "个人资料",
    description: "修改昵称、密码并退出登录。",
    icon: Settings,
    href: "/dashboard/profile"
  }
];

export function getProductTool(slug: string) {
  return productTools.find((tool) => tool.slug === slug);
}
