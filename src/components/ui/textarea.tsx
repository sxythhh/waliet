import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg bg-muted/50 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:bg-muted/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:bg-muted/50 transition-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border-0 outline-none shadow-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
