import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Chrome, Download, Zap, Bookmark, Share2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Browser Extension",
  description: "Save prompts from anywhere with our browser extension",
};

const features = [
  { icon: Zap, title: "One-Click Save", description: "Save any prompt you find online instantly" },
  { icon: Bookmark, title: "Quick Access", description: "Access your saved prompts from any tab" },
  { icon: Share2, title: "Easy Sharing", description: "Share prompts directly to Prompt Gallery" },
];

export default function ExtensionPage() {
  return (
    <PageLayout>
      <PageHeader title="Browser Extension" description="Save prompts from anywhere on the web" />

      <div className="max-w-4xl pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
            <Chrome className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Prompt Gallery Extension</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Never lose a great prompt again. Our browser extension lets you save prompts
            from any website directly to your Prompt Gallery account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="gradient" className="relative group overflow-visible" asChild>
              <a
                href="https://chromewebstore.google.com/detail/prompt-gallery-saver/ehlbdcnncgamggpkmoaacclcfnmapbdp?authuser=0&hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Add to Chrome
                {/* Premium Live Dot - Google Labs / Apple Vibe */}
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white dark:border-slate-900 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                </span>
              </a>
            </Button>
            <Button size="lg" variant="outline" disabled>
              <Download className="w-5 h-5 mr-2" />
              Firefox (Coming Soon)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-2xl border bg-card text-center">
              <feature.icon className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
