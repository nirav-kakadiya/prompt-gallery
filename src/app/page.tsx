import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingShowcase } from "@/components/landing/landing-showcase";
import { LandingCTA } from "@/components/landing/landing-cta";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="flex flex-col min-h-screen">
        <LandingHeader />
        <main className="flex-1">
          <LandingHero />
          <LandingShowcase />
          <LandingFeatures />
          <LandingCTA />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
