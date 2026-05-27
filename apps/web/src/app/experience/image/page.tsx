import type { Metadata } from "next";

import { ImageGenerationConsole } from "@/components/experience/image-generation-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getWallet } from "@/lib/billing-api";
import { getExperienceImageModels } from "@/lib/experience-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "图片生成体验 - AI SaaS",
  description: "在体验区输入提示词、选择模型和比例，生成图片并管理参考图。"
};

export default async function ExperienceImagePage() {
  const [models, currentUser] = await Promise.all([
    getExperienceImageModels(),
    getOptionalCurrentUser()
  ]);
  const wallet = currentUser ? await getWallet().catch(() => null) : null;

  return <ImageGenerationConsole availableCredits={wallet?.availableCredits ?? null} currentUser={currentUser} models={models} />;
}
