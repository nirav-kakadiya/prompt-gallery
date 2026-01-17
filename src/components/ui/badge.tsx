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
          "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
        secondary:
          "bg-neutral-100/80 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400",
        outline:
          "border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300",
        success:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        error:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        info:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        // Prompt type badges
        "text-to-image":
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        "text-to-video":
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        "image-to-image":
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "image-to-video":
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
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
