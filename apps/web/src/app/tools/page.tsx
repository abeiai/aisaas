import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Boxes } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "场景应用准备中 - AI SaaS",
  description: "旧工具应用入口已清理，后续将通过全新的场景应用开放能力。"
};

export default function ToolsPage() {
  return (
    <PublicShell>
      <section className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center px-5 py-20">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader className="items-center gap-5">
            <div className="flex size-14 items-center justify-center rounded-lg bg-secondary">
              <Boxes />
            </div>
            <CardTitle className="font-display text-4xl font-light tracking-normal">
              场景应用准备中
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="max-w-xl leading-7 text-muted-foreground">
              现有前后台工具应用的展示入口已清理。后续能力将通过全新的场景应用体系开发、启用和管理。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/experience/chat">
                  进入体验区
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">返回首页</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}
