import type { Metadata } from "next";

import { AiChatConsole } from "@/components/experience/ai-chat-console";
import { getOptionalCurrentUser } from "@/lib/auth-actions";
import { getExperienceChatModels } from "@/lib/experience-api";

export const metadata: Metadata = {
  title: "AI 对话体验 - AI SaaS",
  description: "在体验区选择模型并使用基础 AI 对话能力。"
};

export default async function ExperienceChatPage() {
  const [models, currentUser] = await Promise.all([
    getExperienceChatModels(),
    getOptionalCurrentUser()
  ]);

  return <AiChatConsole currentUser={currentUser} models={models} />;
}
