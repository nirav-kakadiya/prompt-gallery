"use client";

import { PageLayout, PageHeader } from "@/components/layout/page-layout";

interface LegalPageProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, description, lastUpdated, children }: LegalPageProps) {
  return (
    <PageLayout>
      <PageHeader title={title} description={description} />

      <div className="max-w-3xl pb-16">
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {lastUpdated}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </PageLayout>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="text-muted-foreground space-y-4">{children}</div>
    </section>
  );
}
