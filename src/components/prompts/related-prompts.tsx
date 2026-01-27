"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PromptCard } from "@/components/cards/prompt-card";
import { Button } from "@/components/ui/button";
import type { PromptType } from "@/lib/utils";

interface RelatedPrompt {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  thumbnailUrl: string | null;
  blurhash: string | null;
  tags: string[];
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  } | null;
  copyCount: number;
  likeCount: number;
  viewCount?: number;
  createdAt: string;
}

interface RelatedPromptsProps {
  prompts: RelatedPrompt[];
  title?: string;
  viewAllHref?: string;
}

export function RelatedPrompts({
  prompts,
  title = "Related Prompts",
  viewAllHref,
}: RelatedPromptsProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <section className="py-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref}>
            <Button variant="ghost">
              View all
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {prompts.slice(0, 4).map((prompt, index) => (
          <PromptCard key={prompt.id} prompt={prompt} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
