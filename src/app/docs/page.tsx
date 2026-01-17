import { Metadata } from "next";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { BookOpen, Copy, Sparkles, Folder, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Learn how to use Prompt Gallery",
};

const sections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics of using Prompt Gallery",
    items: ["Creating an account", "Browsing prompts", "Copying prompts", "Using filters"],
  },
  {
    icon: Copy,
    title: "Using Prompts",
    description: "How to use prompts effectively",
    items: ["Copy and paste", "Modifying prompts", "Best practices", "Negative prompts"],
  },
  {
    icon: Sparkles,
    title: "Creating Prompts",
    description: "Share your prompts with the community",
    items: ["Writing effective prompts", "Adding tags", "Choosing categories", "Image guidelines"],
  },
  {
    icon: Folder,
    title: "Collections",
    description: "Organize your favorite prompts",
    items: ["Creating collections", "Managing prompts", "Sharing collections", "Privacy settings"],
  },
];

export default function DocsPage() {
  return (
    <PageLayout>
      <PageHeader title="Documentation" description="Everything you need to know about Prompt Gallery" />

      <div className="max-w-4xl pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="p-6 rounded-2xl border bg-card">
              <section.icon className="w-8 h-8 text-primary mb-4" />
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="text-sm flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-muted/50 text-center">
          <h3 className="text-lg font-semibold mb-2">Need more help?</h3>
          <p className="text-muted-foreground mb-4">
            Can&apos;t find what you&apos;re looking for? Contact our support team.
          </p>
          <Link href="/contact" className="text-primary hover:underline inline-flex items-center gap-1">
            Contact Support <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
