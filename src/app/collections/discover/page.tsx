"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Folder,
  Lock,
  Globe,
  Loader2,
  Image as ImageIcon,
  Bookmark,
  BookmarkCheck,
  Search,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePublicCollections,
  useSaveCollection,
  useUnsaveCollection,
} from "@/hooks/use-collections";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortOption = "popular" | "newest" | "most_saved";

const sortOptions: { value: SortOption; label: string; icon: React.ElementType }[] = [
  { value: "popular", label: "Popular", icon: TrendingUp },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "most_saved", label: "Most Saved", icon: Users },
];

export default function DiscoverCollectionsPage() {
  const { user } = useAuthStore();
  const [sort, setSort] = React.useState<SortOption>("popular");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const saveCollectionMutation = useSaveCollection();
  const unsaveCollectionMutation = useUnsaveCollection();

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicCollections({
    sort,
    query: debouncedQuery || undefined,
    pageSize: 12,
  });

  const collections = data?.pages.flatMap((page) => page.data) || [];

  const handleSave = async (e: React.MouseEvent, collectionId: string, isSaved: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to save collections");
      return;
    }

    try {
      if (isSaved) {
        await unsaveCollectionMutation.mutateAsync(collectionId);
        toast.success("Collection removed from saved");
      } else {
        await saveCollectionMutation.mutateAsync(collectionId);
        toast.success("Collection saved!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save collection");
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Discover Collections"
        description="Explore public collections created by the community"
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={sort === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSort(option.value)}
                className="text-xs sm:text-sm h-8 px-2 sm:px-3"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && collections.length === 0 && (
        <div className="text-center py-16">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No collections found</h3>
          <p className="text-muted-foreground">
            {debouncedQuery
              ? "Try a different search term"
              : "Be the first to create a public collection!"}
          </p>
        </div>
      )}

      {/* Collections grid */}
      {!isLoading && collections.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {collections.map((collection, index) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/collections/${collection.id}`}>
                  <div className="group p-4 sm:p-6 rounded-2xl border bg-card hover:shadow-lg transition-all relative">
                    {/* Save button */}
                    {user && collection.ownerId !== user.id && (
                      <button
                        onClick={(e) => handleSave(e, collection.id, collection.isSaved)}
                        disabled={saveCollectionMutation.isPending || unsaveCollectionMutation.isPending}
                        className={cn(
                          "absolute top-4 right-4 z-10 p-2 rounded-full transition-all",
                          collection.isSaved
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/80 backdrop-blur-sm border hover:bg-muted"
                        )}
                      >
                        {collection.isSaved ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Cover image or thumbnails */}
                    <div className="aspect-video rounded-xl bg-muted mb-4 overflow-hidden relative">
                      {collection.prompts && collection.prompts.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
                          {collection.prompts.slice(0, 4).map((p) => (
                            <div key={p.prompt.id} className="bg-muted-foreground/10">
                              {p.prompt.thumbnailUrl || p.prompt.imageUrl ? (
                                <img
                                  src={p.prompt.thumbnailUrl || p.prompt.imageUrl || ""}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, 4 - collection.prompts.length) }).map(
                            (_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="bg-muted-foreground/10 flex items-center justify-center"
                              >
                                <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Folder className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {collection.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{collection._count?.prompts || 0} prompts</span>
                          <span>·</span>
                          <span>{collection._count?.savedBy || 0} saves</span>
                        </div>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {collection.description}
                          </p>
                        )}
                        {/* Owner info */}
                        <div className="flex items-center gap-2 mt-3">
                          {collection.owner?.image ? (
                            <img
                              src={collection.owner.image}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs">
                                {(collection.owner?.name || "A")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {collection.owner?.name || collection.owner?.username || "Anonymous"}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0" title="Public">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center mt-8 pb-16">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
