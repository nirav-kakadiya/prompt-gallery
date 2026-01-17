"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PromptCard } from "@/components/cards/prompt-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Globe, MoreHorizontal, Pencil, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";

// Mock collection data
const mockCollection = {
  id: "1",
  name: "Favorite Art Prompts",
  description: "My collection of the best art generation prompts I've found.",
  isPublic: true,
  createdAt: "2026-01-01",
  author: {
    name: "Demo User",
    username: "demouser",
  },
  prompts: [
    {
      id: "1",
      title: "Cyberpunk City at Night",
      slug: "cyberpunk-city-at-night",
      excerpt: "A neon-lit cyberpunk cityscape with flying cars...",
      type: "midjourney",
      copyCount: 1234,
      likeCount: 567,
      viewCount: 8901,
      createdAt: new Date().toISOString(),
      author: { name: "Artist", username: "artist" },
      tags: [{ id: "1", name: "cyberpunk", slug: "cyberpunk" }],
    },
    {
      id: "2",
      title: "Fantasy Forest Landscape",
      slug: "fantasy-forest-landscape",
      excerpt: "An enchanted forest with glowing mushrooms...",
      type: "dalle",
      copyCount: 987,
      likeCount: 432,
      viewCount: 5678,
      createdAt: new Date().toISOString(),
      author: { name: "Creator", username: "creator" },
      tags: [{ id: "2", name: "fantasy", slug: "fantasy" }],
    },
  ],
};

export default function CollectionDetailPage() {
  useParams();
  const router = useRouter();
  const [showMenu, setShowMenu] = React.useState(false);

  // In production, fetch collection by ID
  const collection = mockCollection;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this collection?")) {
      toast.success("Collection deleted");
      router.push("/collections");
    }
  };

  return (
    <PageLayout>
      <div className="pb-16">
        {/* Back button */}
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>

        {/* Collection header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              {collection.isPublic ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
            </div>
            {collection.description && (
              <p className="text-muted-foreground mb-4">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Created by{" "}
              <Link href={`/profile/${collection.author.username}`} className="text-primary hover:underline">
                {collection.author.name}
              </Link>
              {" · "}
              {collection.prompts.length} prompts
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-popover border rounded-xl shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    toast.info("Edit collection coming soon");
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Collection
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Collection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prompts grid */}
        {collection.prompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collection.prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt as unknown as Parameters<typeof PromptCard>[0]["prompt"]} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">This collection is empty</p>
            <Button asChild>
              <Link href="/gallery">Browse Prompts</Link>
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
