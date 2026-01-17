"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero-section";
import { GallerySection } from "@/components/sections/gallery-section";
import { useFilterStore } from "@/store";

export default function HomePage() {
  const { setQuery } = useFilterStore();

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={setQuery} />
      <main className="flex-1 pt-20 md:pt-24">
        <HeroSection />
        <GallerySection />
      </main>
      <Footer />
    </div>
  );
}
