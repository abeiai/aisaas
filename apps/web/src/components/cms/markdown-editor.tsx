"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/lib/markdown";
import type { MediaAsset } from "@/lib/media-api";

export function MarkdownEditor({
  name,
  defaultValue,
  mediaAssets
}: {
  name: string;
  defaultValue?: string;
  mediaAssets: MediaAsset[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(mediaAssets[0]?.url ?? "");
  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

  function insertImage() {
    if (!selectedMediaUrl) {
      return;
    }

    const filename = mediaAssets.find((asset) => asset.url === selectedMediaUrl)?.originalName ?? "图片";
    const markdown = `\n\n![${filename}](${selectedMediaUrl})\n\n`;
    setValue((current) => `${current}${markdown}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Field>
        <FieldLabel>Markdown 正文</FieldLabel>
        <Textarea
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedMediaUrl}
            onChange={(event) => setSelectedMediaUrl(event.target.value)}
          >
            <option value="">选择图片插入正文</option>
            {mediaAssets.map((asset) => (
              <option key={asset.id} value={asset.url}>
                {asset.originalName}
              </option>
            ))}
          </Select>
          <Button type="button" variant="outline" onClick={insertImage}>
            插入图片
          </Button>
        </div>
      </Field>
      <Field>
        <FieldLabel>Markdown 预览</FieldLabel>
        <div
          className="flex max-h-[420px] min-h-[260px] flex-col gap-5 overflow-auto rounded-lg border border-border bg-background p-5 text-sm leading-7"
          dangerouslySetInnerHTML={{ __html: previewHtml || "<p>暂无预览内容</p>" }}
        />
      </Field>
    </div>
  );
}
