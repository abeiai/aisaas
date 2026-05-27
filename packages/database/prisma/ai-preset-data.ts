export const aiPresetVersion = "2026.05.22";

const pricingSources = {
  deepSeek: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/",
  aliyunModelStudio: "https://help.aliyun.com/zh/model-studio/model-pricing"
} as const;

const deepSeekV4FlashPricing = {
  mode: "TOKEN_CACHE",
  currency: "CNY",
  unit: "M_TOKENS",
  inputCacheHit: 0.02,
  inputCacheMiss: 1,
  output: 2,
  discountWindows: [
    {
      label: "优惠时段",
      timezone: "Asia/Shanghai",
      startTime: "16:30",
      endTime: "00:30",
      inputCacheHit: 0.01,
      inputCacheMiss: 0.5,
      output: 1
    }
  ],
  source: pricingSources.deepSeek,
  note: "DeepSeek V4 Flash 标准时段官方价格；优惠时段价格保存在 discountWindows 中。"
};

function aliyunTieredTokenPricing(
  tiers: Array<{
    label: string;
    minInputTokens: number;
    maxInputTokens: number | null;
    input: number;
    output: number;
    reasoningOutput?: number;
  }>,
  note: string
) {
  return {
    mode: "TOKEN_TIERED",
    currency: "CNY",
    unit: "M_TOKENS",
    tierBasis: "REQUEST_INPUT_TOKENS",
    tiers,
    source: pricingSources.aliyunModelStudio,
    note
  };
}

const qwenPlusPricing = aliyunTieredTokenPricing(
  [
    {
      label: "输入 <= 128K",
      minInputTokens: 0,
      maxInputTokens: 128000,
      input: 0.8,
      output: 2,
      reasoningOutput: 8
    },
    {
      label: "128K < 输入 <= 256K",
      minInputTokens: 128001,
      maxInputTokens: 256000,
      input: 4,
      output: 20,
      reasoningOutput: 24
    },
    {
      label: "256K < 输入 <= 1M",
      minInputTokens: 256001,
      maxInputTokens: 1000000,
      input: 10,
      output: 48,
      reasoningOutput: 64
    }
  ],
  "阿里云百炼 Qwen Plus 按单次请求输入 Token 总量分档；当前模型未标记推理能力，列表摘要使用非思考输出价格。"
);

const qwen36PlusPricing = aliyunTieredTokenPricing(
  [
    {
      label: "输入 <= 256K",
      minInputTokens: 0,
      maxInputTokens: 256000,
      input: 2,
      output: 12
    },
    {
      label: "256K < 输入 <= 1M",
      minInputTokens: 256001,
      maxInputTokens: 1000000,
      input: 8,
      output: 48
    }
  ],
  "阿里云百炼 Qwen3.6 Plus 按单次请求输入 Token 总量分档。"
);

const qwen36FlashPricing = aliyunTieredTokenPricing(
  [
    {
      label: "输入 <= 1M",
      minInputTokens: 0,
      maxInputTokens: 1000000,
      input: 0.5,
      output: 3
    }
  ],
  "阿里云百炼 Qwen3.6 Flash 按单次请求输入 Token 总量分档。"
);

const qwen36MaxPreviewPricing = aliyunTieredTokenPricing(
  [
    {
      label: "输入 <= 128K",
      minInputTokens: 0,
      maxInputTokens: 128000,
      input: 9,
      output: 54
    },
    {
      label: "128K < 输入 <= 256K",
      minInputTokens: 128001,
      maxInputTokens: 256000,
      input: 15,
      output: 90
    }
  ],
  "阿里云百炼 Qwen3.6 Max Preview 按单次请求输入 Token 总量分档。"
);

export const aiCapabilityTags = [
  "TEXT",
  "REASONING",
  "VISION",
  "EMBEDDING",
  "IMAGE_GENERATION",
  "IMAGE_EDIT",
  "IMAGE_INPUT",
  "REFERENCE_IMAGE",
  "BATCH_IMAGE",
  "VIDEO_GENERATION",
  "TEXT_TO_VIDEO",
  "IMAGE_TO_VIDEO",
  "REFERENCE_VIDEO",
  "VIDEO_EDIT",
  "VIDEO_INPUT",
  "REFERENCE_FILE",
  "REFERENCE_AUDIO",
  "AUDIO",
  "TTS",
  "VOICE_CLONE",
  "VOICE_DESIGN",
  "STREAMING_TTS",
  "SYSTEM_VOICE",
  "CUSTOM_VOICE",
  "TIMESTAMP",
  "SSML",
  "INSTRUCT",
  "MULTILINGUAL",
  "CHINA_MAINLAND",
  "INTERNATIONAL",
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
    aliasKey: "video-generation",
    displayName: "视频生成模型",
    description: "体验区视频生成、图生视频、参考生视频和视频编辑使用。"
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
  },
  {
    aliasKey: "tts-default",
    displayName: "默认语音合成模型",
    description: "语音合成默认模型，用于常规中文播报和内容配音。"
  },
  {
    aliasKey: "tts-fast",
    displayName: "快速语音合成模型",
    description: "低延迟语音合成模型，用于预览和快速生成。"
  },
  {
    aliasKey: "voice-clone-default",
    displayName: "默认声音复刻模型",
    description: "声音复刻任务默认模型，创建自定义音色时使用。"
  },
  {
    aliasKey: "voice-design-default",
    displayName: "默认声音设计模型",
    description: "声音设计任务默认模型，用于根据描述生成音色。"
  },
  {
    aliasKey: "audio-preview",
    displayName: "音频预览模型",
    description: "语音工具预览试听和低成本试生成使用。"
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
        pricingConfig: deepSeekV4FlashPricing,
        recommendedAlias: "fast-chat"
      },
      {
        modelKey: "deepseek-reasoner",
        displayName: "DeepSeek Reasoner",
        providerModelName: "deepseek-reasoner",
        capabilityTags: ["TEXT", "REASONING", "STREAMING", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        pricingConfig: deepSeekV4FlashPricing,
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
        modelKey: "happyhorse-1-0-t2v",
        displayName: "HappyHorse 1.0 文生视频",
        providerModelName: "happyhorse-1.0-t2v",
        capabilityTags: ["VIDEO_GENERATION", "TEXT_TO_VIDEO", "CHINA_FRIENDLY"],
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "happyhorse-1-0-i2v",
        displayName: "HappyHorse 1.0 图生视频",
        providerModelName: "happyhorse-1.0-i2v",
        capabilityTags: ["VIDEO_GENERATION", "IMAGE_TO_VIDEO", "IMAGE_INPUT", "REFERENCE_IMAGE", "CHINA_FRIENDLY"],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "happyhorse-1-0-r2v",
        displayName: "HappyHorse 1.0 参考生视频",
        providerModelName: "happyhorse-1.0-r2v",
        capabilityTags: ["VIDEO_GENERATION", "IMAGE_TO_VIDEO", "IMAGE_INPUT", "REFERENCE_IMAGE", "REFERENCE_FILE", "CHINA_FRIENDLY"],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "happyhorse-1-0-video-edit",
        displayName: "HappyHorse 1.0 视频编辑",
        providerModelName: "happyhorse-1.0-video-edit",
        capabilityTags: ["VIDEO_GENERATION", "VIDEO_EDIT", "VIDEO_INPUT", "REFERENCE_IMAGE", "REFERENCE_FILE", "CHINA_FRIENDLY"],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-t2v",
        displayName: "Wan2.7 文生视频",
        providerModelName: "wan2.7-t2v",
        capabilityTags: ["VIDEO_GENERATION", "TEXT_TO_VIDEO", "REFERENCE_AUDIO", "CHINA_FRIENDLY"],
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-t2v-2026-04-25",
        displayName: "Wan2.7 文生视频 2026-04-25",
        providerModelName: "wan2.7-t2v-2026-04-25",
        capabilityTags: ["VIDEO_GENERATION", "TEXT_TO_VIDEO", "REFERENCE_AUDIO", "CHINA_FRIENDLY"],
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-i2v",
        displayName: "Wan2.7 图生视频",
        providerModelName: "wan2.7-i2v",
        capabilityTags: [
          "VIDEO_GENERATION",
          "IMAGE_TO_VIDEO",
          "IMAGE_INPUT",
          "VIDEO_INPUT",
          "REFERENCE_IMAGE",
          "REFERENCE_VIDEO",
          "REFERENCE_AUDIO",
          "REFERENCE_FILE",
          "CHINA_FRIENDLY"
        ],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-i2v-2026-04-25",
        displayName: "Wan2.7 图生视频 2026-04-25",
        providerModelName: "wan2.7-i2v-2026-04-25",
        capabilityTags: [
          "VIDEO_GENERATION",
          "IMAGE_TO_VIDEO",
          "IMAGE_INPUT",
          "VIDEO_INPUT",
          "REFERENCE_IMAGE",
          "REFERENCE_VIDEO",
          "REFERENCE_AUDIO",
          "REFERENCE_FILE",
          "CHINA_FRIENDLY"
        ],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-r2v",
        displayName: "Wan2.7 参考生视频",
        providerModelName: "wan2.7-r2v",
        capabilityTags: [
          "VIDEO_GENERATION",
          "IMAGE_TO_VIDEO",
          "IMAGE_INPUT",
          "VIDEO_INPUT",
          "REFERENCE_IMAGE",
          "REFERENCE_VIDEO",
          "REFERENCE_AUDIO",
          "REFERENCE_FILE",
          "CHINA_FRIENDLY"
        ],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2-7-videoedit",
        displayName: "Wan2.7 视频编辑",
        providerModelName: "wan2.7-videoedit",
        capabilityTags: ["VIDEO_GENERATION", "VIDEO_EDIT", "VIDEO_INPUT", "REFERENCE_IMAGE", "REFERENCE_FILE", "CHINA_FRIENDLY"],
        supportsVision: true,
        recommendedAlias: "video-generation"
      },
      {
        modelKey: "wan2.7-image-pro",
        displayName: "Wan2.7 Image Pro",
        providerModelName: "wan2.7-image-pro",
        capabilityTags: ["IMAGE_GENERATION", "IMAGE_EDIT", "IMAGE_INPUT", "REFERENCE_IMAGE", "BATCH_IMAGE", "CHINA_FRIENDLY"],
        supportsImageGeneration: true,
        supportsVision: true,
        recommendedAlias: "image-generation"
      },
      {
        modelKey: "wan2.7-image",
        displayName: "Wan2.7 Image",
        providerModelName: "wan2.7-image",
        capabilityTags: ["IMAGE_GENERATION", "IMAGE_EDIT", "IMAGE_INPUT", "REFERENCE_IMAGE", "BATCH_IMAGE", "LOW_COST", "CHINA_FRIENDLY"],
        supportsImageGeneration: true,
        supportsVision: true,
        recommendedAlias: "image-generation"
      },
      {
        modelKey: "z-image-turbo",
        displayName: "Z-Image Turbo",
        providerModelName: "z-image-turbo",
        capabilityTags: ["IMAGE_GENERATION", "LOW_COST", "CHINA_FRIENDLY"],
        supportsImageGeneration: true,
        recommendedAlias: "image-generation"
      },
      {
        modelKey: "qwen-image-2.0-pro",
        displayName: "Qwen Image 2.0 Pro",
        providerModelName: "qwen-image-2.0-pro",
        capabilityTags: ["IMAGE_GENERATION", "IMAGE_EDIT", "IMAGE_INPUT", "REFERENCE_IMAGE", "BATCH_IMAGE", "CHINA_FRIENDLY"],
        supportsImageGeneration: true,
        supportsVision: true,
        recommendedAlias: "image-generation"
      },
      {
        modelKey: "qwen-image-2.0",
        displayName: "Qwen Image 2.0",
        providerModelName: "qwen-image-2.0",
        capabilityTags: ["IMAGE_GENERATION", "IMAGE_EDIT", "IMAGE_INPUT", "REFERENCE_IMAGE", "BATCH_IMAGE", "LOW_COST", "CHINA_FRIENDLY"],
        supportsImageGeneration: true,
        supportsVision: true,
        recommendedAlias: "image-generation"
      },
      {
        modelKey: "qwen-plus",
        displayName: "Qwen Plus",
        providerModelName: "qwen-plus",
        capabilityTags: ["TEXT", "TOOLS", "STREAMING", "CHINA_FRIENDLY"],
        supportsStreaming: true,
        supportsTools: true,
        pricingConfig: qwenPlusPricing,
        recommendedAlias: "default-chat"
      },
      {
        modelKey: "qwen3.6-plus",
        displayName: "Qwen3.6 Plus",
        providerModelName: "qwen3.6-plus",
        capabilityTags: ["TEXT", "VISION", "REASONING", "TOOLS", "STREAMING", "LONG_CONTEXT", "CHINA_FRIENDLY"],
        contextWindow: 1000000,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        pricingConfig: qwen36PlusPricing,
        recommendedAlias: "default-chat"
      },
      {
        modelKey: "qwen3.6-flash",
        displayName: "Qwen3.6 Flash",
        providerModelName: "qwen3.6-flash",
        capabilityTags: ["TEXT", "REASONING", "TOOLS", "STREAMING", "LONG_CONTEXT", "LOW_COST", "CHINA_FRIENDLY"],
        contextWindow: 1000000,
        supportsStreaming: true,
        supportsTools: true,
        pricingConfig: qwen36FlashPricing,
        recommendedAlias: "fast-chat"
      },
      {
        modelKey: "qwen3.6-max",
        displayName: "Qwen3.6 Max Preview",
        providerModelName: "qwen3.6-max-preview",
        capabilityTags: ["TEXT", "REASONING", "TOOLS", "STREAMING", "LONG_CONTEXT", "CHINA_FRIENDLY"],
        contextWindow: 256000,
        supportsStreaming: true,
        supportsTools: true,
        pricingConfig: qwen36MaxPreviewPricing,
        recommendedAlias: "reasoning"
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
  },
  {
    providerKey: "aliyun_dashscope_audio",
    displayName: "阿里云百炼语音",
    adapterType: "DASHSCOPE_AUDIO",
    modality: "AUDIO",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
    defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
    apiKeyEnvName: "DASHSCOPE_API_KEY",
    docsUrl: "https://help.aliyun.com/zh/model-studio/text-to-speech",
    region: "cn-beijing,intl-singapore",
    models: [
      {
        modelKey: "cosyvoice-v3-5-plus",
        displayName: "CosyVoice v3.5 Plus",
        providerModelName: "cosyvoice-v3.5-plus",
        capabilityTags: [
          "AUDIO",
          "TTS",
          "VOICE_CLONE",
          "VOICE_DESIGN",
          "STREAMING_TTS",
          "CUSTOM_VOICE",
          "TIMESTAMP",
          "SSML",
          "INSTRUCT",
          "MULTILINGUAL",
          "CHINA_MAINLAND",
          "INTERNATIONAL"
        ],
        supportsStreaming: true,
        supportsAudio: true,
        recommendedAlias: "tts-default"
      },
      {
        modelKey: "cosyvoice-v3-5-flash",
        displayName: "CosyVoice v3.5 Flash",
        providerModelName: "cosyvoice-v3.5-flash",
        capabilityTags: [
          "AUDIO",
          "TTS",
          "VOICE_CLONE",
          "VOICE_DESIGN",
          "STREAMING_TTS",
          "CUSTOM_VOICE",
          "MULTILINGUAL",
          "CHINA_MAINLAND",
          "INTERNATIONAL"
        ],
        supportsStreaming: true,
        supportsAudio: true,
        recommendedAlias: "tts-fast"
      },
      {
        modelKey: "cosyvoice-v3-plus",
        displayName: "CosyVoice v3 Plus",
        providerModelName: "cosyvoice-v3-plus",
        capabilityTags: [
          "AUDIO",
          "TTS",
          "VOICE_CLONE",
          "VOICE_DESIGN",
          "STREAMING_TTS",
          "SYSTEM_VOICE",
          "CUSTOM_VOICE",
          "TIMESTAMP",
          "SSML",
          "MULTILINGUAL",
          "CHINA_MAINLAND",
          "INTERNATIONAL"
        ],
        supportsStreaming: true,
        supportsAudio: true,
        recommendedAlias: "voice-clone-default"
      },
      {
        modelKey: "cosyvoice-v3-flash",
        displayName: "CosyVoice v3 Flash",
        providerModelName: "cosyvoice-v3-flash",
        capabilityTags: [
          "AUDIO",
          "TTS",
          "VOICE_CLONE",
          "VOICE_DESIGN",
          "STREAMING_TTS",
          "CUSTOM_VOICE",
          "MULTILINGUAL",
          "CHINA_MAINLAND",
          "INTERNATIONAL"
        ],
        supportsStreaming: true,
        supportsAudio: true,
        recommendedAlias: "audio-preview"
      },
      {
        modelKey: "cosyvoice-v2",
        displayName: "CosyVoice v2",
        providerModelName: "cosyvoice-v2",
        capabilityTags: ["AUDIO", "TTS", "VOICE_CLONE", "CUSTOM_VOICE", "STREAMING_TTS", "CHINA_MAINLAND"],
        supportsStreaming: true,
        supportsAudio: true,
        recommendedAlias: "voice-design-default"
      },
      {
        modelKey: "cosyvoice-v1",
        displayName: "CosyVoice v1",
        providerModelName: "cosyvoice-v1",
        capabilityTags: ["AUDIO", "TTS", "VOICE_CLONE", "CUSTOM_VOICE", "STREAMING_TTS", "CHINA_MAINLAND"],
        supportsStreaming: true,
        supportsAudio: true
      },
      {
        modelKey: "sambert",
        displayName: "Sambert",
        providerModelName: "sambert",
        capabilityTags: ["AUDIO", "TTS", "SYSTEM_VOICE", "SSML", "CHINA_MAINLAND"],
        supportsAudio: true,
        recommendedAlias: "text-to-speech"
      }
    ]
  }
] as const;
