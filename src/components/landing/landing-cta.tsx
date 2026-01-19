"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoveRight } from "lucide-react";
import { Magnetic } from "./magnetic";

export function LandingCTA() {
  return (
    <section className="py-60 relative overflow-hidden bg-background">
      {/* Absolute background text */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
         <span className="text-[30vw] font-black tracking-tighter leading-none">
           CREATE
         </span>
      </div>

      <div className="container px-6 mx-auto relative z-10 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-12">
            The Final Step
          </h2>
          <h3 className="text-6xl md:text-9xl font-black tracking-[-0.05em] leading-[0.85] mb-16">
            START YOUR <br />
            LEGACY.
          </h3>
          
          <div className="flex flex-col items-center gap-12">
            <Magnetic>
              <Button size="xl" className="rounded-full px-12 h-20 text-xl font-black shadow-2xl shadow-primary/30 group" asChild>
                <Link href="/register">
                  Get Started for Free
                  <MoveRight className="ml-4 w-6 h-6 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>
            </Magnetic>
            
            <div className="flex items-center gap-8">
               <Link href="/gallery" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">
                 Explore Gallery
               </Link>
               <div className="w-1.5 h-1.5 rounded-full bg-border" />
               <Link href="/about" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">
                 Our Mission
               </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle floating accent */}
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-primary/5 blur-[120px] rounded-full -z-10" />
    </section>
  );
}
