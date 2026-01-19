"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Folder,
  Lock,
  Globe,
  Loader2,
  X,
  Image as ImageIcon,
  Compass,
  Bookmark,
  FolderOpen,
} from "lucide-react";
import { PageLayout, PageHeader, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/hooks/use-auth";
import {
  useCollections,
  useCreateCollection,
  useSavedCollections,
} from "@/hooks/use-collections";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "my" | "saved";

export default function CollectionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { data: myCollections, isLoading: myLoading } = useCollections();
  const { data: savedCollections, isLoading: savedLoading } = useSavedCollections();
  const createCollectionMutation = useCreateCollection();

  const [activeTab, setActiveTab] = React.useState<Tab>("my");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newCollection, setNewCollection] = React.useState({
    name: "",
    description: "",
    isPublic: true,
  });

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      await createCollectionMutation.mutateAsync({
        name: newCollection.name.trim(),
        description: newCollection.description.trim() || undefined,
        isPublic: newCollection.isPublic,
      });

      setShowCreateModal(false);
      setNewCollection({ name: "", description: "", isPublic: true });
      toast.success("Collection created!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create collection");
    }
  };

  const isLoading = authLoading || (activeTab === "my" ? myLoading : savedLoading);
  const isCreating = createCollectionMutation.isPending;
  const collections = activeTab === "my" ? myCollections : savedCollections;

  if (!isAuthenticated && !authLoading) return null;

  return (
    <PageLayout fullWidth>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <PageHeader
          title="Collections"
          description="Organize and discover prompt collections"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/collections/discover">
                  <Compass className="w-4 h-4 mr-2" />
                  Discover
                </Link>
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Collection
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-8">
          <button
            onClick={() => setActiveTab("my")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "my"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            My Collections
            {myCollections && myCollections.length > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 rounded">
                {myCollections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "saved"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className="w-4 h-4" />
            Saved
            {savedCollections && savedCollections.length > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 rounded">
                {savedCollections.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!collections || collections.length === 0) && (
          <EmptyState
            icon={
              activeTab === "my" ? (
                <Folder className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Bookmark className="w-8 h-8 text-muted-foreground" />
              )
            }
            title={activeTab === "my" ? "No collections yet" : "No saved collections"}
            description={
              activeTab === "my"
                ? "Create your first collection to organize your favorite prompts"
                : "Discover and save public collections from the community"
            }
            action={
              activeTab === "my" ? (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Collection
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/collections/discover">
                    <Compass className="w-4 h-4 mr-2" />
                    Discover Collections
                  </Link>
                </Button>
              )
            }
          />
        )}

        {/* Collections grid */}
        {!isLoading && collections && collections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-16">
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
                      {collection.prompts && collection.prompts.length > 0 ? (
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {collection._count?.prompts || 0} prompts
                        </p>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {collection.description}
                          </p>
                        )}
                        {/* Show owner for saved collections */}
                        {activeTab === "saved" && "owner" in collection && collection.owner && (
                          <div className="flex items-center gap-2 mt-2">
                            {collection.owner.image ? (
                              <img
                                src={collection.owner.image}
                                alt=""
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-muted" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              by {collection.owner.name || collection.owner.username || "Anonymous"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className="ml-2 flex-shrink-0"
                        title={collection.isPublic ? "Public" : "Private"}
                      >
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
      </div>

      {/* Create Collection Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-2xl p-6 z-50 shadow-xl border"
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
