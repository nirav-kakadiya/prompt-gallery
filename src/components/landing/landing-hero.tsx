"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Magnetic } from "./magnetic";

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

    tl.from(".hero-line span", {
      y: "100%",
      opacity: 0,
      duration: 1.5,
      stagger: 0.1,
    })
    .from(".hero-fade", {
      opacity: 0,
      y: 20,
      duration: 1,
      stagger: 0.1,
    }, "-=0.8")
    .from(visualRef.current, {
      opacity: 0,
      scale: 0.95,
      y: 40,
      duration: 2,
    }, "-=1.2");

    // Subtle parallax for the background elements
    gsap.to(".bg-blur", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
      y: (i, target) => target.dataset.speed * 100,
      rotate: (i, target) => target.dataset.speed * 20,
    });
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="relative min-h-[110vh] flex flex-col items-center justify-center pt-20 overflow-hidden bg-background"
    >
      {/* Sophisticated Background - More "Lab" style */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div 
          className="bg-blur absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" 
          data-speed="0.2"
        />
        <div 
          className="bg-blur absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-purple-500/5 rounded-full blur-[120px]" 
          data-speed="-0.15"
        />
        <div 
          className="bg-blur absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-500/5 rounded-full blur-[80px]" 
          data-speed="0.3"
        />
        
        {/* Very subtle grain/noise and grid */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)]" />
      </div>

      <div className="container px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Refined Badge */}
          <div className="hero-fade inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-muted/30 backdrop-blur-md text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-12 shadow-sm">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Curated Intelligence</span>
          </div>

          {/* Ultra-Clean Typography */}
          <h1 className="flex flex-col gap-2 mb-10 max-w-5xl">
            <div className="hero-line overflow-hidden py-1">
              <span className="block text-5xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.85]">
                PRECision IN
              </span>
            </div>
            <div className="hero-line overflow-hidden py-1">
              <span className="block text-5xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.85] text-primary">
                PROMPT DESIGN
              </span>
            </div>
          </h1>

          <p className="hero-fade max-w-xl text-lg md:text-xl text-muted-foreground/80 mb-14 font-medium leading-relaxed tracking-tight">
            The ultimate canvas for AI architects. Organize your logic, visualize your intent, and scale your creative engineering.
          </p>

          {/* Minimalist Actions */}
          <div className="hero-fade flex flex-col sm:flex-row items-center gap-6 mb-24">
            <Magnetic>
              <Button size="xl" className="group rounded-full px-10 h-16 text-base font-bold shadow-2xl shadow-primary/20" asChild>
                <Link href="/gallery">
                  Enter Gallery
                  <div className="ml-3 w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center transition-transform group-hover:translate-x-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </Button>
            </Magnetic>
            <Link 
              href="/submit" 
              className="text-sm font-bold tracking-widest uppercase hover:text-primary transition-colors py-4 px-6"
            >
              Contribute Prompt
            </Link>
          </div>

          {/* Elevated Product Visual - More "Apple/Google" Minimal */}
          <div ref={visualRef} className="relative w-full max-w-[1400px] mx-auto perspective-1000">
             <div className="relative rounded-[2.5rem] border border-border/40 bg-card/30 backdrop-blur-2xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] transition-all duration-700 hover:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.3)]">
                {/* Custom Browser Bar */}
                <div className="h-12 bg-muted/20 border-b border-border/20 flex items-center px-8 justify-between">
                   <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-border/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-border/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-border/40" />
                   </div>
                   <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground/40 uppercase">
                     prompt-gallery.v1
                   </div>
                   <div className="w-10" />
                </div>
                
                {/* The Visual Content - Gallery Preview */}
                <div className="aspect-[16/9] bg-background/20 relative">
                   <div className="absolute inset-0 grid grid-cols-12 gap-1 p-1">
                      {/* Left Sidebar Mock */}
                      <div className="col-span-2 bg-muted/30 rounded-xl m-4 p-4 flex flex-col gap-3">
                         <div className="h-8 bg-muted/50 rounded-lg" />
                         <div className="h-6 bg-muted/30 rounded-lg w-3/4" />
                         <div className="h-6 bg-muted/30 rounded-lg w-1/2" />
                         <div className="h-6 bg-primary/20 rounded-lg" />
                         <div className="h-6 bg-muted/30 rounded-lg w-2/3" />
                      </div>

                      {/* Main Content - Sample Images Grid */}
                      <div className="col-span-10 p-6">
                         <div className="grid grid-cols-4 gap-4">
                            {[
                              "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1614851099511-773084f6911d?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=500&fit=crop",
                              "https://images.unsplash.com/photo-1614850523011-8f49ffc73908?w=400&h=500&fit=crop",
                            ].map((src, i) => (
                              <div
                                key={i}
                                className="aspect-[4/5] rounded-2xl overflow-hidden border border-border/20 shadow-lg"
                              >
                                <img
                                  src={src}
                                  alt={`Sample ${i + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Dynamic shadows and floating elements */}
             <div className="absolute -z-10 bottom-[-40px] left-1/2 -translate-x-1/2 w-[80%] h-20 bg-primary/20 blur-[100px] opacity-50 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
