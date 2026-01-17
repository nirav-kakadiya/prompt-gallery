import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Briefcase, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Prompt Gallery team",
};

export default function CareersPage() {
  return (
    <PageLayout>
      <PageHeader title="Careers" description="Join our team and shape the future of AI" />

      <div className="max-w-2xl pb-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-4">No Open Positions</h2>
        <p className="text-muted-foreground mb-8">
          We don&apos;t have any open positions right now, but we&apos;re always looking for
          talented people. Send us your resume and we&apos;ll keep it on file for future opportunities.
        </p>
        <Button asChild>
          <a href="mailto:careers@promptgallery.com">
            <Mail className="w-4 h-4 mr-2" />
            Send Resume
          </a>
        </Button>
      </div>
    </PageLayout>
  );
}
