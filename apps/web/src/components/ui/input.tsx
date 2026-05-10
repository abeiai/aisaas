import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-card px-4 py-2 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-[3px] focus:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export { Input };
