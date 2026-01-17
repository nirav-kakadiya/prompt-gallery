import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Bell, Newspaper } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description: "News and updates from Prompt Gallery",
};

export default function BlogPage() {
  return (
    <PageLayout>
      <PageHeader title="Blog" description="News, tutorials, and updates" />

      <div className="max-w-2xl pb-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Newspaper className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
        <p className="text-muted-foreground mb-8">
          We&apos;re working on bringing you insightful articles about prompt engineering,
          AI best practices, and community highlights. Stay tuned!
        </p>
        <Button disabled>
          <Bell className="w-4 h-4 mr-2" />
          Notify Me
        </Button>
      </div>
    </PageLayout>
  );
}
