function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function safeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed || /^javascript:/i.test(trimmed)) {
    return "#";
  }

  return escapeAttribute(trimmed);
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
      return `<img class="my-5 aspect-[16/9] w-full rounded-lg border border-border object-cover" alt="${escapeAttribute(alt)}" src="${safeUrl(url)}" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
      return `<a class="font-medium underline underline-offset-4" href="${safeUrl(url)}">${label}</a>`;
    })
    .replace(/`([^`]+)`/g, "<code class=\"rounded bg-secondary px-1 py-0.5 text-sm\">$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderList(block: string) {
  const items = block
    .split("\n")
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean)
    .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
    .join("");

  return `<ul class="flex list-disc flex-col gap-2 pl-5">${items}</ul>`;
}

function renderCodeBlock(block: string) {
  const content = block
    .replace(/^```[a-zA-Z0-9-]*\n?/, "")
    .replace(/```$/, "");

  return `<pre class="overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm leading-6"><code>${escapeHtml(content)}</code></pre>`;
}

export function markdownToHtml(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("```")) {
        return renderCodeBlock(block);
      }

      if (/^- /m.test(block)) {
        return renderList(block);
      }

      if (block.startsWith("### ")) {
        return `<h3 class="font-display text-2xl font-light leading-tight">${renderInlineMarkdown(block.slice(4))}</h3>`;
      }

      if (block.startsWith("## ")) {
        return `<h2 class="font-display text-3xl font-light leading-tight">${renderInlineMarkdown(block.slice(3))}</h2>`;
      }

      if (block.startsWith("# ")) {
        return `<h2 class="font-display text-3xl font-light leading-tight">${renderInlineMarkdown(block.slice(2))}</h2>`;
      }

      return `<p>${renderInlineMarkdown(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}
