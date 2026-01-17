import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Changelog",
  description: "See what's new in Prompt Gallery",
};

const updates = [
  {
    version: "1.0.0",
    date: "January 2026",
    type: "major",
    changes: [
      "Initial public release",
      "Gallery with 10,000+ prompts",
      "User accounts and authentication",
      "Collections feature",
      "Search and filtering",
      "Dark mode support",
    ],
  },
  {
    version: "0.9.0",
    date: "December 2025",
    type: "beta",
    changes: [
      "Beta release",
      "Core functionality complete",
      "API documentation",
      "Basic categorization",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PageLayout>
      <PageHeader title="Changelog" description="All the updates and improvements to Prompt Gallery" />

      <div className="max-w-3xl pb-16">
        <div className="space-y-12">
          {updates.map((update) => (
            <div key={update.version} className="relative pl-8 border-l-2 border-muted">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold">v{update.version}</h2>
                  <Badge variant={update.type === "major" ? "default" : "secondary"}>
                    {update.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{update.date}</p>
              </div>
              <ul className="space-y-2">
                {update.changes.map((change) => (
                  <li key={change} className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
