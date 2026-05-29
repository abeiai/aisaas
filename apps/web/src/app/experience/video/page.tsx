import type { Metadata } from "next";

import { VideoGenerationConsole } from "@/components/experience/video-generation-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getExperienceVideoModels } from "@/lib/experience-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "视频生成体验 - AI SaaS",
  description: "在体验区输入提示词、选择模型和参考文件，生成视频并查看历史记录。"
};

export default async function ExperienceVideoPage() {
  const [models, currentUser] = await Promise.all([
    getExperienceVideoModels(),
    getOptionalCurrentUser()
  ]);

  return <VideoGenerationConsole currentUser={currentUser} models={models} />;
}
