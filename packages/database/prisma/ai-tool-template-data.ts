export const aiToolTemplateVersion = "2026.05";

export const aiToolCategories = [
  {
    name: "写作",
    slug: "writing",
    description: "文章、摘要、润色和长短文内容生成。",
    sortOrder: 10
  },
  {
    name: "营销",
    slug: "marketing",
    description: "活动文案、社媒文案和转化素材。",
    sortOrder: 20
  },
  {
    name: "SEO",
    slug: "seo",
    description: "搜索标题、描述和页面摘要优化。",
    sortOrder: 30
  },
  {
    name: "教育",
    slug: "education",
    description: "学习解释、问答和知识辅助。",
    sortOrder: 40
  },
  {
    name: "办公",
    slug: "office",
    description: "摘要、翻译、会议和日常办公提效。",
    sortOrder: 50
  },
  {
    name: "编程",
    slug: "programming",
    description: "代码解释、技术文档和开发辅助。",
    sortOrder: 60
  },
  {
    name: "翻译",
    slug: "translation",
    description: "中英互译、多语种翻译和英文表达优化。",
    sortOrder: 70
  },
  {
    name: "图像",
    slug: "image",
    description: "图像生成、视觉理解和创意提示词预留。",
    sortOrder: 80
  }
] as const;

export const aiToolTemplates = [
  {
    name: "AI 文案生成",
    slug: "copywriting",
    description: "输入产品、活动或文章主题，生成一版可直接编辑的中文运营文案。",
    categorySlug: "marketing",
    sortOrder: 10,
    costCredits: 120,
    defaultModelAlias: "default-chat",
    fallbackModelAlias: "fast-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "补充要求",
          type: "textarea",
          required: true,
          placeholder: "例如：为一个面向内容运营的 AI 工具写首页介绍文案，语气克制可信。"
        },
        {
          name: "topic",
          label: "主题",
          type: "text",
          required: true,
          placeholder: "例如：AI 内容工具站"
        },
        {
          name: "audience",
          label: "目标用户",
          type: "text",
          required: true,
          placeholder: "例如：内容运营团队"
        },
        {
          name: "tone",
          label: "语气",
          type: "select",
          required: true,
          options: ["克制专业", "轻松直接", "营销感", "学术严谨"]
        }
      ]
    },
    promptTemplate:
      "你是中文 AI SaaS 的内容助手。请围绕 {{topic}}，面向 {{audience}}，用 {{tone}} 的语气生成一段结构清晰、适合运营落地的简体中文文案。\n\n补充要求：{input}\n\n可参考知识库片段：\n{{knowledge}}"
  },
  {
    name: "AI 标题生成",
    slug: "title-generator",
    description: "根据主题和使用场景生成一组清晰、可点击但不过度夸张的中文标题。",
    categorySlug: "writing",
    sortOrder: 20,
    costCredits: 60,
    defaultModelAlias: "fast-chat",
    fallbackModelAlias: "default-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "标题主题",
          type: "textarea",
          required: true,
          placeholder: "例如：AI 工具站如何提升内容团队效率"
        },
        {
          name: "count",
          label: "生成数量",
          type: "number",
          required: false,
          placeholder: "10"
        },
        {
          name: "style",
          label: "标题风格",
          type: "select",
          required: false,
          options: ["信息型", "教程型", "营销型", "SEO 型"]
        }
      ]
    },
    promptTemplate:
      "请围绕以下主题生成 {{count}} 个简体中文标题。标题风格偏向 {{style}}，要求清晰、具体、不过度夸张。\n\n主题：{input}"
  },
  {
    name: "AI 文章摘要",
    slug: "article-summary",
    description: "把长文章压缩成结构化摘要、要点和可复用结论。",
    categorySlug: "office",
    sortOrder: 30,
    costCredits: 80,
    defaultModelAlias: "long-context",
    fallbackModelAlias: "default-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "文章内容",
          type: "textarea",
          required: true,
          placeholder: "粘贴需要摘要的文章正文"
        },
        {
          name: "format",
          label: "输出格式",
          type: "select",
          required: false,
          options: ["三段式摘要", "要点列表", "结论先行", "会议纪要"]
        }
      ]
    },
    promptTemplate:
      "请将下面文章整理为 {{format}}，保留关键信息，避免添加原文没有的事实。\n\n文章：\n{input}"
  },
  {
    name: "AI 文章润色",
    slug: "article-polish",
    description: "优化中文文章表达，让结构更清楚、语气更稳定。",
    categorySlug: "writing",
    sortOrder: 40,
    costCredits: 100,
    defaultModelAlias: "default-chat",
    fallbackModelAlias: "fast-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "待润色内容",
          type: "textarea",
          required: true,
          placeholder: "粘贴需要润色的正文"
        },
        {
          name: "tone",
          label: "目标语气",
          type: "select",
          required: false,
          options: ["克制专业", "更口语", "更有说服力", "更适合公众号"]
        },
        {
          name: "keepMeaning",
          label: "保持原意",
          type: "switch",
          required: false
        }
      ]
    },
    promptTemplate:
      "请将以下内容润色为 {{tone}} 的简体中文表达。{{keepMeaning}} 时必须严格保持原意，不新增事实。\n\n原文：\n{input}"
  },
  {
    name: "AI 小红书文案",
    slug: "xiaohongshu-copy",
    description: "根据产品或主题生成小红书风格的中文种草文案。",
    categorySlug: "marketing",
    sortOrder: 50,
    costCredits: 90,
    defaultModelAlias: "fast-chat",
    fallbackModelAlias: "default-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "产品或主题",
          type: "textarea",
          required: true,
          placeholder: "例如：一款帮助运营团队批量生成文章摘要的 AI 工具"
        },
        {
          name: "audience",
          label: "目标人群",
          type: "text",
          required: false,
          placeholder: "例如：内容运营、新媒体编辑"
        },
        {
          name: "style",
          label: "风格",
          type: "select",
          required: false,
          options: ["真实体验", "清单种草", "痛点解决", "教程分享"]
        }
      ]
    },
    promptTemplate:
      "请为 {{audience}} 写一篇 {{style}} 风格的小红书文案。要求自然、简体中文，不虚构使用数据。\n\n产品或主题：\n{input}"
  },
  {
    name: "AI SEO 标题描述生成",
    slug: "seo-title-description",
    description: "为文章、工具页或单页生成 SEO 标题、描述和关键词建议。",
    categorySlug: "seo",
    sortOrder: 60,
    costCredits: 70,
    defaultModelAlias: "fast-chat",
    fallbackModelAlias: "default-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "页面主题",
          type: "textarea",
          required: true,
          placeholder: "例如：AI 文案生成工具，面向中文运营团队"
        },
        {
          name: "keyword",
          label: "核心关键词",
          type: "text",
          required: false,
          placeholder: "例如：AI 文案生成"
        }
      ]
    },
    promptTemplate:
      "请围绕核心关键词 {{keyword}}，为以下页面生成 SEO 标题、SEO 描述和 5 个关键词建议。要求适合中文搜索，不做夸张承诺。\n\n页面主题：\n{input}"
  },
  {
    name: "AI 问答助手",
    slug: "qa-assistant",
    description: "根据问题和补充上下文给出简洁、可追溯的中文回答。",
    categorySlug: "education",
    sortOrder: 70,
    costCredits: 80,
    defaultModelAlias: "default-chat",
    fallbackModelAlias: "fast-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "问题",
          type: "textarea",
          required: true,
          placeholder: "请输入需要解答的问题"
        },
        {
          name: "context",
          label: "补充背景",
          type: "textarea",
          required: false,
          placeholder: "可粘贴资料、限制条件或已有结论"
        }
      ]
    },
    promptTemplate:
      "请基于补充背景回答问题。若背景不足，请明确说明不确定之处。\n\n问题：{input}\n\n补充背景：\n{{context}}\n\n知识库片段：\n{{knowledge}}"
  },
  {
    name: "AI 翻译",
    slug: "translation",
    description: "将文本翻译成指定语言，并尽量保持原文语气和格式。",
    categorySlug: "translation",
    sortOrder: 80,
    costCredits: 70,
    defaultModelAlias: "fast-chat",
    fallbackModelAlias: "default-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "待翻译文本",
          type: "textarea",
          required: true,
          placeholder: "粘贴需要翻译的文本"
        },
        {
          name: "targetLanguage",
          label: "目标语言",
          type: "select",
          required: true,
          options: ["简体中文", "英文", "日文", "韩文", "法文", "德文"]
        }
      ]
    },
    promptTemplate:
      "请将以下文本翻译为{{targetLanguage}}，尽量保持原文语气、格式和信息完整性。\n\n文本：\n{input}"
  },
  {
    name: "AI 英文润色",
    slug: "english-polish",
    description: "优化英文表达，适合邮件、产品说明和英文文章。",
    categorySlug: "translation",
    sortOrder: 90,
    costCredits: 80,
    defaultModelAlias: "default-chat",
    fallbackModelAlias: "fast-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "英文原文",
          type: "textarea",
          required: true,
          placeholder: "Paste English text here"
        },
        {
          name: "style",
          label: "目标风格",
          type: "select",
          required: false,
          options: ["Professional", "Concise", "Friendly", "Academic"]
        }
      ]
    },
    promptTemplate:
      "Please polish the following English text in a {{style}} style. Keep the original meaning and avoid adding unsupported facts.\n\nText:\n{input}"
  },
  {
    name: "AI 代码解释",
    slug: "code-explainer",
    description: "解释代码逻辑、关键函数和潜在风险，适合学习和代码评审前理解。",
    categorySlug: "programming",
    sortOrder: 100,
    costCredits: 90,
    defaultModelAlias: "default-chat",
    fallbackModelAlias: "fast-chat",
    requiredCapabilities: ["TEXT"],
    inputSchema: {
      fields: [
        {
          name: "input",
          label: "代码片段",
          type: "textarea",
          required: true,
          placeholder: "粘贴需要解释的代码"
        },
        {
          name: "language",
          label: "编程语言",
          type: "text",
          required: false,
          placeholder: "例如：TypeScript"
        },
        {
          name: "depth",
          label: "解释深度",
          type: "select",
          required: false,
          options: ["初学者", "工程师", "代码评审"]
        }
      ]
    },
    promptTemplate:
      "请用 {{depth}} 能理解的方式解释以下 {{language}} 代码，说明主要逻辑、关键函数、输入输出和潜在风险。\n\n代码：\n{input}"
  }
] as const;
