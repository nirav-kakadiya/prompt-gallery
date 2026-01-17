import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Sparkles, Users, Zap, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Prompt Gallery and our mission",
};

const features = [
  {
    icon: Sparkles,
    title: "Curated Collection",
    description: "Thousands of high-quality prompts for image and video generation",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built by creators, for creators. Share and discover amazing prompts",
  },
  {
    icon: Zap,
    title: "One-Click Copy",
    description: "Copy any prompt instantly and use it in your favorite AI tools",
  },
  {
    icon: Globe,
    title: "Browser Extension",
    description: "Save prompts from anywhere with our browser extension",
  },
];

export default function AboutPage() {
  return (
    <PageLayout>
      <PageHeader
        title="About Prompt Gallery"
        description="The ultimate library for AI prompts"
      />

      <div className="max-w-4xl pb-16 space-y-16">
        {/* Mission */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Prompt Gallery was created to help creators discover, share, and organize
            the best AI prompts for image generation, video creation, and more. We believe
            that great prompts are the key to unlocking the full potential of AI art tools.
          </p>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-bold mb-8">What We Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border bg-card">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="p-8 rounded-2xl bg-muted/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold">10K+</p>
              <p className="text-muted-foreground">Prompts</p>
            </div>
            <div>
              <p className="text-4xl font-bold">5K+</p>
              <p className="text-muted-foreground">Creators</p>
            </div>
            <div>
              <p className="text-4xl font-bold">50K+</p>
              <p className="text-muted-foreground">Daily Copies</p>
            </div>
            <div>
              <p className="text-4xl font-bold">100+</p>
              <p className="text-muted-foreground">Categories</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
