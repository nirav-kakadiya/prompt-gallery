"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, suffix, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-neutral-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm shadow-sm transition-all duration-200",
            "placeholder:text-neutral-400",
            "focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
            "dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
            "dark:focus:ring-neutral-50/10 dark:focus:border-neutral-600",
            "dark:placeholder:text-neutral-500",
            icon && "pl-11",
            suffix && "pr-11",
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3.5 text-neutral-400">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
