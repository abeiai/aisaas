import type { Metadata } from "next";

import { VideoGenerationConsole } from "@/components/experience/video-generation-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getCurrentBillingIdentity } from "@/lib/billing-identity";
import { getExperienceVideoModels } from "@/lib/experience-api";
import { getUserOrganizations } from "@/lib/organizations-api";

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
  const organizations = currentUser ? await getUserOrganizations().catch(() => null) : null;
  const billingIdentity = currentUser ? await getCurrentBillingIdentity(organizations) : null;

  return (
    <VideoGenerationConsole
      currentUser={currentUser}
      initialOrganizationId={billingIdentity?.organizationId ?? ""}
      models={models}
      organizations={organizations}
    />
  );
}
