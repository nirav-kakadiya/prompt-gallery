"use client";

import * as React from "react";
import { Loader2, Plus, Check, FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCollections,
  useCreateCollection,
  useAddToCollection,
} from "@/hooks/use-collections";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  promptTitle: string;
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  promptId,
  promptTitle,
}: AddToCollectionModalProps) {
  const { data: collections, isLoading: isLoadingCollections } = useCollections();
  const createCollectionMutation = useCreateCollection();
  const addToCollectionMutation = useAddToCollection();

  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState("");
  const [addedToCollections, setAddedToCollections] = React.useState<Set<string>>(new Set());

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setNewCollectionName("");
      setAddedToCollections(new Set());
    }
  }, [open]);

  const handleAddToCollection = async (collectionId: string) => {
    if (addedToCollections.has(collectionId)) {
      return; // Already added
    }

    try {
      await addToCollectionMutation.mutateAsync({
        collectionId,
        promptId,
      });

      setAddedToCollections((prev) => new Set(prev).add(collectionId));
      toast.success("Added to collection");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add to collection";
      // Check if it's a duplicate error
      if (message.includes("Unique constraint")) {
        toast.info("Prompt is already in this collection");
        setAddedToCollections((prev) => new Set(prev).add(collectionId));
      } else {
        toast.error(message);
      }
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCollectionName.trim()) {
      toast.error("Please enter a collection name");
      return;
    }

    try {
      const collection = await createCollectionMutation.mutateAsync({
        name: newCollectionName.trim(),
        isPublic: false,
      });

      // Automatically add prompt to the new collection
      await addToCollectionMutation.mutateAsync({
        collectionId: collection.id,
        promptId,
      });

      setAddedToCollections((prev) => new Set(prev).add(collection.id));
      toast.success(`Created "${collection.name}" and added prompt`);
      setNewCollectionName("");
      setShowCreateForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create collection");
    }
  };

  const isCreating = createCollectionMutation.isPending || addToCollectionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
          <DialogDescription className="line-clamp-1">
            Add &quot;{promptTitle}&quot; to a collection
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Create new collection form */}
          {showCreateForm ? (
            <form onSubmit={handleCreateCollection} className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  disabled={isCreating}
                  autoFocus
                />
                <Button type="submit" disabled={isCreating || !newCollectionName.trim()}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCollectionName("");
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={() => setShowCreateForm(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create New Collection
            </Button>
          )}

          {/* Collections list */}
          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {collections.map((collection) => {
                const isAdded = addedToCollections.has(collection.id);
                const isAdding = addToCollectionMutation.isPending;

                return (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    disabled={isAdded || isAdding}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      "disabled:cursor-not-allowed",
                      isAdded
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-input"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Collection preview thumbnails */}
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {collection.prompts[0]?.prompt?.imageUrl ? (
                          <img
                            src={collection.prompts[0].prompt.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderPlus className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-medium truncate">{collection.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {collection._count.prompts} {collection._count.prompts === 1 ? "prompt" : "prompts"}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isAdded ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No collections yet</p>
              <p className="text-sm">Create your first collection above</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
