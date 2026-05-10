export const aiPresetVersion = "2026.05";

export const aiCapabilityTags = [
  "TEXT",
  "REASONING",
  "VISION",
  "EMBEDDING",
  "IMAGE_GENERATION",
  "AUDIO",
  "TOOLS",
  "STREAMING",
  "LONG_CONTEXT",
  "LOW_COST",
  "CHINA_FRIENDLY",
  "GLOBAL"
] as const;

export const defaultModelAliases = [
  {
    aliasKey: "default-chat",
    displayName: "默认聊天模型",
    description: "通用文本生成、文案工具和默认 AI 场景使用。"
  },
  {
    aliasKey: "fast-chat",
    displayName: "快速聊天模型",
    description: "低成本、低延迟的短文本生成。"
  },
  {
    aliasKey: "reasoning",
    displayName: "推理模型",
    description: "需要复杂分析、规划和多步推理的场景。"
  },
  {
    aliasKey: "long-context",
    displayName: "长上下文模型",
    description: "需要处理长文档、长 Prompt 或复杂资料的场景。"
  },
  {
    aliasKey: "vision",
    displayName: "视觉理解模型",
    description: "图片理解和多模态输入场景。"
  },
  {
    aliasKey: "embedding",
    displayName: "向量模型",
    description: "知识库切块向量化和语义检索。"
  },
  {
    aliasKey: "image-generation",
    displayName: "图片生成模型",
    description: "图片生成或视觉创意产出。"
  },
  {
    aliasKey: "speech-to-text",
    displayName: "语音转文字模型",
    description: "音频转写和语音识别。"
  },
  {
    aliasKey: "text-to-speech",
    displayName: "文字转语音模型",
    description: "语音合成和播报场景。"
  }
];

export const providerPresets = [
  {
    providerKey: "openai",
    displayName: "OpenAI",
    adapterType: "OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyEnvName: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/docs/models",
    region: "GLOBAL",
    models: [
      {
        modelKey: "gpt-4o-mini",
        displayName: "GPT-4o mini",
        providerModelName: "gpt-4o-mini",
        capabilityTags: ["TEXT", "VISION", "TOOLS", "STREAMING", "LOW_COST", "GLOBAL"],
        contextWindow: 128000,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        recommendedAlias: "default-chat"
      },
      {
        modelKey: "text-embedding-3-small",
        displayName: "Text Embedding 3 Small",
        providerModelName: "text-embedding-3-small",
        capabilityTags: ["EMBEDDING", "LOW_COST", "GLOBAL"],
        supportsEmbedding: true,
        recommendedAlias: "embedding"
      }
    ]
  },
  {
    providerKey: "deepseek",
    displayName: "DeepSeek",
    adapterType: "OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    apiKeyEnvName: "DEEPSEEK_API_KEY",
    docsUrl: "https://api-docs.deepseek.com/",
    region: "CHINA",
    models: [
      {
        modelKey: "deepseek-chat",
        displayName: "DeepSeek Chat",
        providerModelName: "deepseek-chat",
        capabilityTags: ["TEXT", "STREAMING", "LOW_COST", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        recommendedAlias: "fast-chat"
      },
      {
        modelKey: "deepseek-reasoner",
        displayName: "DeepSeek Reasoner",
        providerModelName: "deepseek-reasoner",
        capabilityTags: ["TEXT", "REASONING", "STREAMING", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        recommendedAlias: "reasoning"
      }
    ]
  },
  {
    providerKey: "dashscope",
    displayName: "通义千问 DashScope",
    adapterType: "OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnvName: "DASHSCOPE_API_KEY",
    docsUrl: "https://help.aliyun.com/zh/model-studio/",
    region: "CHINA",
    models: [
      {
        modelKey: "qwen-plus",
        displayName: "Qwen Plus",
        providerModelName: "qwen-plus",
        capabilityTags: ["TEXT", "TOOLS", "STREAMING", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        supportsTools: true,
        recommendedAlias: "default-chat"
      },
      {
        modelKey: "qwen-vl-plus",
        displayName: "Qwen VL Plus",
        providerModelName: "qwen-vl-plus",
        capabilityTags: ["TEXT", "VISION", "STREAMING", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        supportsVision: true,
        recommendedAlias: "vision"
      }
    ]
  },
  {
    providerKey: "moonshot",
    displayName: "Moonshot Kimi",
    adapterType: "OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnvName: "MOONSHOT_API_KEY",
    docsUrl: "https://platform.moonshot.cn/docs/",
    region: "CHINA",
    models: [
      {
        modelKey: "moonshot-v1-8k",
        displayName: "Moonshot v1 8K",
        providerModelName: "moonshot-v1-8k",
        capabilityTags: ["TEXT", "STREAMING", "CHINA_FRIENDLY"],
        contextWindow: 8192,
        supportsStreaming: true,
        recommendedAlias: "fast-chat"
      },
      {
        modelKey: "moonshot-v1-128k",
        displayName: "Moonshot v1 128K",
        providerModelName: "moonshot-v1-128k",
        capabilityTags: ["TEXT", "STREAMING", "LONG_CONTEXT", "CHINA_FRIENDLY"],
        contextWindow: 128000,
        supportsStreaming: true,
        recommendedAlias: "long-context"
      }
    ]
  },
  {
    providerKey: "openrouter",
    displayName: "OpenRouter",
    adapterType: "OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvName: "OPENROUTER_API_KEY",
    docsUrl: "https://openrouter.ai/docs",
    region: "GLOBAL",
    models: [
      {
        modelKey: "openai-gpt-4o-mini",
        displayName: "OpenAI GPT-4o mini via OpenRouter",
        providerModelName: "openai/gpt-4o-mini",
        capabilityTags: ["TEXT", "VISION", "TOOLS", "STREAMING", "LOW_COST", "GLOBAL"],
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        recommendedAlias: "default-chat"
      }
    ]
  },
  {
    providerKey: "anthropic",
    displayName: "Anthropic Claude",
    adapterType: "ANTHROPIC",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    apiKeyEnvName: "ANTHROPIC_API_KEY",
    docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    region: "GLOBAL",
    models: [
      {
        modelKey: "claude-3-5-sonnet-latest",
        displayName: "Claude 3.5 Sonnet",
        providerModelName: "claude-3-5-sonnet-latest",
        capabilityTags: ["TEXT", "REASONING", "VISION", "TOOLS", "STREAMING", "GLOBAL"],
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        recommendedAlias: "reasoning"
      }
    ]
  },
  {
    providerKey: "gemini",
    displayName: "Google Gemini",
    adapterType: "GEMINI",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnvName: "GEMINI_API_KEY",
    docsUrl: "https://ai.google.dev/gemini-api/docs/models",
    region: "GLOBAL",
    models: [
      {
        modelKey: "gemini-1-5-flash",
        displayName: "Gemini 1.5 Flash",
        providerModelName: "gemini-1.5-flash",
        capabilityTags: ["TEXT", "VISION", "STREAMING", "LOW_COST", "GLOBAL"],
        supportsStreaming: true,
        supportsVision: true,
        recommendedAlias: "vision"
      }
    ]
  },
  {
    providerKey: "custom-openai-compatible",
    displayName: "自定义 OpenAI-compatible",
    adapterType: "CUSTOM_OPENAI_COMPATIBLE",
    defaultBaseUrl: "https://api.example.com/v1",
    apiKeyEnvName: "CUSTOM_OPENAI_API_KEY",
    docsUrl: "",
    region: "CUSTOM",
    models: [
      {
        modelKey: "custom-chat-model",
        displayName: "自定义聊天模型",
        providerModelName: "custom-chat-model",
        capabilityTags: ["TEXT", "STREAMING"],
        supportsStreaming: true,
        recommendedAlias: "default-chat"
      }
    ]
  }
] as const;
