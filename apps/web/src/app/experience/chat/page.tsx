import type { Metadata } from "next";

import { AiChatConsole } from "@/components/experience/ai-chat-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getCurrentBillingIdentity } from "@/lib/billing-identity";
import { getExperienceChatModels } from "@/lib/experience-api";
import { getUserOrganizations } from "@/lib/organizations-api";

export const metadata: Metadata = {
  title: "AI 对话体验 - AI SaaS",
  description: "在体验区选择模型并使用基础 AI 对话能力。"
};

export default async function ExperienceChatPage() {
  const [models, currentUser] = await Promise.all([
    getExperienceChatModels(),
    getOptionalCurrentUser()
  ]);
  const organizations = currentUser ? await getUserOrganizations().catch(() => null) : null;
  const billingIdentity = currentUser ? await getCurrentBillingIdentity(organizations) : null;

  return (
    <AiChatConsole
      currentUser={currentUser}
      initialOrganizationId={billingIdentity?.organizationId ?? ""}
      models={models}
      organizations={organizations}
    />
  );
}
