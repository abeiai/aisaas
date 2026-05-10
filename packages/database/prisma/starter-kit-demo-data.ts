export const starterKitDemoArticleCategories = [
  {
    name: "Starter Kit 指南",
    slug: "starter-kit-guide",
    description: "面向新开发者的 AI SaaS Starter Kit 使用、发布和运营指南。",
    sortOrder: 1
  },
  {
    name: "内容增长",
    slug: "content-growth",
    description: "围绕内容型工具站、SEO 和中文增长运营的示例文章。",
    sortOrder: 2
  },
  {
    name: "AI 写作",
    slug: "ai-writing",
    description: "AI 写作工具、Prompt 设计和内容生产工作流。",
    sortOrder: 3
  }
] as const;

export const starterKitDemoArticles = [
  {
    categorySlug: "starter-kit-guide",
    title: "用 AI 写作工具站启动第一个 SaaS",
    slug: "starter-kit-ai-writing-site",
    summary: "从首页、工具列表、文章、用户中心和后台配置开始，把 Starter Kit 调整成可演示的 AI 写作站。",
    content:
      "这个示例站点展示了一条最短可运营路径：用户从首页进入工具列表，选择 AI 写作工具，登录后提交任务，再在用户中心查看任务历史和点数流水。\n\n作为 Starter Kit，第一步不应该追求复杂插件市场或多租户，而是让新项目能快速替换品牌、内容、工具模板和模型配置。\n\n上线前建议完成三件事：配置真实域名和备案信息，接入真实 AI Provider，并关闭本地模拟支付能力。",
    seoTitle: "AI 写作工具站 Starter Kit 示例",
    seoDescription: "了解如何基于 AI SaaS Starter Kit 启动一个可演示、可登录、可配置模型的中文 AI 写作工具站。"
  },
  {
    categorySlug: "content-growth",
    title: "内容型 AI SaaS 的第一批页面应该有什么",
    slug: "content-ai-saas-first-pages",
    summary: "首页、价格页、文章列表、单页和工具详情页是内容型 AI SaaS 早期最值得优先打磨的界面。",
    content:
      "内容型 AI SaaS 的第一批页面不需要像大型平台一样复杂，但必须让用户理解产品、看到工具、知道价格，并能找到基础信任信息。\n\n建议优先准备：一个清晰首页，一个工具列表，一个价格与点数说明页，三到五篇入门文章，以及关于我们、隐私政策和服务条款。\n\n后台 CMS 的意义在于让这些内容可以被运营持续更新，而不是每次都改代码发布。",
    seoTitle: "内容型 AI SaaS 第一批页面清单",
    seoDescription: "整理中文内容型 AI SaaS 在 MVP 阶段应该优先准备的首页、工具页、价格页、文章和单页。"
  },
  {
    categorySlug: "ai-writing",
    title: "AI 工具模板如何设计输入表单",
    slug: "ai-tool-template-input-schema",
    summary: "好的 AI 工具模板会把 Prompt 变量变成清晰表单，让用户知道该填什么、为什么填。",
    content:
      "AI 工具模板不是简单把一个大文本框扔给用户。更好的方式是把关键变量拆成主题、目标用户、语气、输出格式等字段，让提交前的预期更明确。\n\n在这个 Starter Kit 中，工具模板使用 inputSchema 描述表单字段，后端负责校验必填项，前台工具页负责动态渲染。\n\n这样做的好处是：开发者可以通过 JSON 或代码注册新工具，而不必为每个工具单独写一套页面。",
    seoTitle: "AI 工具模板输入表单设计",
    seoDescription: "介绍 AI SaaS Starter Kit 中 inputSchema、Prompt 模板和工具表单的设计方式。"
  }
] as const;

export const starterKitDemoPages = [
  {
    title: "关于示例站",
    slug: "about",
    content:
      "这是 AI SaaS Starter Kit 内置的中文 AI 写作工具站示例。\n\n你可以替换站点名称、Logo、主题主色、导航菜单、文章内容、单页内容和 AI 工具模板，把它改造成自己的产品原型。",
    seoTitle: "关于 AI SaaS Starter Kit 示例站",
    seoDescription: "了解 AI SaaS Starter Kit 示例站的用途和可替换内容。"
  },
  {
    title: "服务条款",
    slug: "terms",
    content:
      "本页面是 Starter Kit 示例服务条款，不构成正式法律文本。\n\n正式上线前，请根据你的公司主体、服务范围、付费规则、退款规则和用户数据处理方式，替换为经审核的正式条款。",
    seoTitle: "服务条款",
    seoDescription: "AI SaaS Starter Kit 示例服务条款。"
  },
  {
    title: "隐私政策",
    slug: "privacy",
    content:
      "本页面是 Starter Kit 示例隐私政策，不构成正式法律文本。\n\n正式上线前，请明确说明你收集哪些用户信息、如何使用、如何保存、如何删除，以及第三方服务的调用范围。",
    seoTitle: "隐私政策",
    seoDescription: "AI SaaS Starter Kit 示例隐私政策。"
  }
] as const;

export const starterKitDemoSystemConfigs = [
  {
    key: "siteName",
    label: "站点名称",
    value: "AI 写作工具站",
    description: "Starter Kit 示例站点名称。",
    isPublic: true,
    sortOrder: 10
  },
  {
    key: "homeTitle",
    label: "首页标题",
    value: "可直接演示的中文 AI 写作工具站",
    description: "Starter Kit 示例首页首屏标题。",
    isPublic: true,
    sortOrder: 19
  },
  {
    key: "homeDescription",
    label: "首页描述",
    value: "内置首页、工具、文章、单页、用户中心和后台配置，新项目可以从这里替换品牌和内容。",
    description: "Starter Kit 示例首页首屏描述。",
    isPublic: true,
    sortOrder: 20
  },
  {
    key: "footerText",
    label: "Footer 文案",
    value: "这是一个可清理、可替换的 AI SaaS Starter Kit 示例站。",
    description: "Starter Kit 示例页脚文案。",
    isPublic: true,
    sortOrder: 18
  }
] as const;

export const starterKitLegacyDemoArticleSlugs = ["demo"];
export const starterKitLegacyDemoCategorySlugs = ["product-design"];
export const starterKitDemoPaymentOrderPrefix = "DEMO-";
