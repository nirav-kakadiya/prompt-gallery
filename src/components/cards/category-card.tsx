"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Palette,
  Sparkles,
  Rocket,
  Star,
  Camera,
  Building2,
  Leaf,
  User,
  Layers,
  Wand2,
  Gamepad2,
  Globe,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  palette: Palette,
  sparkles: Sparkles,
  rocket: Rocket,
  star: Star,
  camera: Camera,
  building: Building2,
  leaf: Leaf,
  user: User,
  layers: Layers,
  wand: Wand2,
  gamepad: Gamepad2,
  globe: Globe,
};

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    promptCount: number;
  };
  index?: number;
}

export function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const Icon = iconMap[category.icon || "layers"] || Layers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/gallery?category=${category.slug}`}>
        <div
          className={cn(
            "group relative p-6 rounded-2xl border bg-card",
            "hover:shadow-lg hover:border-primary/20 transition-all duration-300",
            "cursor-pointer"
          )}
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-primary" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {category.description}
            </p>
          )}

          {/* Prompt count */}
          <p className="text-sm text-muted-foreground">
            {formatNumber(category.promptCount)} prompts
          </p>

          {/* Hover arrow */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton for loading state
export function CategoryCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border bg-card animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-muted mb-4" />
      <div className="h-5 w-24 bg-muted rounded mb-2" />
      <div className="h-4 w-full bg-muted rounded mb-1" />
      <div className="h-4 w-2/3 bg-muted rounded mb-3" />
      <div className="h-4 w-20 bg-muted rounded" />
    </div>
  );
}
