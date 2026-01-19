"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Collection } from "@/types";

// Extended collection type with prompts data
export interface CollectionWithPrompts extends Collection {
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  prompts: Array<{
    promptId: string;
    addedAt: string;
    prompt: {
      id: string;
      title: string;
      slug: string;
      promptText: string;
      type: string;
      imageUrl: string | null;
      thumbnailUrl: string | null;
      tags: string;
      copyCount: number;
      likeCount: number;
      viewCount: number;
      createdAt: string;
      author: {
        id: string;
        name: string | null;
        username: string | null;
        image: string | null;
      } | null;
    };
  }>;
  _count: {
    prompts: number;
  };
}

// Collection list item with preview prompts
export interface CollectionListItem extends Collection {
  _count: {
    prompts: number;
  };
  prompts: Array<{
    prompt: {
      id: string;
      title: string;
      imageUrl: string | null;
    };
  }>;
}

// Fetch all user's collections
async function fetchCollections(): Promise<CollectionListItem[]> {
  const response = await fetch("/api/collections");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch collections");
  }
  return response.json();
}

// Fetch single collection by ID
async function fetchCollection(id: string): Promise<CollectionWithPrompts> {
  const response = await fetch(`/api/collections/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch collection");
  }
  return response.json();
}

// Create collection
interface CreateCollectionData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

async function createCollection(data: CreateCollectionData): Promise<Collection> {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create collection");
  }
  return response.json();
}

// Update collection
interface UpdateCollectionData {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

async function updateCollection({
  id,
  data,
}: {
  id: string;
  data: UpdateCollectionData;
}): Promise<Collection> {
  const response = await fetch(`/api/collections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update collection");
  }
  return response.json();
}

// Delete collection
async function deleteCollection(id: string): Promise<void> {
  const response = await fetch(`/api/collections/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete collection");
  }
}

// Add prompt to collection
async function addPromptToCollection({
  collectionId,
  promptId,
}: {
  collectionId: string;
  promptId: string;
}): Promise<void> {
  const response = await fetch(`/api/collections/${collectionId}/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add prompt to collection");
  }
}

// Remove prompt from collection
async function removePromptFromCollection({
  collectionId,
  promptId,
}: {
  collectionId: string;
  promptId: string;
}): Promise<void> {
  const response = await fetch(
    `/api/collections/${collectionId}/prompts?promptId=${promptId}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove prompt from collection");
  }
}

// Hook: Get all user's collections
export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
    staleTime: 60 * 1000,
  });
}

// Hook: Get single collection
export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collection", id],
    queryFn: () => fetchCollection(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

// Hook: Create collection
export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

// Hook: Update collection
export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCollection,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection", data.id] });
    },
  });
}

// Hook: Delete collection
export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

// Hook: Add prompt to collection
export function useAddToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPromptToCollection,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({
        queryKey: ["collection", variables.collectionId],
      });
    },
  });
}

// Hook: Remove prompt from collection
export function useRemoveFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removePromptFromCollection,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({
        queryKey: ["collection", variables.collectionId],
      });
    },
  });
}
