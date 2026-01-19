"use client";

import * as React from "react";
import Link from "next/link";
import { Header } from "./header";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  showFooter?: boolean;
}

export function PageLayout({
  children,
  className,
  fullWidth = false,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "flex-1 pt-28 md:pt-32 pb-20",
          !fullWidth && "w-full px-6 sm:px-10 lg:px-12 xl:px-16",
          className
        )}
      >
        {children}
      </motion.main>
      {showFooter && <Footer />}
    </div>
  );
}

// Page header with optional breadcrumbs
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("py-12 sm:py-20", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-6">
          <ol className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-border">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground/60">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.04em] leading-[0.9] mb-6">
            {title.toUpperCase()}
          </h1>
          {description && (
            <p className="text-lg md:text-xl text-muted-foreground/60 font-medium leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-4 shrink-0">{actions}</div>}
      </div>
      <div className="mt-16 w-full h-[1px] bg-border/40" />
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-16", className)}>
      {icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// Loading skeleton for pages
export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="py-8 sm:py-12">
        <div className="h-10 w-64 bg-muted rounded mb-4" />
        <div className="h-6 w-96 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
