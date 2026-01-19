"use client";

import * as React from "react";
import { Loader2, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateCollection } from "@/hooks/use-collections";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
  };
}

export function EditCollectionModal({
  open,
  onOpenChange,
  collection,
}: EditCollectionModalProps) {
  const updateCollectionMutation = useUpdateCollection();
  const [name, setName] = React.useState(collection.name);
  const [description, setDescription] = React.useState(collection.description || "");
  const [isPublic, setIsPublic] = React.useState(collection.isPublic);

  // Reset form when modal opens or collection changes
  React.useEffect(() => {
    if (open) {
      setName(collection.name);
      setDescription(collection.description || "");
      setIsPublic(collection.isPublic);
    }
  }, [open, collection.name, collection.description, collection.isPublic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a collection name");
      return;
    }

    try {
      await updateCollectionMutation.mutateAsync({
        id: collection.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        },
      });

      toast.success("Collection updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update collection");
    }
  };

  const isLoading = updateCollectionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
          <DialogDescription>
            Update your collection details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Name */}
          <div>
            <label htmlFor="edit-collection-name" className="block text-sm font-medium mb-2">
              Name *
            </label>
            <Input
              id="edit-collection-name"
              placeholder="My Collection"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-collection-description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="edit-collection-description"
              placeholder="What's this collection about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isPublic
                    ? "border-primary bg-primary/5 ring-2 ring-offset-2 ring-primary/20"
                    : "border-input hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Globe className={cn("w-5 h-5", isPublic ? "text-primary" : "text-muted-foreground")} />
                <div className="text-left">
                  <div className={cn("text-sm font-medium", isPublic && "text-primary")}>
                    Public
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Anyone can view
                  </div>
                </div>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  !isPublic
                    ? "border-primary bg-primary/5 ring-2 ring-offset-2 ring-primary/20"
                    : "border-input hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Lock className={cn("w-5 h-5", !isPublic ? "text-primary" : "text-muted-foreground")} />
                <div className="text-left">
                  <div className={cn("text-sm font-medium", !isPublic && "text-primary")}>
                    Private
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Only you can view
                  </div>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
