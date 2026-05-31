import type { Metadata } from "next";

import { ImageGenerationConsole } from "@/components/experience/image-generation-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getCurrentBillingIdentity } from "@/lib/billing-identity";
import { getExperienceImageModels } from "@/lib/experience-api";
import { getUserOrganizations } from "@/lib/organizations-api";

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
  const organizations = currentUser ? await getUserOrganizations().catch(() => null) : null;
  const billingIdentity = currentUser ? await getCurrentBillingIdentity(organizations) : null;

  return (
    <ImageGenerationConsole
      currentUser={currentUser}
      initialOrganizationId={billingIdentity?.organizationId ?? ""}
      models={models}
      organizations={organizations}
    />
  );
}
