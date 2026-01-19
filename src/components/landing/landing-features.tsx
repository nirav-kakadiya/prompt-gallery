"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Layers, 
  Workflow, 
  Zap, 
  Eye, 
  Compass
} from "lucide-react";

const features = [
  {
    title: "Structural Logic",
    description: "Compose prompts using modular building blocks that ensure consistent output every single time.",
    icon: Layers,
    accent: "text-blue-500",
  },
  {
    title: "High Performance",
    description: "Optimized for the latest models including Flux, Midjourney v6, and DALL-E 3.",
    icon: Zap,
    accent: "text-amber-500",
  },
  {
    title: "Version Control",
    description: "Track the evolution of your prompts with a sophisticated versioning system designed for engineers.",
    icon: Workflow,
    accent: "text-purple-500",
  },
  {
    title: "Neural Search",
    description: "Find inspiration using our advanced semantic engine that understands the intent, not just the keywords.",
    icon: Compass,
    accent: "text-emerald-500",
  },
];

export function LandingFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  return (
    <section className="py-40 bg-background relative overflow-hidden">
      {/* Abstract architectural elements */}
      <div className="absolute top-0 right-0 w-[50%] h-[100%] border-l border-border/20 -z-10" />
      <div className="absolute bottom-1/2 left-0 w-full h-[1px] bg-border/20 -z-10" />

      <div className="container px-6 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-start">
          {/* Sticky Header Section */}
          <div className="lg:col-span-5 lg:sticky lg:top-40">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-8">
              The Architecture
            </h2>
            <h3 className="text-5xl md:text-7xl font-black tracking-[-0.04em] leading-[0.9] mb-10">
              BUILDING <br />
              BETTER <br />
              <span className="text-muted-foreground/20">INTELLIGENCE.</span>
            </h3>
            <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-sm">
              We&apos;ve reimagined the prompt workflow from the ground up, focusing on precision, repeatability, and artistic control.
            </p>
          </div>

          {/* Features Flow */}
          <div className="lg:col-span-7 space-y-32">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative pl-12 border-l-2 border-border/50 hover:border-primary transition-colors duration-500"
              >
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-border group-hover:border-primary group-hover:scale-125 transition-all duration-500" />
                
                <div className="flex items-start gap-8">
                  <div className={`mt-1 p-3 rounded-2xl bg-muted group-hover:bg-primary/5 transition-colors duration-500`}>
                    <feature.icon className={`w-8 h-8 ${feature.accent}`} />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-2xl font-black tracking-tighter mb-4 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
