export const cosyVoiceLanguages = ["普通话", "粤语", "闽南语", "英式英语", "美式英语", "日语", "韩语"] as const;

export const cosyVoiceAgeCategories = ["儿童", "青年", "中年", "老年"] as const;

export type CosyVoiceLanguage = (typeof cosyVoiceLanguages)[number];
export type CosyVoiceAgeCategory = (typeof cosyVoiceAgeCategories)[number];

export interface CosyVoiceSystemVoice {
  id: string;
  providerVoiceId: string;
  name: string;
  type: "SYSTEM";
  targetModel: string;
  supportedModels: readonly string[];
  sourceModels: readonly string[];
  status: "READY";
  visibility: "PUBLIC";
  language: string;
  languages: readonly CosyVoiceLanguage[];
  description: string;
  trait: string;
  scene: string;
  age: string;
  ageCategory: CosyVoiceAgeCategory | null;
  avatarUrl: string | null;
  ssmlSupported: boolean;
  instructSupported: boolean;
  timestampSupported: boolean;
  previewAudioUrl: string;
}

export const cosyVoiceSystemVoices = [
  {
    "id": "sys-longanyang",
    "providerVoiceId": "longanyang",
    "name": "龙安洋",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴（标杆音色） · 阳光大男孩",
    "trait": "阳光大男孩",
    "scene": "社交陪伴（标杆音色）",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": true,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanyang.mp3"
  },
  {
    "id": "sys-longanhuan",
    "providerVoiceId": "longanhuan",
    "name": "龙安欢",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴（标杆音色） · 欢脱元气女",
    "trait": "欢脱元气女",
    "scene": "社交陪伴（标杆音色）",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": true,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanhuan.mp3"
  },
  {
    "id": "sys-longhuhu_v3",
    "providerVoiceId": "longhuhu_v3",
    "name": "龙呼呼",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "童声（标杆音色） · 天真烂漫女童",
    "trait": "天真烂漫女童",
    "scene": "童声（标杆音色）",
    "age": "6~10岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": true,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longhuhu_v3.mp3"
  },
  {
    "id": "sys-longpaopao_v3",
    "providerVoiceId": "longpaopao_v3",
    "name": "龙泡泡",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "智能玩具/儿童故事机 · 飞天泡泡音",
    "trait": "飞天泡泡音",
    "scene": "智能玩具/儿童故事机",
    "age": "6~15岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longpaopao_v3.mp3"
  },
  {
    "id": "sys-longjielidou_v3",
    "providerVoiceId": "longjielidou_v3",
    "name": "龙杰力豆",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "智能玩具/儿童故事机 · 阳光顽皮男",
    "trait": "阳光顽皮男",
    "scene": "智能玩具/儿童故事机",
    "age": "10岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longjielidou_v3.mp3"
  },
  {
    "id": "sys-longxian_v3",
    "providerVoiceId": "longxian_v3",
    "name": "龙仙",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "智能玩具/儿童故事机 · 豪放可爱女",
    "trait": "豪放可爱女",
    "scene": "智能玩具/儿童故事机",
    "age": "12岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longxian_v3.mp3"
  },
  {
    "id": "sys-longling_v3",
    "providerVoiceId": "longling_v3",
    "name": "龙铃",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "智能玩具/儿童故事机 · 稚气呆板女",
    "trait": "稚气呆板女",
    "scene": "智能玩具/儿童故事机",
    "age": "10岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longling_v3.mp3"
  },
  {
    "id": "sys-longshanshan_v3",
    "providerVoiceId": "longshanshan_v3",
    "name": "龙闪闪",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "消费电子-儿童有声书 · 戏剧化童声",
    "trait": "戏剧化童声",
    "scene": "消费电子-儿童有声书",
    "age": "6~15岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longshanshan_v3.mp3"
  },
  {
    "id": "sys-longniuniu_v3",
    "providerVoiceId": "longniuniu_v3",
    "name": "龙牛牛",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "消费电子-儿童有声书 · 阳光男童声",
    "trait": "阳光男童声",
    "scene": "消费电子-儿童有声书",
    "age": "6~15岁",
    "ageCategory": "儿童",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longniuniu_v3.mp3"
  },
  {
    "id": "sys-longjiaxin_v3",
    "providerVoiceId": "longjiaxin_v3",
    "name": "龙嘉欣",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（粤语）、英文",
    "languages": [
      "粤语",
      "美式英语"
    ],
    "description": "方言 · 优雅粤语女",
    "trait": "优雅粤语女",
    "scene": "方言",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longjiaxin_v3.mp3"
  },
  {
    "id": "sys-longjiayi_v3",
    "providerVoiceId": "longjiayi_v3",
    "name": "龙嘉怡",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（粤语）、英文",
    "languages": [
      "粤语",
      "美式英语"
    ],
    "description": "方言 · 知性粤语女",
    "trait": "知性粤语女",
    "scene": "方言",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longjiayi_v3.mp3"
  },
  {
    "id": "sys-longanyue_v3",
    "providerVoiceId": "longanyue_v3",
    "name": "龙安粤",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（粤语）、英文",
    "languages": [
      "粤语",
      "美式英语"
    ],
    "description": "方言 · 欢脱粤语男",
    "trait": "欢脱粤语男",
    "scene": "方言",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanyue_v3.mp3"
  },
  {
    "id": "sys-longlaotie_v3",
    "providerVoiceId": "longlaotie_v3",
    "name": "龙老铁",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（东北话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "方言 · 东北直率男",
    "trait": "东北直率男",
    "scene": "方言",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longlaotie_v3.mp3"
  },
  {
    "id": "sys-longshange_v3",
    "providerVoiceId": "longshange_v3",
    "name": "龙陕哥",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（陕西话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "方言 · 原味陕北男",
    "trait": "原味陕北男",
    "scene": "方言",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longshange_v3.mp3"
  },
  {
    "id": "sys-longanmin_v3",
    "providerVoiceId": "longanmin_v3",
    "name": "龙安闽",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（闽南话）、英文",
    "languages": [
      "闽南语",
      "美式英语"
    ],
    "description": "方言 · 清纯萝莉女",
    "trait": "清纯萝莉女",
    "scene": "方言",
    "age": "18~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanmin_v3.mp3"
  },
  {
    "id": "sys-loongkyong_v3",
    "providerVoiceId": "loongkyong_v3",
    "name": "loongkyong",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "韩语",
    "languages": [
      "韩语"
    ],
    "description": "出海营销 · 韩语女",
    "trait": "韩语女",
    "scene": "出海营销",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongkyong_v3.mp3"
  },
  {
    "id": "sys-loongriko_v3",
    "providerVoiceId": "loongriko_v3",
    "name": "Riko",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "日语",
    "languages": [
      "日语"
    ],
    "description": "出海营销 · 二次元霓虹女",
    "trait": "二次元霓虹女",
    "scene": "出海营销",
    "age": "18~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongriko_v3.mp3"
  },
  {
    "id": "sys-loongtomoka_v3",
    "providerVoiceId": "loongtomoka_v3",
    "name": "loongtomoka",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "日语",
    "languages": [
      "日语"
    ],
    "description": "出海营销 · 日语女",
    "trait": "日语女",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongtomoka_v3.mp3"
  },
  {
    "id": "sys-loongabby_v3",
    "providerVoiceId": "loongabby_v3",
    "name": "loongabby",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongabby_v3.wav"
  },
  {
    "id": "sys-loongandy_v3",
    "providerVoiceId": "loongandy_v3",
    "name": "loongandy",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文男",
    "trait": "美式英文男",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongandy_v3.wav"
  },
  {
    "id": "sys-loongannie_v3",
    "providerVoiceId": "loongannie_v3",
    "name": "loongannie",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongannie_v3.wav"
  },
  {
    "id": "sys-loongava_v3",
    "providerVoiceId": "loongava_v3",
    "name": "loongava",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongava_v3.wav"
  },
  {
    "id": "sys-loongbeth_v3",
    "providerVoiceId": "loongbeth_v3",
    "name": "loongbeth",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongbeth_v3.wav"
  },
  {
    "id": "sys-loongbetty_v3",
    "providerVoiceId": "loongbetty_v3",
    "name": "loongbetty",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongbetty_v3.wav"
  },
  {
    "id": "sys-loongcally_v3",
    "providerVoiceId": "loongcally_v3",
    "name": "loongcally",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongcally_v3.wav"
  },
  {
    "id": "sys-loongcindy_v3",
    "providerVoiceId": "loongcindy_v3",
    "name": "loongcindy",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongcindy_v3.wav"
  },
  {
    "id": "sys-loongdavid_v3",
    "providerVoiceId": "loongdavid_v3",
    "name": "loongdavid",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文男",
    "trait": "美式英文男",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongdavid_v3.wav"
  },
  {
    "id": "sys-loongdonna_v3",
    "providerVoiceId": "loongdonna_v3",
    "name": "loongdonna",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "美式英语",
    "languages": [
      "美式英语"
    ],
    "description": "出海营销 · 美式英文女",
    "trait": "美式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongdonna_v3.wav"
  },
  {
    "id": "sys-loongemily_v3",
    "providerVoiceId": "loongemily_v3",
    "name": "loongemily",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "英式英语",
    "languages": [
      "英式英语"
    ],
    "description": "出海营销 · 英式英文女",
    "trait": "英式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongemily_v3.wav"
  },
  {
    "id": "sys-loongeric_v3",
    "providerVoiceId": "loongeric_v3",
    "name": "loongeric",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "英式英语",
    "languages": [
      "英式英语"
    ],
    "description": "出海营销 · 英式英文男",
    "trait": "英式英文男",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongeric_v3.wav"
  },
  {
    "id": "sys-loongluna_v3",
    "providerVoiceId": "loongluna_v3",
    "name": "loongluna",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "英式英语",
    "languages": [
      "英式英语"
    ],
    "description": "出海营销 · 英式英文女",
    "trait": "英式英文女",
    "scene": "出海营销",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongluna_v3.wav"
  },
  {
    "id": "sys-loongluca_v3",
    "providerVoiceId": "loongluca_v3",
    "name": "loongluca",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "英式英语",
    "languages": [
      "英式英语"
    ],
    "description": "出海营销 · 英式英文男",
    "trait": "英式英文男",
    "scene": "出海营销",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongluca_v3.wav"
  },
  {
    "id": "sys-loongtomoya_v3",
    "providerVoiceId": "loongtomoya_v3",
    "name": "loongtomoya",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "日语",
    "languages": [
      "日语"
    ],
    "description": "出海营销 · 日语男",
    "trait": "日语男",
    "scene": "出海营销",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongtomoya_v3.wav"
  },
  {
    "id": "sys-loongyuuna_v3",
    "providerVoiceId": "loongyuuna_v3",
    "name": "Yuuna",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "日语",
    "languages": [
      "日语"
    ],
    "description": "出海营销 · 日语女",
    "trait": "日语女",
    "scene": "出海营销",
    "age": "18~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongyuuna_v3.wav"
  },
  {
    "id": "sys-loongyuuma_v3",
    "providerVoiceId": "loongyuuma_v3",
    "name": "Yuuma",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "日语",
    "languages": [
      "日语"
    ],
    "description": "出海营销 · 日语男",
    "trait": "日语男",
    "scene": "出海营销",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongyuuma_v3.wav"
  },
  {
    "id": "sys-loongjihun_v3",
    "providerVoiceId": "loongjihun_v3",
    "name": "Jihun",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "韩语",
    "languages": [
      "韩语"
    ],
    "description": "出海营销 · 韩语男",
    "trait": "韩语男",
    "scene": "出海营销",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongjihun_v3.wav"
  },
  {
    "id": "sys-loongindah_v3",
    "providerVoiceId": "loongindah_v3",
    "name": "loongindah",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "印尼语",
    "languages": [],
    "description": "出海营销 · 印尼女",
    "trait": "印尼女",
    "scene": "出海营销",
    "age": "22~27岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": false,
    "instructSupported": false,
    "timestampSupported": false,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongindah_v3.wav"
  },
  {
    "id": "sys-longfei_v3",
    "providerVoiceId": "longfei_v3",
    "name": "龙飞",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "诗词朗诵 · 热血磁性男",
    "trait": "热血磁性男",
    "scene": "诗词朗诵",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longfei_v3.mp3"
  },
  {
    "id": "sys-longyingxiao_v3",
    "providerVoiceId": "longyingxiao_v3",
    "name": "龙应笑",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "电话销售 · 清甜推销女",
    "trait": "清甜推销女",
    "scene": "电话销售",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingxiao_v3.mp3"
  },
  {
    "id": "sys-longyingxun_v3",
    "providerVoiceId": "longyingxun_v3",
    "name": "龙应询",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "客服 · 年轻青涩男",
    "trait": "年轻青涩男",
    "scene": "客服",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingxun_v3.mp3"
  },
  {
    "id": "sys-longyingjing_v3",
    "providerVoiceId": "longyingjing_v3",
    "name": "龙应静",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "客服 · 低调冷静女",
    "trait": "低调冷静女",
    "scene": "客服",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingjing_v3.mp3"
  },
  {
    "id": "sys-longyingling_v3",
    "providerVoiceId": "longyingling_v3",
    "name": "龙应聆",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "客服 · 温和共情女",
    "trait": "温和共情女",
    "scene": "客服",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingling_v3.mp3"
  },
  {
    "id": "sys-longyingtao_v3",
    "providerVoiceId": "longyingtao_v3",
    "name": "龙应桃",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "客服 · 温柔淡定女",
    "trait": "温柔淡定女",
    "scene": "客服",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingtao_v3.mp3"
  },
  {
    "id": "sys-longxiaochun_v3",
    "providerVoiceId": "longxiaochun_v3",
    "name": "龙小淳",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 知性积极女",
    "trait": "知性积极女",
    "scene": "语音助手",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longxiaochun_v3.mp3"
  },
  {
    "id": "sys-longxiaoxia_v3",
    "providerVoiceId": "longxiaoxia_v3",
    "name": "龙小夏",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 沉稳权威女",
    "trait": "沉稳权威女",
    "scene": "语音助手",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longxiaoxia_v3.mp3"
  },
  {
    "id": "sys-longyumi_v3",
    "providerVoiceId": "longyumi_v3",
    "name": "YUMI",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 正经青年女",
    "trait": "正经青年女",
    "scene": "语音助手",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyumi_v3.mp3"
  },
  {
    "id": "sys-longanyun_v3",
    "providerVoiceId": "longanyun_v3",
    "name": "龙安昀",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 居家暖男",
    "trait": "居家暖男",
    "scene": "语音助手",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanyun_v3.mp3"
  },
  {
    "id": "sys-longanwen_v3",
    "providerVoiceId": "longanwen_v3",
    "name": "龙安温",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 优雅知性女",
    "trait": "优雅知性女",
    "scene": "语音助手",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanwen_v3.mp3"
  },
  {
    "id": "sys-longanli_v3",
    "providerVoiceId": "longanli_v3",
    "name": "龙安莉",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 利落从容女",
    "trait": "利落从容女",
    "scene": "语音助手",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanli_v3.mp3"
  },
  {
    "id": "sys-longanlang_v3",
    "providerVoiceId": "longanlang_v3",
    "name": "龙安朗",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 清爽利落男",
    "trait": "清爽利落男",
    "scene": "语音助手",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanlang_v3.mp3"
  },
  {
    "id": "sys-longyingmu_v3",
    "providerVoiceId": "longyingmu_v3",
    "name": "龙应沐",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "语音助手 · 优雅知性女",
    "trait": "优雅知性女",
    "scene": "语音助手",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyingmu_v3.mp3"
  },
  {
    "id": "sys-longantai_v3",
    "providerVoiceId": "longantai_v3",
    "name": "龙安台",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 嗲甜台湾女",
    "trait": "嗲甜台湾女",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longantai_v3.mp3"
  },
  {
    "id": "sys-longhua_v3",
    "providerVoiceId": "longhua_v3",
    "name": "龙华",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 元气甜美女",
    "trait": "元气甜美女",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longhua_v3.mp3"
  },
  {
    "id": "sys-longcheng_v3",
    "providerVoiceId": "longcheng_v3",
    "name": "龙橙",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 智慧青年男",
    "trait": "智慧青年男",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longcheng_v3.mp3"
  },
  {
    "id": "sys-longze_v3",
    "providerVoiceId": "longze_v3",
    "name": "龙泽",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 温暖元气男",
    "trait": "温暖元气男",
    "scene": "社交陪伴",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longze_v3.mp3"
  },
  {
    "id": "sys-longzhe_v3",
    "providerVoiceId": "longzhe_v3",
    "name": "龙哲",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 呆板大暖男",
    "trait": "呆板大暖男",
    "scene": "社交陪伴",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longzhe_v3.mp3"
  },
  {
    "id": "sys-longyan_v3",
    "providerVoiceId": "longyan_v3",
    "name": "龙颜",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 温暖春风女",
    "trait": "温暖春风女",
    "scene": "社交陪伴",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyan_v3.mp3"
  },
  {
    "id": "sys-longxing_v3",
    "providerVoiceId": "longxing_v3",
    "name": "龙星",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 温婉邻家女",
    "trait": "温婉邻家女",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longxing_v3.mp3"
  },
  {
    "id": "sys-longtian_v3",
    "providerVoiceId": "longtian_v3",
    "name": "龙天",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 磁性理智男",
    "trait": "磁性理智男",
    "scene": "社交陪伴",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longtian_v3.mp3"
  },
  {
    "id": "sys-longwan_v3",
    "providerVoiceId": "longwan_v3",
    "name": "龙婉",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 细腻柔声女",
    "trait": "细腻柔声女",
    "scene": "社交陪伴",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longwan_v3.mp3"
  },
  {
    "id": "sys-longqiang_v3",
    "providerVoiceId": "longqiang_v3",
    "name": "龙嫱",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 浪漫风情女",
    "trait": "浪漫风情女",
    "scene": "社交陪伴",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longqiang_v3.mp3"
  },
  {
    "id": "sys-longfeifei_v3",
    "providerVoiceId": "longfeifei_v3",
    "name": "龙菲菲",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 甜美娇气女",
    "trait": "甜美娇气女",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longfeifei_v3.mp3"
  },
  {
    "id": "sys-longhao_v3",
    "providerVoiceId": "longhao_v3",
    "name": "龙浩",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 多情忧郁男",
    "trait": "多情忧郁男",
    "scene": "社交陪伴",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longhao_v3.mp3"
  },
  {
    "id": "sys-longanrou_v3",
    "providerVoiceId": "longanrou_v3",
    "name": "龙安柔",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 温柔闺蜜女",
    "trait": "温柔闺蜜女",
    "scene": "社交陪伴",
    "age": "20~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanrou_v3.mp3"
  },
  {
    "id": "sys-longhan_v3",
    "providerVoiceId": "longhan_v3",
    "name": "龙寒",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 温暖痴情男",
    "trait": "温暖痴情男",
    "scene": "社交陪伴",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longhan_v3.mp3"
  },
  {
    "id": "sys-longanzhi_v3",
    "providerVoiceId": "longanzhi_v3",
    "name": "龙安智",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 睿智轻熟男",
    "trait": "睿智轻熟男",
    "scene": "社交陪伴",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanzhi_v3.mp3"
  },
  {
    "id": "sys-longanling_v3",
    "providerVoiceId": "longanling_v3",
    "name": "龙安灵",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 思维灵动女",
    "trait": "思维灵动女",
    "scene": "社交陪伴",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanling_v3.mp3"
  },
  {
    "id": "sys-longanya_v3",
    "providerVoiceId": "longanya_v3",
    "name": "龙安雅",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 高雅气质女",
    "trait": "高雅气质女",
    "scene": "社交陪伴",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanya_v3.mp3"
  },
  {
    "id": "sys-longanqin_v3",
    "providerVoiceId": "longanqin_v3",
    "name": "龙安亲",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "社交陪伴 · 亲和活泼女",
    "trait": "亲和活泼女",
    "scene": "社交陪伴",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanqin_v3.mp3"
  },
  {
    "id": "sys-longmiao_v3",
    "providerVoiceId": "longmiao_v3",
    "name": "龙妙",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 抑扬顿挫女",
    "trait": "抑扬顿挫女",
    "scene": "有声书",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longmiao_v3.mp3"
  },
  {
    "id": "sys-longsanshu_v3",
    "providerVoiceId": "longsanshu_v3",
    "name": "龙三叔",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 沉稳质感男",
    "trait": "沉稳质感男",
    "scene": "有声书",
    "age": "25~45岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longsanshu_v3.mp3"
  },
  {
    "id": "sys-longyuan_v3",
    "providerVoiceId": "longyuan_v3",
    "name": "龙媛",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 温暖治愈女",
    "trait": "温暖治愈女",
    "scene": "有声书",
    "age": "35~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyuan_v3.mp3"
  },
  {
    "id": "sys-longyue_v3",
    "providerVoiceId": "longyue_v3",
    "name": "龙悦",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 温暖磁性女",
    "trait": "温暖磁性女",
    "scene": "有声书",
    "age": "30~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyue_v3.mp3"
  },
  {
    "id": "sys-longxiu_v3",
    "providerVoiceId": "longxiu_v3",
    "name": "龙修",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 博才说书男",
    "trait": "博才说书男",
    "scene": "有声书",
    "age": "25~35岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longxiu_v3.mp3"
  },
  {
    "id": "sys-longnan_v3",
    "providerVoiceId": "longnan_v3",
    "name": "龙楠",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 睿智青年男",
    "trait": "睿智青年男",
    "scene": "有声书",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longnan_v3.mp3"
  },
  {
    "id": "sys-longwanjun_v3",
    "providerVoiceId": "longwanjun_v3",
    "name": "龙婉君",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 细腻柔声女",
    "trait": "细腻柔声女",
    "scene": "有声书",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longwanjun_v3.mp3"
  },
  {
    "id": "sys-longyichen_v3",
    "providerVoiceId": "longyichen_v3",
    "name": "龙逸尘",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 洒脱活力男",
    "trait": "洒脱活力男",
    "scene": "有声书",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longyichen_v3.mp3"
  },
  {
    "id": "sys-longlaobo_v3",
    "providerVoiceId": "longlaobo_v3",
    "name": "龙老伯",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 沧桑岁月爷",
    "trait": "沧桑岁月爷",
    "scene": "有声书",
    "age": "60岁以上",
    "ageCategory": "老年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longlaobo_v3.mp3"
  },
  {
    "id": "sys-longlaoyi_v3",
    "providerVoiceId": "longlaoyi_v3",
    "name": "龙老姨",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "有声书 · 烟火从容阿姨",
    "trait": "烟火从容阿姨",
    "scene": "有声书",
    "age": "60岁以上",
    "ageCategory": "老年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longlaoyi_v3.mp3"
  },
  {
    "id": "sys-longjiqi_v3",
    "providerVoiceId": "longjiqi_v3",
    "name": "龙机器",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "短视频配音 · 呆萌机器人",
    "trait": "呆萌机器人",
    "scene": "短视频配音",
    "age": "20~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longjiqi_v3.mp3"
  },
  {
    "id": "sys-longhouge_v3",
    "providerVoiceId": "longhouge_v3",
    "name": "龙猴哥",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "短视频配音 · 经典猴哥",
    "trait": "经典猴哥",
    "scene": "短视频配音",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longhouge_v3.mp3"
  },
  {
    "id": "sys-longdaiyu_v3",
    "providerVoiceId": "longdaiyu_v3",
    "name": "龙黛玉",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "短视频配音 · 娇率才女音",
    "trait": "娇率才女音",
    "scene": "短视频配音",
    "age": "15~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longdaiyu_v3.mp3"
  },
  {
    "id": "sys-longanran_v3",
    "providerVoiceId": "longanran_v3",
    "name": "龙安燃",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "直播带货 · 活泼质感女",
    "trait": "活泼质感女",
    "scene": "直播带货",
    "age": "30~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanran_v3.mp3"
  },
  {
    "id": "sys-longanxuan_v3",
    "providerVoiceId": "longanxuan_v3",
    "name": "龙安宣",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "直播带货 · 经典直播女",
    "trait": "经典直播女",
    "scene": "直播带货",
    "age": "30~40岁",
    "ageCategory": "中年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longanxuan_v3.mp3"
  },
  {
    "id": "sys-longshuo_v3",
    "providerVoiceId": "longshuo_v3",
    "name": "龙硕",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "新闻播报 · 博才干练男",
    "trait": "博才干练男",
    "scene": "新闻播报",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longshuo_v3.mp3"
  },
  {
    "id": "sys-longshu_v3",
    "providerVoiceId": "longshu_v3",
    "name": "龙书",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "新闻播报 · 沉稳青年男",
    "trait": "沉稳青年男",
    "scene": "新闻播报",
    "age": "20~25岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/longshu_v3.mp3"
  },
  {
    "id": "sys-loongbella_v3",
    "providerVoiceId": "loongbella_v3",
    "name": "Bella3.0",
    "type": "SYSTEM",
    "targetModel": "cosyvoice-v3-flash",
    "supportedModels": [
      "cosyvoice-v3-flash",
      "cosyvoice-v3-plus"
    ],
    "sourceModels": [
      "cosyvoice-v3-flash"
    ],
    "status": "READY",
    "visibility": "PUBLIC",
    "language": "中文（普通话）、英文",
    "languages": [
      "普通话",
      "美式英语"
    ],
    "description": "新闻播报 · 精准干练女",
    "trait": "精准干练女",
    "scene": "新闻播报",
    "age": "25~30岁",
    "ageCategory": "青年",
    "avatarUrl": null,
    "ssmlSupported": true,
    "instructSupported": false,
    "timestampSupported": true,
    "previewAudioUrl": "/audio/voices/cosyvoice-v3/loongbella_v3.mp3"
  }
] as const satisfies readonly CosyVoiceSystemVoice[];
