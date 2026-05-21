export const cosyVoiceV35PresetPrefix = "cosyvoice-v35:";

export interface CosyVoiceV35Preset {
  id: string;
  value: string;
  name: string;
  description: string;
  prompt: string;
  previewText: string;
}

export const cosyVoiceV35Presets: CosyVoiceV35Preset[] = [
  {
    id: "announcer",
    value: `${cosyVoiceV35PresetPrefix}announcer`,
    name: "v3.5 播报女声",
    description: "清晰、稳定、专业的中文播报音色，适合资讯、课程和产品说明。",
    prompt: "中文普通话女声，专业播音员风格，吐字清晰，语速稳定，声音明亮自然，适合新闻播报、课程旁白和产品介绍。",
    previewText: "欢迎使用 AI SaaS 语音合成体验区，这是一段用于试听音色风格的示范文本。"
  },
  {
    id: "narrator",
    value: `${cosyVoiceV35PresetPrefix}narrator`,
    name: "v3.5 温柔旁白",
    description: "温柔、有亲和力的中文旁白音色，适合故事、短视频和品牌内容。",
    prompt: "中文普通话女声，温柔亲切，气息自然，语调有轻微起伏，适合故事旁白、短视频解说和生活方式内容。",
    previewText: "晚风轻轻吹过城市的街角，声音把文字变成一段可以被听见的故事。"
  },
  {
    id: "teacher",
    value: `${cosyVoiceV35PresetPrefix}teacher`,
    name: "v3.5 知识讲解",
    description: "知性、耐听、节奏稳的讲解音色，适合教育培训和知识类内容。",
    prompt: "中文普通话女声，知性沉稳，表达清楚，节奏适中，带有耐心讲解感，适合在线课程、知识科普和培训内容。",
    previewText: "接下来我们用一个简单例子，帮助你快速理解这个概念的使用方法。"
  },
  {
    id: "business",
    value: `${cosyVoiceV35PresetPrefix}business`,
    name: "v3.5 商务男声",
    description: "沉稳可信的中文男声，适合品牌介绍、商业演示和企业视频。",
    prompt: "中文普通话男声，沉稳专业，声音干净有力量，语气可信，语速适中，适合品牌宣传、商业演示和企业介绍。",
    previewText: "我们致力于用可靠的 AI 能力，帮助团队更高效地完成内容生产和业务运营。"
  },
  {
    id: "customer",
    value: `${cosyVoiceV35PresetPrefix}customer`,
    name: "v3.5 客服助理",
    description: "亲和、清楚、服务感强的中文音色，适合客服、引导和产品提示。",
    prompt: "中文普通话女声，亲和自然，服务感强，语气礼貌清楚，情绪稳定，适合客服引导、产品提示和帮助中心语音。",
    previewText: "您好，请按照页面提示完成操作，如需帮助，可以随时联系我们的在线客服。"
  },
  {
    id: "story",
    value: `${cosyVoiceV35PresetPrefix}story`,
    name: "v3.5 故事男声",
    description: "有画面感和叙事感的中文男声，适合有声书、故事和剧情旁白。",
    prompt: "中文普通话男声，富有叙事感，情绪细腻，语速中等偏慢，适合有声书、故事讲述和剧情旁白。",
    previewText: "那天傍晚，天边的云慢慢散开，远处传来一阵熟悉又陌生的脚步声。"
  }
];

export function getCosyVoiceV35Preset(value: string) {
  return cosyVoiceV35Presets.find((preset) => preset.value === value) ?? null;
}
