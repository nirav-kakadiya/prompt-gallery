"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Folder, Lock, Globe, Loader2, X, Image as ImageIcon } from "lucide-react";
import { PageLayout, PageHeader, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  promptCount: number;
  _count: {
    prompts: number;
  };
  prompts: {
    prompt: {
      id: string;
      title: string;
      imageUrl: string | null;
    };
  }[];
}

export default function CollectionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newCollection, setNewCollection] = React.useState({
    name: "",
    description: "",
    isPublic: true,
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch collections
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
    }
  }, [isAuthenticated]);

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/collections");
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCollection),
      });

      if (response.ok) {
        const created = await response.json();
        setCollections((prev) => [created, ...prev]);
        setShowCreateModal(false);
        setNewCollection({ name: "", description: "", isPublic: true });
        toast.success("Collection created!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create collection");
      }
    } catch {
      toast.error("Failed to create collection");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <PageLayout>
      <PageHeader
        title="Your Collections"
        description="Organize your favorite prompts into collections"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        }
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && collections.length === 0 && (
        <EmptyState
          icon={<Folder className="w-8 h-8 text-muted-foreground" />}
          title="No collections yet"
          description="Create your first collection to organize your favorite prompts"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              Create Collection
            </Button>
          }
        />
      )}

      {/* Collections grid */}
      {!isLoading && collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/collections/${collection.id}`}>
                <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all">
                  {/* Cover image or thumbnails */}
                  <div className="aspect-video rounded-xl bg-muted mb-4 overflow-hidden relative">
                    {collection.coverImageUrl ? (
                      <img
                        src={collection.coverImageUrl}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : collection.prompts && collection.prompts.length > 0 ? (
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
                        {collection.prompts.slice(0, 4).map((p) => (
                          <div key={p.prompt.id} className="bg-muted-foreground/10">
                            {p.prompt.imageUrl ? (
                              <img
                                src={p.prompt.imageUrl}
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
                        {/* Fill remaining slots */}
                        {Array.from({ length: Math.max(0, 4 - collection.prompts.length) }).map((_, i) => (
                          <div key={`empty-${i}`} className="bg-muted-foreground/10 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        ))}
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
                      <p className="text-sm text-muted-foreground mt-1">
                        {collection._count?.prompts || 0} prompts
                      </p>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0" title={collection.isPublic ? "Public" : "Private"}>
                      {collection.isPublic ? (
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-2xl p-6 z-50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Create Collection</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    value={newCollection.name}
                    onChange={(e) =>
                      setNewCollection({ ...newCollection, name: e.target.value })
                    }
                    placeholder="My Awesome Collection"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newCollection.description}
                    onChange={(e) =>
                      setNewCollection({ ...newCollection, description: e.target.value })
                    }
                    placeholder="Optional description for your collection"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Visibility</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewCollection({ ...newCollection, isPublic: true })}
                      className={cn(
                        "flex-1 p-3 rounded-xl border transition-all flex items-center gap-2 justify-center",
                        newCollection.isPublic
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <Globe className="w-4 h-4" />
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCollection({ ...newCollection, isPublic: false })}
                      className={cn(
                        "flex-1 p-3 rounded-xl border transition-all flex items-center gap-2 justify-center",
                        !newCollection.isPublic
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <Lock className="w-4 h-4" />
                      Private
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateCollection}
                    disabled={isCreating || !newCollection.name.trim()}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
