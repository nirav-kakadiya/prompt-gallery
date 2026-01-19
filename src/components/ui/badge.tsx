"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        outline:
          "border border-input bg-background text-foreground",
        success:
          "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
        warning:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        error:
          "bg-destructive/10 text-destructive border border-destructive/20",
        info:
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
        // Prompt type badges
        "text-to-image":
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
        "text-to-video":
          "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
        "image-to-image":
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        "image-to-video":
          "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
