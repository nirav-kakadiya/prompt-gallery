"use client";

import * as React from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        className={cn(
          "flex-1 pt-28 md:pt-32",
          !fullWidth && "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full",
          className
        )}
      >
        {children}
      </main>
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
    <div className={cn("py-8 sm:py-12", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span>/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">{title}</h1>
          {description && (
            <p className="mt-2 text-lg text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
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
