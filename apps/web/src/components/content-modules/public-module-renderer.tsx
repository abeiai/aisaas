import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Heart, Shield, Sparkles, Star, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ContentModule } from "@/lib/content-module-api";

type TextStyle = {
  text?: string;
  fontFamily?: string;
  fontSize?: number;
};

const iconMap = {
  Sparkles,
  Check,
  Star,
  Zap,
  Shield,
  Heart
};

export function PublicModuleRenderer({ modules }: { modules: ContentModule[] }) {
  if (modules.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {modules.map((module) => (
        <RenderedModule key={module.id} module={module} />
      ))}
    </div>
  );
}

function RenderedModule({ module }: { module: ContentModule }) {
  if (module.type === "SLIDESHOW") {
    return <SlideshowModule module={module} />;
  }

  if (module.type === "IMAGE_CARD_LIST") {
    return <ImageCardListModule module={module} />;
  }

  return <SplitImageTextModule module={module} />;
}

function SlideshowModule({ module }: { module: ContentModule }) {
  const opacity = Math.min(Math.max(numberValue(module.settings.opacity, 100), 0), 100) / 100;

  return (
    <section className="w-full bg-background">
      <div className="w-full">
        <div className="flex snap-x overflow-x-auto">
          {module.items.map((item) => {
            const config = item.config ?? {};
            const introText = textStyle(config.introText);
            const titleText = textStyle(config.titleText);
            const descriptionText = textStyle(config.descriptionText);
            const textRight = String(config.textPosition ?? "LEFT") === "RIGHT";
            const buttonText = stringValue(config.buttonText);
            const buttonLink = stringValue(config.buttonLink);

            return (
              <div className="relative min-w-full snap-start overflow-hidden bg-secondary" key={item.id}>
                {item.imageUrl ? (
                  <img
                    alt={item.imageAlt ?? item.title ?? ""}
                    className="block h-auto w-full"
                    src={item.imageUrl}
                    style={{ opacity }}
                  />
                ) : (
                  <div className="min-h-[420px]" />
                )}
                <div className="absolute inset-0 flex items-center px-8 py-12 md:px-14">
                  <div className={textRight ? "ml-auto flex max-w-xl flex-col gap-5 text-right text-primary-foreground" : "flex max-w-xl flex-col gap-5 text-primary-foreground"}>
                    {introText.text ? <TextBlock value={introText} className="font-medium" /> : null}
                    {titleText.text ? <TextBlock value={titleText} className="font-display leading-tight" as="h2" /> : null}
                    {descriptionText.text ? <TextBlock value={descriptionText} className="leading-7" /> : null}
                    {buttonText ? (
                      <div className={textRight ? "flex justify-end" : "flex"}>
                        <Button asChild>
                          <Link href={buttonLink || item.resolvedHref || "#"}>{buttonText}</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ImageCardListModule({ module }: { module: ContentModule }) {
  const cardsPerRow = numberValue(module.settings.cardsPerRow, 3);
  const textPosition = String(module.settings.textPosition ?? "BELOW_IMAGE");
  const fontSize = numberValue(module.settings.fontSize, 18);

  return (
    <section className="bg-background">
      <div className="w-full px-5 py-12">
        <div className={gridClass(cardsPerRow)}>
          {module.items.map((item) => (
            <ModuleLink className="group overflow-hidden rounded-md border border-border bg-card" href={item.resolvedHref} key={item.id}>
              <div className="relative aspect-[4/3] bg-secondary">
                {item.imageUrl ? (
                  <img alt={item.imageAlt ?? item.title ?? ""} className="size-full object-cover transition-transform group-hover:scale-[1.02]" src={item.imageUrl} />
                ) : null}
                {textPosition !== "BELOW_IMAGE" && item.title ? (
                  <div className={textPosition === "IMAGE_MIDDLE" ? "absolute inset-0 flex items-center justify-center bg-foreground/30 p-4 text-center text-primary-foreground" : "absolute inset-x-0 bottom-0 bg-foreground/55 p-4 text-primary-foreground"}>
                    <p className="font-medium" style={{ fontSize }}>{item.title}</p>
                  </div>
                ) : null}
              </div>
              {textPosition === "BELOW_IMAGE" && item.title ? (
                <div className="p-4">
                  <p className="font-medium" style={{ fontSize }}>{item.title}</p>
                </div>
              ) : null}
            </ModuleLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitImageTextModule({ module }: { module: ContentModule }) {
  const settings = module.settings ?? {};
  const imageLeft = String(settings.layout ?? "TEXT_LEFT_IMAGE_RIGHT") === "IMAGE_LEFT_TEXT_RIGHT";
  const textMode = String(settings.textMode ?? "TITLE_TEXT");
  const imageRatio = String(settings.imageRatio ?? "16:9");
  const image = (
    <div className={`overflow-hidden rounded-md bg-secondary ${ratioClass(imageRatio)}`}>
      {stringValue(settings.imageUrl) ? (
        <img alt={stringValue(settings.imageAlt)} className="size-full object-cover" src={stringValue(settings.imageUrl)} />
      ) : null}
    </div>
  );
  const text = (
    <div className="flex flex-col justify-center gap-6">
      {textMode === "ICON_LIST" ? (
        <IconList value={settings.iconItems} />
      ) : (
        <>
          {textStyle(settings.introText).text ? <TextBlock value={textStyle(settings.introText)} className="font-medium text-muted-foreground" /> : null}
          {textStyle(settings.titleText).text ? <TextBlock value={textStyle(settings.titleText)} className="font-display leading-tight" as="h2" /> : null}
          {textStyle(settings.descriptionText).text ? <TextBlock value={textStyle(settings.descriptionText)} className="leading-7 text-muted-foreground" /> : null}
        </>
      )}
    </div>
  );

  return (
    <section className="bg-background">
      <div className="grid w-full gap-10 px-5 py-16 md:grid-cols-2">
        {imageLeft ? image : text}
        {imageLeft ? text : image}
      </div>
    </section>
  );
}

function IconList({ value }: { value: unknown }) {
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => {
        const record = recordValue(item);
        const Icon = iconMap[stringValue(record.icon) as keyof typeof iconMap] ?? Sparkles;
        const text = stringValue(record.text);

        return text ? (
          <div className="flex items-start gap-3" key={`${text}-${index}`}>
            <span className="flex size-10 items-center justify-center rounded-md bg-secondary">
              <Icon />
            </span>
            <p className="pt-2 leading-7">{text}</p>
          </div>
        ) : null;
      })}
    </div>
  );
}

function TextBlock({
  value,
  className,
  as = "p"
}: {
  value: TextStyle;
  className?: string;
  as?: "p" | "h2";
}) {
  const Comp = as;

  return (
    <Comp className={className} style={{ fontFamily: fontFamily(value.fontFamily), fontSize: value.fontSize }}>
      {value.text}
    </Comp>
  );
}

function ModuleLink({
  href,
  className,
  children
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  if (/^https?:\/\//i.test(href)) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function textStyle(value: unknown): TextStyle {
  const record = recordValue(value);

  return {
    text: stringValue(record.text),
    fontFamily: stringValue(record.fontFamily) || "system",
    fontSize: numberValue(record.fontSize, 18)
  };
}

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function gridClass(columns: number) {
  if (columns <= 1) {
    return "grid gap-5";
  }

  if (columns === 2) {
    return "grid gap-5 md:grid-cols-2";
  }

  if (columns === 4) {
    return "grid gap-5 md:grid-cols-2 lg:grid-cols-4";
  }

  if (columns >= 5) {
    return "grid gap-5 md:grid-cols-3 lg:grid-cols-5";
  }

  return "grid gap-5 md:grid-cols-3";
}

function ratioClass(value: string) {
  if (value === "4:3") {
    return "aspect-[4/3]";
  }

  if (value === "1:1") {
    return "aspect-square";
  }

  if (value === "3:4") {
    return "aspect-[3/4]";
  }

  if (value === "9:16") {
    return "aspect-[9/16]";
  }

  return "aspect-video";
}

function fontFamily(value: string | undefined) {
  if (value === "serif") {
    return "serif";
  }

  if (value === "mono") {
    return "monospace";
  }

  return undefined;
}
