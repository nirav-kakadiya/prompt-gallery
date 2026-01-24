"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PromptCard } from "@/components/cards/prompt-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Lock,
  Globe,
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  Loader2,
  FolderOpen,
  Bookmark,
  BookmarkCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCollection,
  useDeleteCollection,
  useSaveCollection,
  useUnsaveCollection,
  useSavedCollections,
} from "@/hooks/use-collections";
import { useAuthStore } from "@/hooks/use-auth";
import { EditCollectionModal } from "@/components/collections/edit-collection-modal";
import type { PromptType } from "@/lib/utils";

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { user } = useAuthStore();
  const { data: collection, isLoading, error } = useCollection(id);
  const { data: savedCollections } = useSavedCollections();
  const deleteCollectionMutation = useDeleteCollection();
  const saveCollectionMutation = useSaveCollection();
  const unsaveCollectionMutation = useUnsaveCollection();

  const [showEditModal, setShowEditModal] = React.useState(false);

  const isOwner = user?.id === collection?.ownerId;
  const isSaved = savedCollections?.some((sc) => sc.id === id) ?? false;
  const canSave = user && !isOwner && collection?.isPublic;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save collections");
      return;
    }

    try {
      if (isSaved) {
        await unsaveCollectionMutation.mutateAsync(id);
        toast.success("Collection removed from saved");
      } else {
        await saveCollectionMutation.mutateAsync(id);
        toast.success("Collection saved!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save collection");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteCollectionMutation.mutateAsync(id);
      toast.success("Collection deleted successfully");
      router.push("/collections");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !collection) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Collection Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || "This collection doesn't exist or you don't have access to it."}
          </p>
          <Button asChild>
            <Link href="/collections">Back to Collections</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Transform collection prompts to the format PromptCard expects
  const prompts = collection.prompts.map((cp) => ({
    id: cp.prompt.id,
    title: cp.prompt.title,
    slug: cp.prompt.slug,
    promptText: cp.prompt.promptText,
    type: cp.prompt.type as PromptType,
    thumbnailUrl: cp.prompt.thumbnailUrl,
    imageUrl: cp.prompt.imageUrl,
    blurhash: null,
    tags: typeof cp.prompt.tags === "string" ? JSON.parse(cp.prompt.tags || "[]") : cp.prompt.tags,
    author: cp.prompt.author,
    copyCount: cp.prompt.copyCount,
    likeCount: cp.prompt.likeCount,
    viewCount: cp.prompt.viewCount,
    createdAt: cp.prompt.createdAt,
  }));

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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
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
              <Link
                href={`/profile/${collection.owner.username || collection.owner.id}`}
                className="text-primary hover:underline"
              >
                {collection.owner.name || collection.owner.username || "Anonymous"}
              </Link>
              {" · "}
              {collection._count.prompts} {collection._count.prompts === 1 ? "prompt" : "prompts"}
              {(collection._count?.savedBy ?? 0) > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {collection._count.savedBy} {collection._count.savedBy === 1 ? "save" : "saves"}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canSave && (
              <Button
                variant={isSaved ? "default" : "outline"}
                size="sm"
                onClick={handleSave}
                disabled={saveCollectionMutation.isPending || unsaveCollectionMutation.isPending}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={deleteCollectionMutation.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteCollectionMutation.isPending ? "Deleting..." : "Delete Collection"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Prompts grid */}
        {prompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">This collection is empty</p>
            <Button asChild>
              <Link href="/">Browse Prompts</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Edit Collection Modal */}
      {isOwner && (
        <EditCollectionModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          collection={{
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isPublic: collection.isPublic,
          }}
        />
      )}
    </PageLayout>
  );
}
