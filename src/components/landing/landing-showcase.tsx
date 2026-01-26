"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";

const prompts = [
  {
    title: "Cyberpunk Portrait",
    category: "Midjourney v6",
    img: "https://picsum.photos/seed/cyber/800/1000",
    size: "large"
  },
  {
    title: "Neon Dreams",
    category: "Stable Diffusion",
    img: "https://picsum.photos/seed/neon/800/1000",
    size: "small"
  },
  {
    title: "Fantasy Realm",
    category: "DALL-E 3",
    img: "https://picsum.photos/seed/fantasy/800/1000",
    size: "medium"
  },
  {
    title: "Digital Muse",
    category: "Flux.1",
    img: "https://picsum.photos/seed/muse/800/1000",
    size: "small"
  },
  {
    title: "Ethereal Beauty",
    category: "Midjourney",
    img: "https://picsum.photos/seed/ethereal/800/1000",
    size: "large"
  },
  {
    title: "Sci-Fi World",
    category: "Stable Diffusion XL",
    img: "https://picsum.photos/seed/scifi/800/1000",
    size: "medium"
  }
];

export function LandingShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Parallax scrolling for individual items
    const items = gsap.utils.toArray(".showcase-item");
    items.forEach((item: any) => {
      const speed = parseFloat(item.dataset.speed || "0");
      gsap.to(item, {
        scrollTrigger: {
          trigger: item,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: speed * 150,
        ease: "none"
      });
    });
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="py-40 bg-background overflow-hidden relative"
    >
      <div className="container px-6 mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-6">
              The Showcase
            </h2>
            <p className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-tight">
              Where <span className="text-muted-foreground/30 italic">art</span> meets <br /> 
              algorithmic precision.
            </p>
          </div>
          <p className="text-muted-foreground font-medium max-w-sm">
            A curated stream of the world&apos;s most sophisticated prompts, verified and battle-tested by our engineering community.
          </p>
        </div>

        {/* Dynamic Canvas Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
          {/* Column 1 */}
          <div className="md:col-span-4 space-y-10">
            <ShowcaseItem item={prompts[0]} speed={-0.1} index={0} />
            <ShowcaseItem item={prompts[1]} speed={0.15} index={1} />
          </div>
          
          {/* Column 2 - offset */}
          <div className="md:col-span-4 space-y-10 md:pt-32">
            <ShowcaseItem item={prompts[2]} speed={-0.2} index={2} />
            <ShowcaseItem item={prompts[3]} speed={0.05} index={3} />
          </div>
          
          {/* Column 3 */}
          <div className="md:col-span-4 space-y-10">
            <ShowcaseItem item={prompts[4]} speed={-0.05} index={4} />
            <ShowcaseItem item={prompts[5]} speed={0.2} index={5} />
          </div>
        </div>
      </div>
      
      {/* Decorative vertical line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border/20 -translate-x-1/2 -z-10" />
    </section>
  );
}

function ShowcaseItem({ item, speed, index }: { item: typeof prompts[0]; speed: number; index: number }) {
  return (
    <motion.div 
      className="showcase-item group relative" 
      data-speed={speed}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-muted/20 border border-border/50 transition-all duration-700 group-hover:border-primary/30 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)]">
        <img 
          src={item.img} 
          alt={item.title} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-10">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
             {item.category}
           </span>
           <h3 className="text-2xl font-black tracking-tighter">
             {item.title}
           </h3>
        </div>
      </div>
      <div className="mt-6 flex justify-between items-center px-4">
         <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
           Ref. 0{index + 1}
         </span>
         <div className="w-8 h-[1px] bg-border/50" />
      </div>
    </motion.div>
  );
}
